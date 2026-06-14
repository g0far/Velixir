import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Live spot-price proxy.
//
// Prices are fetched SERVER-SIDE so the browser never needs an API key and is
// never subject to client-side CORS or network/DPI blocking. The previous
// design called a keyed price API directly from the browser; when that call
// failed (e.g. missing key → HTTP 401) the client invented a price via an
// unbounded random walk, which is how SOL could drift to a fabricated ~$165.
//
// CoinGecko is keyless and well within rate limits at our 15s cadence; the
// Alchemy Prices API is kept as a server-side fallback.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const revalidate = 0;

// App symbol -> CoinGecko coin id.
const CG_IDS: Record<string, string> = {
  SOL: "solana",
  BTC: "bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
};

interface PriceResult {
  prices: Record<string, number>;
  /** Real rolling 24h change (%) per symbol, when the source provides it. */
  changes: Record<string, number>;
}

async function fromCoinGecko(): Promise<PriceResult> {
  const ids = Object.values(CG_IDS).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { cache: "no-store", headers: { accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const json = await res.json();
  const prices: Record<string, number> = {};
  const changes: Record<string, number> = {};
  for (const [sym, id] of Object.entries(CG_IDS)) {
    const v = json?.[id]?.usd;
    if (typeof v === "number" && v > 0) prices[sym] = v;
    const c = json?.[id]?.usd_24h_change;
    if (typeof c === "number") changes[sym] = c;
  }
  if (Object.keys(prices).length === 0) throw new Error("coingecko empty");
  return { prices, changes };
}

async function fromAlchemy(): Promise<PriceResult> {
  const key =
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("no alchemy key");
  const syms = Object.keys(CG_IDS)
    .map((s) => `symbols=${s}`)
    .join("&");
  const res = await fetch(
    `https://api.g.alchemy.com/prices/v1/${key}/tokens/by-symbol?${syms}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`alchemy ${res.status}`);
  const json = await res.json();
  const prices: Record<string, number> = {};
  if (Array.isArray(json?.data)) {
    for (const item of json.data) {
      const v = Number(item?.prices?.[0]?.value);
      if (item?.symbol && !isNaN(v) && v > 0) prices[item.symbol] = v;
    }
  }
  if (Object.keys(prices).length === 0) throw new Error("alchemy empty");
  return { prices, changes: {} };
}

export async function GET() {
  let result: PriceResult = { prices: {}, changes: {} };
  let source = "none";
  try {
    result = await fromCoinGecko();
    source = "coingecko";
  } catch {
    try {
      result = await fromAlchemy();
      source = "alchemy";
    } catch {
      // Both sources failed — return empty so the client holds its last-known
      // price instead of fabricating one.
    }
  }
  return NextResponse.json(
    { ...result, source, updatedAt: Date.now() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
