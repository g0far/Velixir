// ---------------------------------------------------------------------------
// Raydium USDC/RLO pool (Solana Devnet) — live price source for RLO.
//
// RLO has no public price feed, but the user created a real Raydium pool, so
// the live price is read directly from the pool's on-chain token vault
// reserves: price(RLO in USDC) = usdcReserve / rloReserve.
// ---------------------------------------------------------------------------
import { SOLANA_DEVNET_CONFIG } from "./solana";

export const RLO_POOL = {
  // New devnet CPMM pool created with the protocol's own USDC mint.
  poolId: "3bLnneKcurGQnXi2U8nUtSByVCu21e75QHGBvRLJVrTR",
  programId: "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb",
  // Pool token vaults (read for reserves).
  usdcVault: "7NkRCLvggVvTXvRpfJuRVJEY1zV1V9J7g3rLamLMdUhW",
  rloVault: "4gYx6tTudiEw7Wvf4CtvGuF3iaZ8uAJVYhcXyGWBTD99",
  // Token mints.
  usdcMint: "9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV",
  rloMint: "375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6",
};

/** Raydium swap UI link for the USDC → RLO pair. */
export function raydiumSwapUrl(): string {
  return `https://raydium.io/swap/?inputMint=${RLO_POOL.usdcMint}&outputMint=${RLO_POOL.rloMint}`;
}

export interface RloPoolState {
  /** USDC per RLO. */
  price: number;
  usdcReserve: number;
  rloReserve: number;
}

/**
 * Read both pool vault balances in one RPC call and derive the live RLO price.
 * Returns null on failure (caller falls back to the last/simulated price).
 */
export async function fetchRloPoolState(): Promise<RloPoolState | null> {
  try {
    const res = await fetch(SOLANA_DEVNET_CONFIG.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getMultipleAccounts",
        params: [[RLO_POOL.usdcVault, RLO_POOL.rloVault], { encoding: "jsonParsed" }],
      }),
    });
    const json = await res.json();
    const accounts = json?.result?.value;
    if (!Array.isArray(accounts) || accounts.length < 2) return null;

    const usdcReserve = accounts[0]?.data?.parsed?.info?.tokenAmount?.uiAmount;
    const rloReserve = accounts[1]?.data?.parsed?.info?.tokenAmount?.uiAmount;
    if (typeof usdcReserve !== "number" || typeof rloReserve !== "number" || rloReserve <= 0) {
      return null;
    }
    return { price: usdcReserve / rloReserve, usdcReserve, rloReserve };
  } catch {
    return null;
  }
}
