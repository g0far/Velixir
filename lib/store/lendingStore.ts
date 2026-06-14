import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---- Velixir Lending Engine ----
// Supply APY follows a utilization-based "kinked" interest-rate curve (Aave/Compound
// style) plus a reputation-driven trust premium unique to Velixir:
//
//   U          = totalBorrowed / totalSupplied                 (utilization)
//   borrowAPR  = base + (U/Uopt)·slope1                        when U ≤ Uopt
//              = base + slope1 + ((U-Uopt)/(1-Uopt))·slope2     when U > Uopt  (steep jump)
//   supplyAPY  = borrowAPR · U · (1 - reserveFactor) + trustPremium
//
// Lenders only earn on the borrowed fraction (·U), minus a protocol reserve cut.
// `trustPremium` redistributes a slice of reputation-based origination fees to
// suppliers — RIALO carries a large premium as native-token liquidity mining.

export interface LendingPool {
  symbol: string;          // canonical price/logo key (USDC, USDT, SOL, BTC, RLO)
  label: string;           // display label (RLO shows as "RIALO")
  risk: 'Low' | 'Medium';
  base: number;            // base borrow APR at U=0
  slope1: number;          // slope below the optimal-utilization kink
  slope2: number;          // steep slope above the kink
  optimalU: number;        // kink point (optimal utilization)
  reserve: number;         // protocol reserve factor
  trustPremium: number;    // reputation premium added to supply APY
  seedSuppliedUSD: number; // seed liquidity already supplied (USD)
  seedBorrowedUSD: number; // seed liquidity already borrowed (USD)
}

export const LENDING_POOLS: LendingPool[] = [
  { symbol: 'RLO',  label: 'RIALO', risk: 'Medium', base: 0.020, slope1: 0.18, slope2: 2.50, optimalU: 0.75, reserve: 0.10, trustPremium: 0.080, seedSuppliedUSD: 420_000,   seedBorrowedUSD: 184_800 },
  { symbol: 'USDC', label: 'USDC',  risk: 'Low',    base: 0.005, slope1: 0.14, slope2: 0.90, optimalU: 0.90, reserve: 0.10, trustPremium: 0.025, seedSuppliedUSD: 2_400_000, seedBorrowedUSD: 1_872_000 },
  { symbol: 'USDT', label: 'USDT',  risk: 'Low',    base: 0.005, slope1: 0.14, slope2: 0.90, optimalU: 0.90, reserve: 0.10, trustPremium: 0.025, seedSuppliedUSD: 1_800_000, seedBorrowedUSD: 1_278_000 },
  { symbol: 'SOL',  label: 'SOL',   risk: 'Medium', base: 0.010, slope1: 0.10, slope2: 1.20, optimalU: 0.80, reserve: 0.15, trustPremium: 0.020, seedSuppliedUSD: 1_100_000, seedBorrowedUSD: 682_000 },
  { symbol: 'BTC',  label: 'BTC',   risk: 'Low',    base: 0.010, slope1: 0.10, slope2: 1.20, optimalU: 0.80, reserve: 0.15, trustPremium: 0.020, seedSuppliedUSD: 890_000,   seedBorrowedUSD: 453_900 },
];

export const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

const clampU = (U: number) => Math.max(0, Math.min(1, U));

// Borrow APR from the kinked utilization curve (returns a decimal, e.g. 0.126).
export function computeBorrowAPR(pool: LendingPool, U: number): number {
  const u = clampU(U);
  if (u <= pool.optimalU) {
    return pool.base + (u / pool.optimalU) * pool.slope1;
  }
  return pool.base + pool.slope1 + ((u - pool.optimalU) / (1 - pool.optimalU)) * pool.slope2;
}

// Supply APY a lender receives (decimal). Includes the reputation trust premium.
export function computeSupplyAPY(pool: LendingPool, U: number): number {
  const u = clampU(U);
  return computeBorrowAPR(pool, u) * u * (1 - pool.reserve) + pool.trustPremium;
}

// Live pool utilization given the extra USD users have supplied on top of the seed.
export function computeUtilization(pool: LendingPool, userSuppliedUSD: number): number {
  const supplied = pool.seedSuppliedUSD + Math.max(0, userSuppliedUSD);
  if (supplied <= 0) return 0;
  return clampU(pool.seedBorrowedUSD / supplied);
}

// One supply deposit (tranche). Each call to supply() records a new tranche so
// yield accrues from its own timestamp — no retroactive interest on top-ups.
export interface SupplyPosition {
  id: string;
  symbol: string;   // canonical pool symbol
  amount: number;   // token units supplied
  suppliedAt: number;
}

export interface LendingTransaction {
  id: string;
  action: 'SUPPLY' | 'WITHDRAW';
  symbol: string;
  amount: number;
  timestamp: number;
  signature?: string;
  onchain?: boolean;
  /** Wallet (base58) that created this entry — history is scoped per wallet. */
  address?: string;
}

interface LendingState {
  positions: Record<string, SupplyPosition[]>; // lowercased address -> deposits
  lendingHistory: LendingTransaction[];
  supply: (address: string, symbol: string, amount: number) => void;
  withdraw: (address: string, symbol: string) => void;
  getPositions: (address: string) => SupplyPosition[];
  /** Clear only the given wallet's entries; omit address to clear everything. */
  clearLendingHistory: (address?: string) => void;
}

export const useLendingStore = create<LendingState>()(
  persist(
    (set, get) => ({
      positions: {},
      lendingHistory: [],
      supply: (address, symbol, amount) => {
        if (!address || !(amount > 0)) return;
        const key = address.toLowerCase();
        const list = get().positions[key] ? [...get().positions[key]] : [];
        list.push({
          id: `${symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          symbol,
          amount,
          suppliedAt: Date.now(),
        });

        const tx: LendingTransaction = {
          id: `ltx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          action: 'SUPPLY',
          symbol,
          amount,
          timestamp: Date.now(),
          onchain: false,
          address: key,
        };

        set({
          positions: { ...get().positions, [key]: list },
          lendingHistory: [tx, ...(get().lendingHistory || [])],
        });
      },
      withdraw: (address, symbol) => {
        if (!address) return;
        const key = address.toLowerCase();
        const positionsForSymbol = (get().positions[key] || []).filter((p) => p.symbol === symbol);
        const totalAmount = positionsForSymbol.reduce((sum, p) => sum + p.amount, 0);

        if (totalAmount > 0) {
          const tx: LendingTransaction = {
            id: `ltx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            action: 'WITHDRAW',
            symbol,
            amount: totalAmount,
            timestamp: Date.now(),
            onchain: false,
            address: key,
          };
          set({
            lendingHistory: [tx, ...(get().lendingHistory || [])],
          });
        }

        const list = (get().positions[key] || []).filter((p) => p.symbol !== symbol);
        set({ positions: { ...get().positions, [key]: list } });
      },
      getPositions: (address) => {
        if (!address) return [];
        return get().positions[address.toLowerCase()] || [];
      },
      clearLendingHistory: (address) =>
        set((s) =>
          address
            ? { lendingHistory: s.lendingHistory.filter((t) => t.address?.toLowerCase() !== address.toLowerCase()) }
            : { lendingHistory: [] }
        ),
    }),
    { name: 'velixir-lending-store-v1' }
  )
);
