#!/usr/bin/env node
// ---------------------------------------------------------------------------
// One-time authority + treasury handover (DEVNET).
//
// Moves everything the current deployer (Hfdma…KV8sv) controls to a new wallet:
//   • USDC + USDT mint authority and freeze authority  -> NEW_TREASURY
//   • all SPL token balances (USDC/USDT/RLO/…)          -> NEW_TREASURY
//   • most SOL (leaves a small fee buffer)              -> NEW_TREASURY
//
// RLO mint authority is already null (fixed supply) — nothing to move there.
// Program (5PB3…) upgrade authority is a loader op — see the printed CLI command.
//
// Usage:
//   node scripts/handover.mjs            # DRY RUN (shows the plan, sends nothing)
//   node scripts/handover.mjs --execute  # actually submit the transactions
//
// Reads from .env.local (gitignored):
//   OLD_AUTHORITY_SECRET_KEY = <Hfdm devnet secret key>   (JSON array or base58)
//   NEW_TREASURY             = 4XzUqig5RTKj4VmmZ49WVVWKvDeJsxG8XSGrQ6zMP1jG
//   NEXT_PUBLIC_ALCHEMY_API_KEY = <optional, for a faster RPC>
// After it succeeds, delete OLD_AUTHORITY_SECRET_KEY and set
//   TREASURY_SECRET_KEY = <4XzU secret key>
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Connection, Keypair, PublicKey, Transaction, SystemProgram,
  sendAndConfirmTransaction, LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID, AuthorityType,
  createSetAuthorityInstruction, createTransferInstruction,
  getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction,
  getMint,
} from '@solana/spl-token';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXECUTE = process.argv.includes('--execute');

const NEW_TREASURY_DEFAULT = '4XzUqig5RTKj4VmmZ49WVVWKvDeJsxG8XSGrQ6zMP1jG';
const MINTS = {
  USDC: '9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV',
  USDT: '8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod',
  RLO:  '375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6',
};
const PROGRAM_ID = '5PB3w7dzxaRvc6pYJyhPTzuiwro5F8f4LMLW1dkAK7cU';

