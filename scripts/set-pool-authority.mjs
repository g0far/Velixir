#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Set each lending pool's `authority` field to the new owner (cosmetic).
// Calls the program's set_authority instruction for the SOL/USDC/RLO pools,
// signed by the CURRENT pool authority (the Solana CLI id.json / Hfdm).
//
//   node scripts/set-pool-authority.mjs            # dry run
//   node scripts/set-pool-authority.mjs --execute  # submit
//
// Requires the program to be (re)deployed with the set_authority instruction.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
} from '@solana/web3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXECUTE = process.argv.includes('--execute');

const PROGRAM_ID = new PublicKey('5PB3w7dzxaRvc6pYJyhPTzuiwro5F8f4LMLW1dkAK7cU');
const NEW_AUTHORITY = new PublicKey('4XzUqig5RTKj4VmmZ49WVVWKvDeJsxG8XSGrQ6zMP1jG');
const MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: '9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV',
  RLO: '375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6',
};

function env() {
  const e = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) e[m[1]] = m[2];
    }
  } catch {}
  return e;
}

// Anchor instruction discriminator = sha256("global:<name>")[..8].
function disc(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

(async () => {
  const E = env();
  // Current pool authority = Solana CLI default keypair (Hfdm).
  const idPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.config', 'solana', 'id.json');
  const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(idPath, 'utf8'))));
  const rpc = E.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${E.NEXT_PUBLIC_ALCHEMY_API_KEY}` : 'https://api.devnet.solana.com';
  const conn = new Connection(rpc, 'confirmed');

  console.log('Authority (signer):', authority.publicKey.toBase58());
  console.log('New pool authority :', NEW_AUTHORITY.toBase58());
  console.log('Mode               :', EXECUTE ? 'EXECUTE' : 'DRY RUN');

  const data = Buffer.concat([disc('set_authority'), NEW_AUTHORITY.toBuffer()]);
  const tx = new Transaction();
  for (const [sym, mintStr] of Object.entries(MINTS)) {
    const mint = new PublicKey(mintStr);
    const pool = PublicKey.findProgramAddressSync([Buffer.from('pool'), mint.toBuffer()], PROGRAM_ID)[0];
    tx.add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: pool, isSigner: false, isWritable: true },
      ],
      data,
    }));
    console.log(`  ${sym} pool ${pool.toBase58()} -> set_authority(NEW)`);
  }

  if (!EXECUTE) { console.log('\nDRY RUN. Re-run with --execute to submit.\n'); return; }

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = authority.publicKey;
  const sig = await conn.sendRawTransaction((() => { tx.sign(authority); return tx; })().serialize());
  // Poll over HTTP.
  const end = Date.now() + 60000;
  let status = 'timeout';
  while (Date.now() < end) {
    const v = (await conn.getSignatureStatuses([sig], { searchTransactionHistory: true })).value[0];
    if (v) { if (v.err) { status = 'failed:' + JSON.stringify(v.err); break; } if (['confirmed', 'finalized'].includes(v.confirmationStatus)) { status = 'ok'; break; } }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('\nsig', sig, status);
  console.log('explorer:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
})();
