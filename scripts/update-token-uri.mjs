#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Point the USDC/USDT metadata `uri` at a proper JSON file (name/symbol/image)
// so Phantom recognizes them (not "Unknown Token") and shows the logo.
// UpdateMetadataAccountV2, signed by the update authority (treasury 4XzU).
//
//   node scripts/update-token-uri.mjs --execute
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXECUTE = process.argv.includes('--execute');
const TMETA = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const TOKENS = [
  { sym: 'USDC', mint: '9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV', name: 'USD Coin',  symbol: 'USDC',
    uri: 'https://cdn.jsdelivr.net/gh/g0far/velixir-token-assets@main/usdc.json' },
  { sym: 'USDT', mint: '8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod', name: 'Tether USD', symbol: 'USDT',
    uri: 'https://cdn.jsdelivr.net/gh/g0far/velixir-token-assets@main/usdt.json' },
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
function bstr(s) { const b = Buffer.from(s, 'utf8'); const l = Buffer.alloc(4); l.writeUInt32LE(b.length); return Buffer.concat([l, b]); }

// UpdateMetadataAccountV2: variant 15 + Option<DataV2>(Some) + Option<updateAuth>(None) + Option<primarySale>(None) + Option<isMutable>(None)
function ixData(name, symbol, uri) {
  return Buffer.concat([
    Buffer.from([15]),
    Buffer.from([1]),               // data: Some
    bstr(name), bstr(symbol), bstr(uri),
    Buffer.from([0, 0]),            // sellerFeeBasisPoints
    Buffer.from([0]),               // creators None
    Buffer.from([0]),               // collection None
    Buffer.from([0]),               // uses None
    Buffer.from([0]),               // updateAuthority None
    Buffer.from([0]),               // primarySaleHappened None
    Buffer.from([0]),               // isMutable None (unchanged)
  ]);
}

(async () => {
  const E = env();
  const bs58 = (await import('bs58')).default;
  const auth = Keypair.fromSecretKey(bs58.decode(E.TREASURY_SECRET_KEY.trim()));
  const rpc = E.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${E.NEXT_PUBLIC_ALCHEMY_API_KEY}` : 'https://api.devnet.solana.com';
  const conn = new Connection(rpc, 'confirmed');
  console.log('Update authority:', auth.publicKey.toBase58(), '| mode:', EXECUTE ? 'EXECUTE' : 'DRY RUN');

  const tx = new Transaction();
  for (const t of TOKENS) {
    const mint = new PublicKey(t.mint);
    const [md] = PublicKey.findProgramAddressSync([Buffer.from('metadata'), TMETA.toBuffer(), mint.toBuffer()], TMETA);
    tx.add(new TransactionInstruction({
      programId: TMETA,
      keys: [
        { pubkey: md, isSigner: false, isWritable: true },
        { pubkey: auth.publicKey, isSigner: true, isWritable: false },
      ],
      data: ixData(t.name, t.symbol, t.uri),
    }));
    console.log(`  ${t.sym}: uri -> ${t.uri}`);
  }
  if (!EXECUTE) { console.log('\nDRY RUN. Re-run with --execute.'); return; }

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash; tx.feePayer = auth.publicKey; tx.sign(auth);
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
