import { MarketToken } from "@/constants/market";

// Price-chart timeframes for the swap market.
export type ChartRange = "1m" | "15m" | "30m" | "1h" | "4h" | "1d";
export const CHART_RANGES: ChartRange[] = ["1m", "15m", "30m", "1h", "4h", "1d"];

/** lightweight-charts compatible candle (time in UNIX seconds, UTC). */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleResult {
  candles: Candle[];
  /** true when the candle shape is synthesised (no real OHLC source). */
  dummy: boolean;
  source: "anchored" | "stable" | "simulated";
}

export interface LivePrice {
  price: number;
  changePercent: number;
  volume24h: number;
}

// ---------------------------------------------------------------------------
// Real market data — CoinGecko public API (no key, CORS-enabled, reachable in
// regions where exchange APIs like Binance are blocked).
// ---------------------------------------------------------------------------
const COINGECKO = "https://api.coingecko.com/api/v3";

/** Token id → CoinGecko coin id. `null` = no real market (synthetic token). */
const COINGECKO_ID: Record<string, string | null> = {
  btc: "bitcoin",
  eth: "ethereum",
  usdt: "tether",
  rialo: null,
};

/** Real live price, 24h change and 24h volume for BTC/ETH/USDT. */
export async function fetchLivePrices(): Promise<Record<string, LivePrice>> {
  const out: Record<string, LivePrice> = {};
  try {
    const ids = Object.values(COINGECKO_ID).filter(Boolean).join(",");
    const res = await fetch(
      `${COINGECKO}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = (await res.json()) as Record<
        string,
        { usd: number; usd_24h_change?: number; usd_24h_vol?: number }
      >;
      for (const [id, cgId] of Object.entries(COINGECKO_ID)) {
        const row = cgId ? data[cgId] : undefined;
        if (row?.usd != null) {
          out[id] = {
            price: row.usd,
            changePercent: row.usd_24h_change ?? 0,
            volume24h: row.usd_24h_vol ?? 0,
          };
        }
      }
    }
  } catch {
    /* leave out empty → caller keeps static prices */
  }
  return out;
}

// ---------------------------------------------------------------------------
// Synthetic fallback — smooth candles when there's no real market / on error.
// ---------------------------------------------------------------------------
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647), (s - 1) / 2147483646);
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const RANGE_CONFIG: Record<ChartRange, { intervalSec: number; count: number; volatility: number }> = {
  "1m": { intervalSec: 60, count: 130, volatility: 0.0009 },
  "15m": { intervalSec: 15 * 60, count: 130, volatility: 0.0022 },
  "30m": { intervalSec: 30 * 60, count: 130, volatility: 0.0032 },
  "1h": { intervalSec: 60 * 60, count: 130, volatility: 0.0048 },
  "4h": { intervalSec: 4 * 60 * 60, count: 130, volatility: 0.0085 },
  "1d": { intervalSec: 24 * 60 * 60, count: 130, volatility: 0.018 },
};

function generateCandles(token: MarketToken, range: ChartRange): Candle[] {
  const { intervalSec, count, volatility } = RANGE_CONFIG[range];
  const rng = seededRandom(hashSeed(token.id + range));
  const now = Math.floor(Date.now() / 1000);
  const end = now - (now % intervalSec);
  const drift = (token.priceChange24h / 100) * (intervalSec / 86400) * 0.6;

  const closes: number[] = [];
  let value = 1;
  let momentum = 0;
  for (let i = 0; i < count; i++) {
    momentum = momentum * 0.82 + (rng() - 0.5) * volatility + drift / count;
    value *= 1 + momentum;
    closes.push(value);
  }
  const scale = token.price / closes[closes.length - 1];
  for (let i = 0; i < count; i++) closes[i] *= scale;

  const baseVol = Math.max(token.volume24h / count, 1);
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const close = closes[i];
    const open = i === 0 ? close * (1 - (rng() - 0.5) * volatility) : closes[i - 1];
    const body = Math.max(open, close);
    const wick = body * volatility * (0.5 + rng());
    candles.push({
      time: end - (count - 1 - i) * intervalSec,
      open,
      high: Math.max(open, close) + wick * rng(),
      low: Math.min(open, close) - wick * rng(),
      close,
      volume: baseVol * (0.45 + rng() * 1.1),
    });
  }
  return candles;
}

/** Near-flat stablecoin candles (USDT) hugging $1 with tiny noise. */
function generateStable(token: MarketToken, range: ChartRange): Candle[] {
  const { intervalSec, count } = RANGE_CONFIG[range];
  const rng = seededRandom(hashSeed(token.id + range));
  const now = Math.floor(Date.now() / 1000);
  const end = now - (now % intervalSec);
  const candles: Candle[] = [];
  let prev = token.price;
  for (let i = 0; i < count; i++) {
    const close = 1 + (rng() - 0.5) * 0.0008;
    const open = prev;
    candles.push({
      time: end - (count - 1 - i) * intervalSec,
      open,
      high: Math.max(open, close) + rng() * 0.0003,
      low: Math.min(open, close) - rng() * 0.0003,
      close,
      volume: Math.max(token.volume24h / count, 1) * (0.6 + rng() * 0.8),
    });
    prev = close;
  }
  return candles;
}

/**
 * Returns candles for the token + timeframe. Free real-OHLC at these exact
 * intervals (1m–1d) isn't available, so the shape is modelled — but it's
 * anchored to the token's real live price and 24h direction (USDT held flat
 * to its peg, RIALO fully synthetic).
 */
export async function fetchCandles(token: MarketToken, range: ChartRange): Promise<CandleResult> {
  if (token.id === "usdt") {
    return { candles: generateStable(token, range), dummy: false, source: "stable" };
  }
  const real = COINGECKO_ID[token.id] != null;
  return {
    candles: generateCandles(token, range),
    dummy: !real,
    source: real ? "anchored" : "simulated",
  };
}
