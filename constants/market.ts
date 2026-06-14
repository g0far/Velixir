// Provide NEXT_PUBLIC_ALCHEMY_API_KEY in .env.local for a dedicated Alchemy
// endpoint; without it the app falls back to the public Solana devnet RPC.
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

// Solana Devnet network configuration (Alchemy RPC when a key is configured).
export const SOLANA_DEVNET_CONFIG = {
  cluster: "devnet" as const,
  chainName: "Solana Devnet",
  explorerUrl: "https://explorer.solana.com",
  apiKey: ALCHEMY_KEY,
  rpcUrl: ALCHEMY_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : "https://api.devnet.solana.com",
};

// Back-compat alias so existing imports keep resolving after the EVM → Solana
// migration. Prefer SOLANA_DEVNET_CONFIG in new code.
export const BASE_SEPOLIA_CONFIG = SOLANA_DEVNET_CONFIG;

export interface MarketToken {
  id: string;
  name: string;
  symbol: string;
  /** CoinGecko coin id. `null` = synthetic/dummy token (e.g. RIALO) with no live data. */
  coingeckoId: string | null;
  color: string;
  colorSecondary: string;
  price: number;
  priceChange24h: number;
  /** Rolling 24h trading volume (USD). */
  volume24h: number;
  /** Available pool liquidity (USD). */
  liquidity: number;
  contractAddress?: string;
  isNative?: boolean;
}

// Only SOL, USDC and RIALO are tradable on the swap.
export const MARKET_TOKENS: MarketToken[] = [
  {
    id: "sol",
    name: "Solana",
    symbol: "SOL",
    coingeckoId: "solana",
    color: "#9945FF",
    colorSecondary: "#14F195",
    price: 150, // placeholder only; overridden by the live /api/prices feed
    priceChange24h: 2.34,
    volume24h: 88_400_000,
    liquidity: 225_500_000,
    isNative: true,
  },
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    coingeckoId: "usd-coin",
    color: "#2775CA",
    colorSecondary: "#1E5F9E",
    price: 1.0,
    priceChange24h: 0.01,
    volume24h: 142_300_000,
    liquidity: 190_000_000,
  },
  {
    id: "usdt",
    name: "Tether USD",
    symbol: "USDT",
    coingeckoId: "tether",
    color: "#26A17B",
    colorSecondary: "#1E8A6A",
    price: 1.0,
    priceChange24h: -0.01,
    volume24h: 167_500_000,
    liquidity: 205_000_000,
  },
  {
    id: "rialo",
    name: "Rialo",
    symbol: "RLO",
    coingeckoId: null,
    color: "#00E5CC",
    colorSecondary: "#00C4AE",
    price: 0.968, // seed; live price comes from the Raydium USDC/RLO pool
    priceChange24h: 0,
    volume24h: 0,
    liquidity: 9_680, // live USDC/RLO pool TVL (4840 USDC + 5000 RLO)
    // Real SPL token mint on Solana Devnet (9 decimals, 1B fixed supply).
    contractAddress: "375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6",
    // Raydium CPMM pool: 3bLnneKcurGQnXi2U8nUtSByVCu21e75QHGBvRLJVrTR (USDC/RLO, devnet)
  },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function generateSparkline(
  basePrice: number,
  count: number,
  volatility: number,
  seed: number
): number[] {
  const rng = seededRandom(seed);
  const points: number[] = [];
  let price = basePrice * 0.98;
  for (let i = 0; i < count; i++) {
    price += (rng() - 0.47) * basePrice * volatility;
    points.push(price);
  }
  return points;
}

export const SPARKLINE_DATA: Record<string, number[]> = {
  sol: generateSparkline(150, 24, 0.012, 602),
  rialo: generateSparkline(0.968, 24, 0.02, 703),
  usdc: generateSparkline(1.0, 24, 0.0005, 804),
  usdt: generateSparkline(1.0, 24, 0.0006, 805),
};

// ---------------------------------------------------------------------------
// Recent swaps (demo history shown under the chart).
// ---------------------------------------------------------------------------
export interface SwapTx {
  id: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  /** Notional value of the swap in USD. */
  valueUSD: number;
  status: "success" | "pending" | "failed";
  /** Minutes ago (used as a fallback when `timestamp` is absent). */
  ageMin: number;
  /** Epoch ms the swap was recorded — lets age be computed live after persistence. */
  timestamp?: number;
  txHash: string;
}

// Empty by default — populated by real user swaps.
export const SWAP_HISTORY: SwapTx[] = [];
