// ---------------------------------------------------------------------------
// Real wallet balances (Solana Devnet) — SOL + SPL tokens.
//
// Reads the connected wallet's actual on-chain balances so the swap/borrow UI
// reflects what Phantom/Solflare show, and updates live after a real transfer.
// ---------------------------------------------------------------------------
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection } from "./solana";
import { RIALO_POOLS, TOKEN_PROGRAM_ID, type RialoSymbol } from "./rialoProgram";

export type BalanceMap = Record<string, number>;

// Mint (base58) → symbol, for every SPL token the dApp trades/borrows.
const MINT_TO_SYMBOL: Record<string, RialoSymbol> = Object.fromEntries(
  (Object.keys(RIALO_POOLS) as RialoSymbol[])
    .filter((s) => !RIALO_POOLS[s].isNative)
    .map((s) => [RIALO_POOLS[s].mint.toBase58(), s])
) as Record<string, RialoSymbol>;

/**
 * Fetch the wallet's real balances for SOL and every SPL token we care about.
 * Tokens with no associated account yet resolve to 0. Never throws — returns
 * whatever could be read (empty map on total failure) so the UI stays alive.
 */
export async function getWalletBalances(owner: string): Promise<BalanceMap> {
  const out: BalanceMap = { SOL: 0, USDC: 0, USDT: 0, RLO: 0, LP: 0 };
  if (!owner) return out;
  const conn = getConnection();
  let ownerPk: PublicKey;
  try {
    ownerPk = new PublicKey(owner);
  } catch {
    return out;
  }

  const [solResult, tokenResult] = await Promise.allSettled([
    conn.getBalance(ownerPk),
    conn.getParsedTokenAccountsByOwner(ownerPk, { programId: TOKEN_PROGRAM_ID }),
  ]);

  if (solResult.status === "fulfilled") {
    out.SOL = solResult.value / LAMPORTS_PER_SOL;
  }

  if (tokenResult.status === "fulfilled") {
    for (const { account } of tokenResult.value.value) {
      const info = account.data.parsed?.info;
      const mint: string | undefined = info?.mint;
      const uiAmount: number | undefined = info?.tokenAmount?.uiAmount ?? undefined;
      if (!mint || typeof uiAmount !== "number") continue;
      const symbol = MINT_TO_SYMBOL[mint];
      if (symbol) {
        out[symbol] = (out[symbol] ?? 0) + uiAmount;
      } else if (mint === "3heZJycqKVSNv5PKGxymJ32wkSUFxC4UugCbsYd19Qeh") {
        out["LP"] = (out["LP"] ?? 0) + uiAmount;
      }
    }
  }

  return out;
}

/** Read a single token (or SOL) balance for an owner. */
export async function getTokenBalance(owner: string, symbol: string): Promise<number> {
  const all = await getWalletBalances(owner);
  return all[symbol.toUpperCase()] ?? 0;
}
