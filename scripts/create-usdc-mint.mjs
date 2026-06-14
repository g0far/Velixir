// Create a new authority-controlled USDC mint (decimals 6) on devnet and mint
// an initial supply to the authority's ATA. Prints the new mint address.
// Usage: node scripts/create-usdc-mint.mjs [supplyUi]
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint, getOrCreateAssociatedTokenAccount, mintTo,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import os from "os";
import path from "path";

function loadKeypair() {
  const p = process.env.ANCHOR_WALLET || path.join(os.homedir(), ".config", "solana", "id.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));
}

const SUPPLY_UI = Number(process.argv[2] || "1000000"); // default 1,000,000 USDC
const DECIMALS = 6;

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const payer = loadKeypair();
console.log("Authority:", payer.publicKey.toBase58());

// 1) Create mint (mint + freeze authority = payer)
const mint = await createMint(conn, payer, payer.publicKey, payer.publicKey, DECIMALS);
console.log("New USDC mint:", mint.toBase58());

// 2) Authority ATA + mint supply
const ata = await getOrCreateAssociatedTokenAccount(conn, payer, mint, payer.publicKey);
console.log("Authority USDC ATA:", ata.address.toBase58());

const base = BigInt(Math.round(SUPPLY_UI)) * BigInt(10) ** BigInt(DECIMALS);
const sig = await mintTo(conn, payer, mint, ata.address, payer.publicKey, base);
console.log(`Minted ${SUPPLY_UI} USDC -> tx ${sig}`);

const bal = await conn.getTokenAccountBalance(ata.address);
console.log("Authority USDC balance:", bal.value.uiAmountString);
console.log("\nNEW_USDC_MINT=" + mint.toBase58());
