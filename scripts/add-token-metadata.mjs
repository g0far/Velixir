#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Attach Metaplex on-chain metadata (name / symbol / logo uri) to the custom
// devnet USDC & USDT mints so wallets show them as "USDC"/"USDT" instead of
// "Unknown Token". Signed by the mint authority (treasury 4XzU).
//
//   node scripts/add-token-metadata.mjs            # dry run
//   node scripts/add-token-metadata.mjs --execute  # submit
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram,
} from '@solana/web3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXECUTE = process.argv.includes('--execute');

const TMETA = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const TOKENS = [
  { sym: 'USDC', mint: '9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV', name: 'USD Coin',  symbol: 'USDC',
    uri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
  { sym: 'USDT', mint: '8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod', name: 'Tether USD', symbol: 'USDT',
    uri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png' },
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

function borshStr(s) {
  const b = Buffer.from(s, 'utf8');
  const len = Buffer.alloc(4); len.writeUInt32LE(b.length);
  return Buffer.concat([len, b]);
}

// CreateMetadataAccountV3 data: variant(33) + DataV2 + isMutable + collectionDetails(None)
function ixData(name, symbol, uri) {
  return Buffer.concat([
    Buffer.from([33]),
    borshStr(name),
    borshStr(symbol),
    borshStr(uri),
    Buffer.from([0, 0]),       // sellerFeeBasisPoints u16 = 0
    Buffer.from([0]),          // creators: None
    Buffer.from([0]),          // collection: None
    Buffer.from([0]),          // uses: None
    Buffer.from([1]),          // isMutable = true
    Buffer.from([0]),          // collectionDetails: None
  ]);
}

(async () => {
  const E = env();
  const bs58 = (await import('bs58')).default;
  const auth = Keypair.fromSecretKey(bs58.decode(E.TREASURY_SECRET_KEY.trim()));
  const rpc = E.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${E.NEXT_PUBLIC_ALCHEMY_API_KEY}` : 'https://api.devnet.solana.com';
  const conn = new Connection(rpc, 'confirmed');

  console.log('Mint authority / payer:', auth.publicKey.toBase58());
  console.log('Mode:', EXECUTE ? 'EXECUTE' : 'DRY RUN');

  const tx = new Transaction();
  for (const t of TOKENS) {
    const mint = new PublicKey(t.mint);
    const [metadata] = PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), TMETA.toBuffer(), mint.toBuffer()], TMETA);
    const existing = await conn.getAccountInfo(metadata);
    if (existing) { console.log(`  ${t.sym}: metadata already exists at ${metadata.toBase58()} — skip`); continue; }
    tx.add(new TransactionInstruction({
      programId: TMETA,
      keys: [
        { pubkey: metadata, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: auth.publicKey, isSigner: true, isWritable: false },  // mint authority
        { pubkey: auth.publicKey, isSigner: true, isWritable: true },   // payer
        { pubkey: auth.publicKey, isSigner: false, isWritable: false }, // update authority
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: ixData(t.name, t.symbol, t.uri),
    }));
    console.log(`  ${t.sym}: create metadata "${t.name}" (${t.symbol}) @ ${metadata.toBase58()}`);
  }

  if (tx.instructions.length === 0) { console.log('\nNothing to do.'); return; }
  if (!EXECUTE) { console.log('\nDRY RUN. Re-run with --execute to submit.'); return; }

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = auth.publicKey;
  tx.sign(auth);
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
