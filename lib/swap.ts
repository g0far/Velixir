// ---------------------------------------------------------------------------
// Client side of the treasury-settled swap.
//
// Asks /api/swap to build + treasury-sign the atomic transfer, then has the
// connected wallet (Phantom/Solflare) add the user signature and submits it to
// Devnet. On success the user's real token balances change in their wallet.
// ---------------------------------------------------------------------------
import { Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { getConnection } from "./solana";
import { getProvider, waitForReceipt } from "./wallet";

export interface SwapRequest {
  user: string;
  fromSymbol: string;
  toSymbol: string;
  amountIn: number;
}

export interface SwapResult {
  signature: string;
  amountOut: number;
}

export class TreasuryUnavailableError extends Error {}

/** POST to a settlement route, returning the base64 tx (or throwing). */
async function requestSettlement(path: string, payload: unknown): Promise<{ tx: string; amountOut?: number }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 503) {
    const j = await res.json().catch(() => ({}));
    throw new TreasuryUnavailableError(j?.error || "Treasury not configured.");
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Settlement build failed (${res.status}).`);
  }
  return res.json();
}

/** Have the wallet sign the prebuilt tx, submit it, and wait for confirmation. */
async function signAndSubmit(b64: string): Promise<string> {
  const provider = getProvider();
  if (!provider?.signTransaction) throw new Error("Wallet cannot sign transactions.");
  const tx = Transaction.from(Buffer.from(b64, "base64"));
  const signed = await provider.signTransaction(tx);
  const conn = getConnection();
  const signature = await conn.sendRawTransaction(signed.serialize());
  // Poll over HTTP (getSignatureStatus) instead of confirmTransaction, whose
  // websocket signatureSubscribe is rejected by some RPCs (e.g. Alchemy devnet).
  const { status } = await waitForReceipt(signature);
  if (status === "failed") throw new Error("Transaction failed on-chain.");
  return signature;
}

/**
 * Execute a real on-chain swap settled by the treasury co-signer.
 * Throws TreasuryUnavailableError (HTTP 503) when TREASURY_SECRET_KEY isn't set,
 * so callers can fall back to the simulated path.
 */
export async function executeTreasurySwap(req: SwapRequest): Promise<SwapResult> {
  const { tx: b64, amountOut } = await requestSettlement("/api/swap", req);
  const signature = await signAndSubmit(b64);
  return { signature, amountOut: amountOut ?? 0 };
}

export interface BorrowSettleRequest {
  user: string;
  action: "borrow" | "repay" | "withdraw";
  collateralSymbol?: string;
  collateralAmount?: number;
  borrowSymbol?: string;
  borrowAmount?: number;
}

/**
 * Execute a real on-chain borrow/repay/withdraw settled by the treasury.
 * Throws TreasuryUnavailableError when no treasury is configured.
 */
export async function executeTreasuryBorrow(req: BorrowSettleRequest): Promise<string> {
  const { tx: b64 } = await requestSettlement("/api/borrow", req);
  return signAndSubmit(b64);
}
