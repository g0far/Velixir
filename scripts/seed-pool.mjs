// Seed a Rialo-Devnet pool by depositing tokens from the authority wallet.
// Usage: node scripts/seed-pool.mjs <SYMBOL> <UI_AMOUNT>
//   e.g. node scripts/seed-pool.mjs USDT 5000
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import os from "os";
import path from "path";

const PROGRAM_ID = new PublicKey("5PB3w7dzxaRvc6pYJyhPTzuiwro5F8f4LMLW1dkAK7cU");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const MINTS = {
  SOL:  { mint: "So11111111111111111111111111111111111111112", decimals: 9 },
  USDC: { mint: "9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV", decimals: 6 },
  USDT: { mint: "8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod", decimals: 6 },
  RLO:  { mint: "375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6", decimals: 9 },
};

const [, , SYMBOL, AMOUNT_STR] = process.argv;
if (!SYMBOL || !AMOUNT_STR || !MINTS[SYMBOL]) {
  console.error("Usage: node scripts/seed-pool.mjs <SOL|USDC|USDT|RLO> <amount>");
  process.exit(1);
}
const { mint: mintStr, decimals } = MINTS[SYMBOL];
const mint = new PublicKey(mintStr);

function disc(name) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}
function amountLe(amount, dec) {
  const [w, f = ""] = String(amount).split(".");
  const frac = (f + "0".repeat(dec)).slice(0, dec);
  const digits = (w || "0") + frac;
  const base = BigInt(digits.replace(/^0+(?=\d)/, ""));
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(base);
  return b;
}
function loadKeypair() {
  const p = process.env.ANCHOR_WALLET || path.join(os.homedir(), ".config", "solana", "id.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));
}
function ata(owner, m) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), m.toBuffer()], ATA_PROGRAM
  )[0];
}

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const payer = loadKeypair();
const authority = payer.publicKey;

const [pool] = PublicKey.findProgramAddressSync([Buffer.from("pool"), mint.toBuffer()], PROGRAM_ID);
const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), mint.toBuffer()], PROGRAM_ID);
const [position] = PublicKey.findProgramAddressSync(
  [Buffer.from("position"), pool.toBuffer(), authority.toBuffer()], PROGRAM_ID
);
const userToken = ata(authority, mint);

console.log(`Seeding ${SYMBOL} pool with ${AMOUNT_STR} ${SYMBOL}`);
console.log("  authority :", authority.toBase58());
console.log("  pool      :", pool.toBase58());
console.log("  vault     :", vault.toBase58());
console.log("  userToken :", userToken.toBase58());

const utInfo = await conn.getParsedAccountInfo(userToken);
if (!utInfo.value) {
  console.error(`  ✗ Authority has no ATA for ${SYMBOL} (${userToken.toBase58()}). Fund it first.`);
  process.exit(1);
}
const bal = utInfo.value.data.parsed.info.tokenAmount.uiAmountString;
console.log("  balance   :", bal, SYMBOL);
if (Number(bal) < Number(AMOUNT_STR)) {
  console.error(`  ✗ Insufficient balance (${bal} < ${AMOUNT_STR}).`);
  process.exit(1);
}

const data = Buffer.concat([disc("deposit"), amountLe(AMOUNT_STR, decimals)]);
const keys = [
  { pubkey: authority, isSigner: true, isWritable: true },
  { pubkey: pool, isSigner: false, isWritable: true },
  { pubkey: vault, isSigner: false, isWritable: true },
  { pubkey: position, isSigner: false, isWritable: true },
  { pubkey: userToken, isSigner: false, isWritable: true },
  { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
];
const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
const tx = new Transaction().add(ix);
const sig = await conn.sendTransaction(tx, [payer], { skipPreflight: false });
await conn.confirmTransaction(sig, "confirmed");
console.log("  ✓ deposit tx:", sig);

const vinfo = await conn.getParsedAccountInfo(vault);
console.log("  vault balance now:", vinfo.value.data.parsed.info.tokenAmount.uiAmountString, SYMBOL);
