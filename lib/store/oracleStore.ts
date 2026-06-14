import { create } from 'zustand';
import { OraclePrice } from '../types/borrow';
import { toast } from './toastStore';
import { fetchRloPoolState } from '../raydium';

// Seed prices are only a brief placeholder shown before the first live fetch
// (and a last-resort offline fallback). They are kept close to recent reality
// so a fetch failure never shows an absurd value. The live `/api/prices` route
// overrides these on the first tick.
const SEED: Record<string, number> = {
  SOL: 150,
  BTC: 63000,
  RLO: 0.968, // live price comes from the Raydium USDC/RLO pool reserves
  USDC: 1.0,
  USDT: 1.0,
};

const TICK_MS = 15000; // update every 15 seconds

// Bounded fallback used ONLY when no live price is available for a symbol.
// Unlike the previous unbounded random walk (which could drift SOL to ~$165),
// this holds the last-known price for assets and only lets stablecoins jitter
// minutely around their peg — so a displayed price can never run away from
// reality when the live source is briefly unreachable.
function holdPrice(symbol: string, current: number): number {
  if (symbol === 'USDC' || symbol === 'USDT') {
    const drift = (Math.random() - 0.5) * 0.0008; // +/- 0.04%
    return Math.max(0.995, Math.min(1.005, current * (1 + drift)));
  }
  return current; // hold last-known; do not fabricate movement
}

interface LivePrices {
  prices: Record<string, number>;
  changes: Record<string, number>;
}

// Fetch live prices from our same-origin API route. Running server-side there
// keeps the browser free of API keys and immune to client CORS/network blocks.
async function fetchLivePrices(): Promise<LivePrices> {
  try {
    const res = await fetch('/api/prices', { cache: 'no-store' });
    if (!res.ok) return { prices: {}, changes: {} };
    const json = await res.json();
    return {
      prices: json && typeof json.prices === 'object' && json.prices ? json.prices : {},
      changes: json && typeof json.changes === 'object' && json.changes ? json.changes : {},
    };
  } catch {
    return { prices: {}, changes: {} };
  }
}

interface OracleState {
  prices: Record<string, OraclePrice>;
  running: boolean;
  intervalId: number | null;
  lastUpdate: number;
  isFirstTick: boolean;
  start: () => void;
  stop: () => void;
  tick: () => Promise<void>;
}

const initialPrices: Record<string, OraclePrice> = Object.fromEntries(
  Object.entries(SEED).map(([symbol, price]) => [
    symbol,
    { symbol, price, prevPrice: price, changePct: 0 },
  ])
);

export const useOracleStore = create<OracleState>((set, get) => ({
  prices: initialPrices,
  running: false,
  intervalId: null,
  lastUpdate: Date.now(),
  isFirstTick: true,
  tick: async () => {
    const prev = get().prices;
    const isFirst = get().isFirstTick;
    const updated: Record<string, OraclePrice> = {};
    let biggest: { symbol: string; pct: number } | null = null;

    // Live USD prices (SOL, BTC, USDC, USDT) from the same-origin proxy.
    const { prices: live, changes } = await fetchLivePrices();

    // RLO live price from the on-chain Raydium USDC/RLO pool reserves.
    const rloPool = await fetchRloPoolState();
    const rloPrice = rloPool ? rloPool.price : null;

    const onChainPrices: Record<string, number | null> = {
      SOL: live.SOL ?? null,
      BTC: live.BTC ?? null,
      RLO: rloPrice, // live from Raydium pool; null → hold last-known
      USDC: live.USDC ?? 1.0,
      USDT: live.USDT ?? 1.0,
    };

    for (const symbol of Object.keys(prev)) {
      const cur = prev[symbol];
      let np = onChainPrices[symbol];

      if (np === null || np === undefined || isNaN(np) || np <= 0) {
        // No live value — hold last-known (bounded), never fabricate a trend.
        np = holdPrice(symbol, cur.price);
      }

      const changePct = cur.price > 0 ? ((np - cur.price) / cur.price) * 100 : 0;
      updated[symbol] = {
        symbol,
        price: np,
        prevPrice: cur.price,
        changePct,
        change24h: typeof changes[symbol] === 'number' ? changes[symbol] : cur.change24h,
      };

      // Exclude stablecoins from showing massive swing notifications
      if (symbol !== 'USDC' && symbol !== 'USDT' && (!biggest || Math.abs(changePct) > Math.abs(biggest.pct))) {
        biggest = { symbol, pct: changePct };
      }
    }

    set({ prices: updated, lastUpdate: Date.now(), isFirstTick: false });

    // Surface notable swings (>=2%) as an oracle notification (skip on first tick).
    if (!isFirst && biggest && Math.abs(biggest.pct) >= 2) {
      const dir = biggest.pct > 0 ? '▲' : '▼';
      toast.info(
        'Oracle price update',
        `${biggest.symbol} ${dir} ${Math.abs(biggest.pct).toFixed(2)}% — risk metrics recalculated`
      );
    }
  },
  start: () => {
    if (get().running) return;
    // Tick once immediately to load live prices
    get().tick();
    const id = window.setInterval(() => get().tick(), TICK_MS);
    set({ running: true, intervalId: id });
  },
  stop: () => {
    const id = get().intervalId;
    if (id !== null) window.clearInterval(id);
    set({ running: false, intervalId: null, isFirstTick: true });
  },
}));
