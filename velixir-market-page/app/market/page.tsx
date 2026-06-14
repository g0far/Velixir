"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MarketTokenCards, { TokenIcon } from "@/components/main/MarketTokenCards";
import MarketChart from "@/components/main/MarketChart";
import MarketTradePanel from "@/components/main/MarketTradePanel";
import MarketPositions from "@/components/main/MarketPositions";
import { MARKET_TOKENS, BASE_SEPOLIA_CONFIG, MarketToken } from "@/constants/market";
import { fetchLivePrices } from "@/lib/baseSepolia";

const compactUsd = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export default function MarketPage() {
  const [tokens, setTokens] = useState<MarketToken[]>(MARKET_TOKENS);
  const [selectedId, setSelectedId] = useState<string>(MARKET_TOKENS[0].id);

  const selectedToken = tokens.find((t) => t.id === selectedId) ?? tokens[0];
  const handleSelect = (token: MarketToken) => setSelectedId(token.id);

  // Pull real BTC/ETH/USDT prices on mount, then refresh every 30s.
  useEffect(() => {
    let active = true;
    const sync = async () => {
      const live = await fetchLivePrices();
      if (!active || !Object.keys(live).length) return;
      setTokens((prev) =>
        prev.map((t) =>
          live[t.id]
            ? {
                ...t,
                price: live[t.id].price,
                priceChange24h: live[t.id].changePercent,
                volume24h: live[t.id].volume24h || t.volume24h,
              }
            : t
        )
      );
    };
    sync();
    const id = setInterval(sync, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const price = selectedToken.price;
  const priceChange = selectedToken.priceChange24h;

  return (
    <main className="min-h-screen w-full pt-[75px] pb-10 px-3 md:px-6 lg:px-10">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">Markets</span>
            </h1>
            <div className="flex items-center gap-1.5 bg-[#0a1628] border border-blue-500/20 rounded-lg px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] text-blue-400 font-medium">{BASE_SEPOLIA_CONFIG.chainName}</span>
            </div>
          </div>
          <a href={BASE_SEPOLIA_CONFIG.explorerUrl} target="_blank" rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 transition-colors">
            <span>Block Explorer</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </motion.div>

        {/* Token Cards */}
        <MarketTokenCards tokens={tokens} selectedId={selectedToken.id} onSelect={handleSelect} />

        {/* Selected Token Header */}
        <motion.div key={selectedToken.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
          className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <TokenIcon token={selectedToken} size={32} />
              <span className="text-white font-semibold">
                {selectedToken.symbol} <span className="text-gray-500 font-normal">/ USD</span>
              </span>
            </div>
            <span className="text-white font-bold text-xl">
              ${price.toLocaleString("en-US", { minimumFractionDigits: price < 10 ? 4 : 2, maximumFractionDigits: price < 10 ? 4 : 2 })}
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
              priceChange >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
            }`}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#080820] border border-[#1a1a3e] rounded-lg px-3 py-1.5">
              <span className="text-[10px] text-gray-500 uppercase">24h Change</span>
              <span className={`text-xs font-semibold ${priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#080820] border border-[#1a1a3e] rounded-lg px-3 py-1.5">
              <span className="text-[10px] text-gray-500 uppercase">24h Volume</span>
              <span className="text-xs font-semibold text-cyan-400">{compactUsd(selectedToken.volume24h)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#080820] border border-[#1a1a3e] rounded-lg px-3 py-1.5">
              <span className="text-[10px] text-gray-500 uppercase">Liquidity</span>
              <span className="text-xs font-semibold text-gray-300">{compactUsd(selectedToken.liquidity)}</span>
            </div>
          </div>
        </motion.div>

        {/* Chart + Trade Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <motion.div key={`chart-${selectedToken.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="bg-[#080820] border border-[#1a1a3e] rounded-2xl overflow-hidden min-h-[420px] flex flex-col">
            <MarketChart token={selectedToken} />
          </motion.div>
          <div className="bg-[#080820] border border-[#1a1a3e] rounded-2xl overflow-hidden flex flex-col min-h-[420px]">
            <MarketTradePanel tokens={tokens} selectedToken={selectedToken} onTokenChange={handleSelect} />
          </div>
        </div>

        {/* Positions */}
        <MarketPositions />
      </div>
    </main>
  );
}
