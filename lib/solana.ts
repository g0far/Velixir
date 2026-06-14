// ---------------------------------------------------------------------------
// Solana Devnet chain layer for Velixir.
// Replaces the previous EVM / Base Sepolia integration. All on-chain actions
// now run against Solana Devnet through an Alchemy RPC endpoint.
// ---------------------------------------------------------------------------
import { Buffer } from "buffer";
import { Connection, PublicKey } from "@solana/web3.js";

// web3.js relies on a global Buffer; Next.js (webpack 5) does not polyfill it
// in the browser, so we attach it ourselves before any tx is built.
if (typeof window !== "undefined") {
  (window as unknown as { Buffer?: typeof Buffer }).Buffer ??= Buffer;
}

// Provide NEXT_PUBLIC_ALCHEMY_API_KEY in .env.local for a dedicated Alchemy
// endpoint; without it the app falls back to the public Solana devnet RPC.
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

export const SOLANA_DEVNET_CONFIG = {
  cluster: "devnet" as const,
  chainName: "Solana Devnet",
  explorerUrl: "https://explorer.solana.com",
  // Alchemy Solana Devnet RPC when a key is configured; otherwise public devnet.
  rpcUrl: ALCHEMY_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : "https://api.devnet.solana.com",
};

// SPL Memo program (v2) — records a human-readable note inside the transaction.
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

let _connection: Connection | null = null;

/** Shared devnet RPC connection (commitment: confirmed). */
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_DEVNET_CONFIG.rpcUrl, "confirmed");
  }
  return _connection;
}

/** Solana Explorer link for a transaction signature on devnet. */
export function explorerTxUrl(signature: string): string {
  return `${SOLANA_DEVNET_CONFIG.explorerUrl}/tx/${signature}?cluster=devnet`;
}

/** Solana Explorer link for an account address on devnet. */
export function explorerAddrUrl(address: string): string {
  return `${SOLANA_DEVNET_CONFIG.explorerUrl}/address/${address}?cluster=devnet`;
}

/** Truncate a base58 Solana address for display (e.g. 7xKX… y9mP). */
export function shortAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