function loadEnv() {
  const env = {};
  try {
    const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

async function parseKey(raw, label) {
  if (!raw) return null;
  raw = raw.trim();
  try {
    if (raw.startsWith('[')) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    const bs58 = (await import('bs58')).default;
    return Keypair.fromSecretKey(bs58.decode(raw));
  } catch (e) {
    console.error(`✗ Could not parse ${label}:`, e.message);
    return null;
  }
}

// Default deployer keypair location (Solana CLI). Used when OLD_AUTHORITY_SECRET_KEY
// isn't set in .env.local, so we don't have to duplicate the secret onto disk.
const DEFAULT_ID_JSON = path.join(process.env.USERPROFILE || process.env.HOME || '', '.config', 'solana', 'id.json');

(async () => {
  const env = loadEnv();
  let old = await parseKey(env.OLD_AUTHORITY_SECRET_KEY, 'OLD_AUTHORITY_SECRET_KEY');
  let oldSource = '.env.local OLD_AUTHORITY_SECRET_KEY';
  if (!old) {
    try {
      const arr = JSON.parse(fs.readFileSync(DEFAULT_ID_JSON, 'utf8'));
      old = Keypair.fromSecretKey(Uint8Array.from(arr));
      oldSource = DEFAULT_ID_JSON;
    } catch {}
  }
  if (!old) {
    console.error('\nNo old authority key found. Set OLD_AUTHORITY_SECRET_KEY in .env.local or ensure', DEFAULT_ID_JSON, 'exists.');
    process.exit(1);
  }
  console.log('Old key src:', oldSource);
  let newOwner;
  try { newOwner = new PublicKey((env.NEW_TREASURY || NEW_TREASURY_DEFAULT).trim()); }
  catch { console.error('✗ NEW_TREASURY is not a valid address.'); process.exit(1); }

  const rpc = env.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    : 'https://api.devnet.solana.com';
  const conn = new Connection(rpc, 'confirmed');

  console.log(`\nMode      : ${EXECUTE ? 'EXECUTE (will submit)' : 'DRY RUN (no transactions)'}`);
  console.log('From      :', old.publicKey.toBase58());
  console.log('To        :', newOwner.toBase58());

  const tx = new Transaction();

  // 1) Mint + freeze authority for USDC / USDT (RLO mint authority is null).
  for (const sym of ['USDC', 'USDT']) {
    const mint = new PublicKey(MINTS[sym]);
    let info;
    try { info = await getMint(conn, mint); } catch { console.log(`  ${sym}: mint not readable, skipping`); continue; }
    const isAuth = info.mintAuthority && info.mintAuthority.equals(old.publicKey);
    if (isAuth) {
      tx.add(createSetAuthorityInstruction(mint, old.publicKey, AuthorityType.MintTokens, newOwner, [], TOKEN_PROGRAM_ID));
      console.log(`  ${sym}: mint authority -> NEW`);
    } else {
      console.log(`  ${sym}: mint authority is ${info.mintAuthority?.toBase58() ?? 'null'} (not ours) — skip`);
    }
    if (info.freezeAuthority && info.freezeAuthority.equals(old.publicKey)) {
      tx.add(createSetAuthorityInstruction(mint, old.publicKey, AuthorityType.FreezeAccount, newOwner, [], TOKEN_PROGRAM_ID));
      console.log(`  ${sym}: freeze authority -> NEW`);
    }
  }

  // 2) Sweep SPL token balances old -> new.
  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(old.publicKey, { programId: TOKEN_PROGRAM_ID });
  for (const { account } of tokenAccounts.value) {
    const info = account.data.parsed?.info;
    const mintStr = info?.mint;
    const rawAmount = info?.tokenAmount?.amount;
    const ui = info?.tokenAmount?.uiAmount;
    const dec = info?.tokenAmount?.decimals;
    if (!mintStr || !rawAmount || rawAmount === '0') continue;
    const mint = new PublicKey(mintStr);
    const fromAta = getAssociatedTokenAddressSync(mint, old.publicKey);
    const toAta = getAssociatedTokenAddressSync(mint, newOwner);
    tx.add(createAssociatedTokenAccountIdempotentInstruction(old.publicKey, toAta, newOwner, mint));
    tx.add(createTransferInstruction(fromAta, toAta, old.publicKey, BigInt(rawAmount), [], TOKEN_PROGRAM_ID));
    const label = Object.entries(MINTS).find(([, m]) => m === mintStr)?.[0] ?? mintStr.slice(0, 6) + '…';
    console.log(`  sweep ${ui} ${label} (dec ${dec}) -> NEW`);
  }

  // 3) Sweep most SOL (leave a buffer for fees on the old wallet).
  const lamports = await conn.getBalance(old.publicKey);
  const buffer = 0.03 * LAMPORTS_PER_SOL;
  if (lamports > buffer + 5000) {
    const send = Math.floor(lamports - buffer);
    tx.add(SystemProgram.transfer({ fromPubkey: old.publicKey, toPubkey: newOwner, lamports: send }));
    console.log(`  sweep ${(send / LAMPORTS_PER_SOL).toFixed(4)} SOL -> NEW (leaving ${(buffer / LAMPORTS_PER_SOL).toFixed(3)} buffer)`);
  }

  console.log(`\nInstructions queued: ${tx.instructions.length}`);
  console.log('\nProgram upgrade authority (run separately with the Solana CLI):');
  console.log(`  solana program set-upgrade-authority ${PROGRAM_ID} \\\n    --new-upgrade-authority ${newOwner.toBase58()} --url devnet -k <old-authority-keypair.json>`);

  if (!EXECUTE) {
    console.log('\nDRY RUN complete. Re-run with --execute to submit.\n');
    return;
  }
  if (tx.instructions.length === 0) { console.log('\nNothing to do.\n'); return; }

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = old.publicKey;
  const sig = await sendAndConfirmTransaction(conn, tx, [old]);
  console.log('\n✓ Handover submitted:', sig);
  console.log('  https://explorer.solana.com/tx/' + sig + '?cluster=devnet');
  console.log('\nNext: delete OLD_AUTHORITY_SECRET_KEY from .env.local and set TREASURY_SECRET_KEY = the 4XzU secret key.\n');
})();
