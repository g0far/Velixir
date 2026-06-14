// ---------------------------------------------------------------------------
// Live pool data for the Liquidity page (Solana Devnet).
//
// Reads, on-chain:
//   • the Rialo lending pools (SOL / USDC / RLO …) — vault TVL, configured LTV
//     and liquidation threshold, total deposits/borrows, and the pool authority
//     (parsed straight from the program account).
//   • the Raydium USDC/RLO CPMM pool — vault reserves and derived RLO price.
// ---------------------------------------------------------------------------
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./solana";
import { RIALO_POOLS, poolPda, vaultPda, type RialoSymbol } from "./rialoProgram";
import { RLO_POOL, fetchRloPoolState, type RloPoolState } from "./raydium";
import { PAIR_POOLS, type PairPoolCfg } from "@/constants/pools";

export interface LendingPoolInfo {
  symbol: RialoSymbol;
  mint: string;
  poolAddress: string;
  vaultAddress: string;
  authority: string | null;
  ltvBps: number;
  thresholdBps: number;
  isNative: boolean;
  decimals: number;
  vaultBalance: number; // uiAmount in the pool token
  totalDeposits: number; // uiAmount
  totalBorrows: number; // uiAmount
}

export interface AmmPoolInfo extends RloPoolState {
  poolId: string;
  programId: string;
  usdcMint: string;
  rloMint: string;
}

function div(amount: bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}

/** Read + parse one Rialo lending pool. Returns null if it isn't initialized. */
async function fetchLendingPool(symbol: RialoSymbol): Promise<LendingPoolInfo | null> {
  const cfg = RIALO_POOLS[symbol];
  const conn = getConnection();
  const pool = poolPda(cfg.mint);
  const vault = vaultPda(cfg.mint);

  const acct = await conn.getAccountInfo(pool, "confirmed");
  if (!acct) return null;

  // Pool layout: 8 disc | authority(32) | mint(32) | vault(32) | is_native(1)
  //   | ltv_bps(u16) | liq_threshold_bps(u16) | total_deposits(u64) | total_borrows(u64) | ...
  const d = acct.data;
  const authority = new PublicKey(d.subarray(8, 40)).toBase58();
  const isNative = d[104] === 1;
  const ltvBps = d.readUInt16LE(105);
  const thresholdBps = d.readUInt16LE(107);
  const totalDeposits = d.readBigUInt64LE(109);
  const totalBorrows = d.readBigUInt64LE(117);

  let vaultBalance = 0;
  try {
    const bal = await conn.getTokenAccountBalance(vault, "confirmed");
    vaultBalance = bal.value.uiAmount ?? 0;
  } catch {
    vaultBalance = 0;
  }

  return {
    symbol,
    mint: cfg.mint.toBase58(),
    poolAddress: pool.toBase58(),
    vaultAddress: vault.toBase58(),
    authority,
    ltvBps,
    thresholdBps,
    isNative,
    decimals: cfg.decimals,
    vaultBalance,
    totalDeposits: div(totalDeposits, cfg.decimals),
    totalBorrows: div(totalBorrows, cfg.decimals),
  };
}

/** Fetch every initialized Rialo lending pool. */
export async function fetchLendingPools(): Promise<LendingPoolInfo[]> {
  const symbols = Object.keys(RIALO_POOLS) as RialoSymbol[];
  const results = await Promise.all(symbols.map((s) => fetchLendingPool(s).catch(() => null)));
  return results.filter((p): p is LendingPoolInfo => p !== null);
}

export interface PairPoolInfo extends PairPoolCfg {
  reserveA: number;
  reserveB: number;
}

/** Read both vault balances for one seeded pair pool. */
async function fetchPairPool(cfg: PairPoolCfg): Promise<PairPoolInfo> {
  const conn = getConnection();
  const read = async (vault: string): Promise<number> => {
    try {
      const bal = await conn.getTokenAccountBalance(new PublicKey(vault), "confirmed");
      return bal.value.uiAmount ?? 0;
    } catch {
      return 0;
    }
  };
  const [reserveA, reserveB] = await Promise.all([read(cfg.vaultA), read(cfg.vaultB)]);
  return { ...cfg, reserveA, reserveB };
}

/** Fetch all seeded pair pools (USDC/USDT, USDT/RLO, …). */
export async function fetchPairPools(): Promise<PairPoolInfo[]> {
  return Promise.all(PAIR_POOLS.map((p) => fetchPairPool(p)));
}

/** Fetch the Raydium USDC/RLO AMM pool (reserves + price). */
export async function fetchAmmPool(): Promise<AmmPoolInfo | null> {
  const state = await fetchRloPoolState();
  if (!state) return null;
  return {
    ...state,
    poolId: RLO_POOL.poolId,
    programId: RLO_POOL.programId,
    usdcMint: RLO_POOL.usdcMint,
    rloMint: RLO_POOL.rloMint,
  };
}
