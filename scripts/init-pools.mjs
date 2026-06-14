// Initialize the four Rialo-Devnet lending pools on Solana Devnet.
// Run AFTER deploy:  node scripts/init-pools.mjs
import {
  Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY,
  Transaction, TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROGRAM_ID = new PublicKey("5PB3w7dzxaRvc6pYJyhPTzuiwro5F8f4LMLW1dkAK7cU");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";

const POOLS = [
  { name: "SOL",  mint: "So11111111111111111111111111111111111111112", ltv: 8000, thr: 8500 },
  { name: "USDC", mint: "9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV", ltv: 9000, thr: 9500 },
  { name: "USDT", mint: "8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod", ltv: 9000, thr: 9500 },
  { name: "RLO",  mint: "375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6", ltv: 7500, thr: 8000 },
];

function disc(name) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}
function loadKeypair() {
  const p = process.env.ANCHOR_WALLET || join(homedir(), ".config", "solana", "id.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));
}

const conn = new Connection(RPC, "confirmed");
const payer = loadKeypair();
console.log("Payer:", payer.publicKey.toBase58());
console.log("Program:", PROGRAM_ID.toBase58());

for (const cfg of POOLS) {
  const mint = new PublicKey(cfg.mint);
  const [pool] = PublicKey.findProgramAddressSync([Buffer.from("pool"), mint.toBuffer()], PROGRAM_ID);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), mint.toBuffer()], PROGRAM_ID);

  const existing = await conn.getAccountInfo(pool);
  if (existing) { console.log(`[skip] ${cfg.name} pool already initialized: ${pool.toBase58()}`); continue; }

  const data = Buffer.concat([
    disc("initialize_pool"),
    (() => { const b = Buffer.alloc(4); b.writeUInt16LE(cfg.ltv, 0); b.writeUInt16LE(cfg.thr, 2); return b; })(),
  ]);
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: pool,            isSigner: false, isWritable: true  },
      { pubkey: mint,            isSigner: false, isWritable: false },
      { pubkey: vault,           isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY,      isSigner: false, isWritable: false },
    ],
    data,
  });
  try {
    const tx = new Transaction().add(ix);
    const sig = await conn.sendTransaction(tx, [payer]);
    await conn.confirmTransaction(sig, "confirmed");
    console.log(`[ok] ${cfg.name} ltv=${cfg.ltv} thr=${cfg.thr} pool=${pool.toBase58()} vault=${vault.toBase58()} tx=${sig}`);
  } catch (e) {
    console.error(`[fail] ${cfg.name}:`, e.message || e);
  }
}
console.log("Done.");
