// Base Sepolia Testnet Configuration
export const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  chainName: "Base Sepolia Testnet",
  explorerUrl: "https://sepolia.basescan.org",
  apiUrl: "https://api-sepolia.basescan.org/api",
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
  rpcUrl: "https://sepolia.base.org",
};

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

// Only BTC, ETH, USDT and RIALO are tradable on the swap.
export const MARKET_TOKENS: MarketToken[] = [
  {
    id: "btc",
    name: "Bitcoin",
    symbol: "BTC",
    coingeckoId: "bitcoin",
    color: "#F7931A",
    colorSecondary: "#E8850A",
    price: 67842.5,
    priceChange24h: 1.87,
    volume24h: 64_200_000,
    liquidity: 177_800_000,
  },
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    coingeckoId: "ethereum",
    color: "#627EEA",
    colorSecondary: "#4A6BD4",
    price: 1834.81,
    priceChange24h: 2.34,
    volume24h: 88_400_000,
    liquidity: 225_500_000,
    isNative: true,
  },
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    coingeckoId: "tether",
    color: "#26A17B",
    colorSecondary: "#1E8A68",
    price: 1.0,
    priceChange24h: -0.02,
    volume24h: 142_300_000,
    liquidity: 190_000_000,
  },
  {
    id: "rialo",
    name: "Rialo",
    symbol: "RIALO",
    coingeckoId: null,
    color: "#00E5CC",
    colorSecondary: "#00C4AE",
    price: 0.4827,
    priceChange24h: 12.45,
    volume24h: 9_750_000,
    liquidity: 20_515_000,
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
  btc: generateSparkline(67842.5, 24, 0.004, 501),
  eth: generateSparkline(1834.81, 24, 0.006, 602),
  rialo: generateSparkline(0.4827, 24, 0.02, 703),
  usdt: generateSparkline(1.0, 24, 0.0005, 804),
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
  /** Minutes ago. */
  ageMin: number;
  txHash: string;
}

// Empty by default — populated by real user swaps.
export const SWAP_HISTORY: SwapTx[] = [];
