#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Create + seed new liquidity pair pools on Solana Devnet (idempotent).
//
// Pools (each seeded with 5000 of EACH side):
//   • USDC / USDT
//   • USDT / RLO
// (USDC/RLO already exists as the Raydium pool — intentionally skipped.)
//
// Each pool's identity is a deterministic keypair derived from a fixed seed, so
// re-running never creates duplicates; it only tops missing liquidity up to
// 5000. USDC/USDT are minted by the treasury (mint authority); RLO is
// transferred from the treasury's holdings. Signed by the treasury (4XzU).
//
//   node scripts/create-pools.mjs            # dry run (shows plan)
//   node scripts/create-pools.mjs --execute  # create + seed
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  Connection, Keypair, PublicKey, Transaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount,
  createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction, createTransferInstruction,
} from '@solana/spl-token';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXECUTE = process.argv.includes('--execute');
const SEED_AMOUNT = 5000;

const MINTS = {
  USDC: { mint: '9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV', decimals: 6, kind: 'mint' },
  USDT: { mint: '8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod', decimals: 6, kind: 'mint' },
  RLO:  { mint: '375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6', decimals: 9, kind: 'transfer' },
};

// New pools to create (USDC/RLO skipped — already a Raydium pool).
const PAIRS = [
  { a: 'USDC', b: 'USDT' },
  { a: 'USDT', b: 'RLO' },
];

function env() {
  const e = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) e[m[1]] = m[2];
  }
  return e;
}

// Deterministic pool owner keypair from a fixed seed (reproducible address).
function poolKeypair(a, b) {
  const seed = crypto.createHash('sha256').update(`velixir-pair:${a}/${b}:v1`).digest().subarray(0, 32);
  return Keypair.fromSeed(seed);
}
function baseUnits(amount, decimals) { return BigInt(Math.round(amount * 10 ** decimals)); }

(async () => {
  const E = env();
  const bs58 = (await import('bs58')).default;
  const treasury = Keypair.fromSecretKey(bs58.decode(E.TREASURY_SECRET_KEY.trim()));
  const rpc = E.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${E.NEXT_PUBLIC_ALCHEMY_API_KEY}` : 'https://api.devnet.solana.com';
  const conn = new Connection(rpc, 'confirmed');
  console.log('Treasury:', treasury.publicKey.toBase58(), '| mode:', EXECUTE ? 'EXECUTE' : 'DRY RUN');

  const config = [];
  const tx = new Transaction();

  for (const { a, b } of PAIRS) {
    const owner = poolKeypair(a, b).publicKey;
    const cfgA = MINTS[a], cfgB = MINTS[b];
    const mintA = new PublicKey(cfgA.mint), mintB = new PublicKey(cfgB.mint);
    const vaultA = getAssociatedTokenAddressSync(mintA, owner, true);
    const vaultB = getAssociatedTokenAddressSync(mintB, owner, true);
    console.log(`\n${a}/${b}  pool=${owner.toBase58()}`);
    console.log(`  vault ${a}=${vaultA.toBase58()}`);
    console.log(`  vault ${b}=${vaultB.toBase58()}`);

    config.push({ name: `${a}/${b}`, poolId: owner.toBase58(), symbolA: a, symbolB: b,
      mintA: cfgA.mint, mintB: cfgB.mint, vaultA: vaultA.toBase58(), vaultB: vaultB.toBase58(), feeBps: 30 });

    for (const [sym, cfg, mint, vault] of [[a, cfgA, mintA, vaultA], [b, cfgB, mintB, vaultB]]) {
      let have = 0;
      try { const acc = await getAccount(conn, vault); have = Number(acc.amount) / 10 ** cfg.decimals; } catch {}
      const need = SEED_AMOUNT - have;
      console.log(`  ${sym}: have ${have}, ${need > 0 ? `fund +${need}` : 'already seeded'}`);
      if (need <= 0) continue;
      tx.add(createAssociatedTokenAccountIdempotentInstruction(treasury.publicKey, vault, owner, mint));
      const amt = baseUnits(need, cfg.decimals);
      if (cfg.kind === 'mint') {
        tx.add(createMintToInstruction(mint, vault, treasury.publicKey, amt, [], TOKEN_PROGRAM_ID));
      } else {
        const treAta = getAssociatedTokenAddressSync(mint, treasury.publicKey);
        tx.add(createTransferInstruction(treAta, vault, treasury.publicKey, amt, [], TOKEN_PROGRAM_ID));
      }
    }
  }

  console.log('\n--- pool config (paste into constants/pools.ts) ---');
  console.log(JSON.stringify(config, null, 2));

  if (!EXECUTE) { console.log('\nDRY RUN. Re-run with --execute to create + seed.'); return; }
  if (tx.instructions.length === 0) { console.log('\nAll pools already seeded. Nothing to do.'); return; }

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash; tx.feePayer = treasury.publicKey; tx.sign(treasury);
  const sig = await conn.sendRawTransaction(tx.serialize());
  const end = Date.now() + 60000; let status = 'timeout';
  while (Date.now() < end) {
    const v = (await conn.getSignatureStatuses([sig], { searchTransactionHistory: true })).value[0];
    if (v) { if (v.err) { status = 'failed:' + JSON.stringify(v.err); break; } if (['confirmed', 'finalized'].includes(v.confirmationStatus)) { status = 'ok'; break; } }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('\nsig', sig, status);
  console.log('explorer:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
})();
