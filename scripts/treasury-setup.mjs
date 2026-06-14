#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Treasury setup / verification for the real swap + borrow settlement.
//
//   node scripts/treasury-setup.mjs            # report status
//   node scripts/treasury-setup.mjs --ensure   # also create missing treasury ATAs
//
// Reads TREASURY_SECRET_KEY (+ NEXT_PUBLIC_ALCHEMY_API_KEY) from .env.local.
// Confirms the treasury can mint USDC (mint authority) and holds RLO/USDT/SOL
// inventory used to settle swaps & loans. Run this once after pasting your
// devnet treasury key.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Connection, Keypair, PublicKey, LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync, getAccount, getMint,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const env = {};
  try {
    const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

async function parseKey(raw) {
  if (!raw) return null;
  raw = raw.trim();
  try {
    if (raw.startsWith('[')) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    // base58
    const bs58 = (await import('bs58')).default;
    return Keypair.fromSecretKey(bs58.decode(raw));
  } catch (e) {
    console.error('Could not parse TREASURY_SECRET_KEY:', e.message);
    return null;
  }
}

const TOKENS = {
  USDC: { mint: '9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV', decimals: 6 },
  USDT: { mint: '8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod', decimals: 6 },
  RLO:  { mint: '375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6', decimals: 9 },
};

(async () => {
  const env = loadEnv();
  const kp = await parseKey(env.TREASURY_SECRET_KEY);
  if (!kp) {
    console.error('\n✗ TREASURY_SECRET_KEY not set or invalid in .env.local.\n  Paste your devnet treasury secret key (JSON array or base58) and re-run.');
    process.exit(1);
  }
  const rpc = env.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    : 'https://api.devnet.solana.com';
  const conn = new Connection(rpc, 'confirmed');
  const treasury = kp.publicKey;
  console.log('\nTreasury:', treasury.toBase58());

  const sol = await conn.getBalance(treasury);
  console.log('SOL     :', (sol / LAMPORTS_PER_SOL).toFixed(4), sol < 0.05 * LAMPORTS_PER_SOL ? '⚠ low — fund for fees/SOL payouts' : '✓');

  const ensure = process.argv.includes('--ensure');
  const toCreate = [];

  for (const [sym, t] of Object.entries(TOKENS)) {
    const mint = new PublicKey(t.mint);
    let authority = '—', bal = '0';
    try {
      const mi = await getMint(conn, mint);
      authority = mi.mintAuthority ? mi.mintAuthority.toBase58() : 'null (fixed supply)';
    } catch {}
    const ata = getAssociatedTokenAddressSync(mint, treasury);
    let hasAta = false;
    try {
      const acc = await getAccount(conn, ata);
      hasAta = true;
      bal = (Number(acc.amount) / 10 ** t.decimals).toString();
    } catch { hasAta = false; }
    const isAuth = authority === treasury.toBase58();
    console.log(`${sym.padEnd(5)} : bal=${bal}  ata=${hasAta ? 'yes' : 'MISSING'}  mintAuthority=${isAuth ? 'TREASURY ✓ (mint on demand)' : authority}`);
    if (!hasAta) toCreate.push({ sym, mint, ata });
  }

  if (toCreate.length && ensure) {
    console.log('\nCreating missing treasury ATAs…');
    const tx = new Transaction();
    for (const c of toCreate) tx.add(createAssociatedTokenAccountInstruction(treasury, c.ata, treasury, c.mint));
    const sig = await sendAndConfirmTransaction(conn, tx, [kp]);
    console.log('✓ ATAs created:', sig);
  } else if (toCreate.length) {
    console.log(`\n${toCreate.length} treasury ATA(s) missing. Re-run with --ensure to create them.`);
  }

  console.log('\nNotes:');
  console.log('• USDC payouts are MINTED on demand when the treasury is its mint authority — no USDC inventory needed.');
  console.log('• RLO/USDT payouts TRANSFER from the treasury balance — keep some inventory there.');
  console.log('• SOL payouts transfer native SOL from the treasury — keep a small SOL buffer.\n');
})();
