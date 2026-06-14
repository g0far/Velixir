"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import MarketTokenCards, { TokenIcon } from "@/components/main/MarketTokenCards";
import MarketChart from "@/components/main/MarketChart";
import MarketTradePanel from "@/components/main/MarketTradePanel";
import MarketPositions from "@/components/main/MarketPositions";
import VelixirFooter from "@/components/main/VelixirFooter";
import { MARKET_TOKENS, BASE_SEPOLIA_CONFIG, MarketToken } from "@/constants/market";
import { useOracleStore } from "@/lib/store/oracleStore";
import { explorerAddrUrl, shortAddress } from "@/lib/wallet";
import { raydiumSwapUrl, RLO_POOL } from "@/lib/raydium";

const compactUsd = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export default function MarketPage() {
  const oraclePrices = useOracleStore((s) => s.prices);
  const startOracle = useOracleStore((s) => s.start);
  const stopOracle = useOracleStore((s) => s.stop);

  useEffect(() => {
    startOracle();
    return () => stopOracle();
  }, [startOracle, stopOracle]);

  const tokens = useMemo(() => {
    return MARKET_TOKENS.map((t) => {
      const op = oraclePrices[t.symbol.toUpperCase()];
      if (op) {
        return {
          ...t,
          price: op.price,
          priceChange24h: op.change24h ?? op.changePct,
        };
      }
      return t;
    });
  }, [oraclePrices]);

  const [selectedId, setSelectedId] = useState<string>(MARKET_TOKENS[0].id);

  const selectedToken = tokens.find((t) => t.id === selectedId) ?? tokens[0];
  const handleSelect = (token: MarketToken) => setSelectedId(token.id);

  const price = selectedToken.price;
  const priceChange = selectedToken.priceChange24h;

  // Live on-chain circulating supply for SPL tokens that have a real mint.
  const [onchainSupply, setOnchainSupply] = useState<number | null>(null);
  useEffect(() => {
    const mint = selectedToken.contractAddress;
    if (!mint) {
      setOnchainSupply(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(BASE_SEPOLIA_CONFIG.rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenSupply", params: [mint] }),
        });
        const json = await res.json();
        const ui = json?.result?.value?.uiAmount;
        if (!cancelled && typeof ui === "number") setOnchainSupply(ui);
      } catch {
        if (!cancelled) setOnchainSupply(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedToken.contractAddress]);

  return (
    <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-white relative">
      {/* Background Video */}
      <div className="absolute inset-0 z-[0] pointer-events-none overflow-hidden h-[800px]">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute md:top-[-240px] lg:top-[-335px] top-[-400px] left-0 w-full h-auto object-cover opacity-40 mix-blend-screen"
        >
          <source src="/blackhole.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030014]/60 to-[#030014] z-10" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 w-full pt-[100px]">
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-6 lg:px-10 pb-10 space-y-4">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold font-display">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">Markets</span>
              </h1>
              <div className="flex items-center gap-1.5 bg-[#0a1628] border border-blue-500/20 rounded-lg px-2.5 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] text-blue-400 font-medium">{BASE_SEPOLIA_CONFIG.chainName}</span>
              </div>
            </div>
            <a href={`${BASE_SEPOLIA_CONFIG.explorerUrl}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
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
                {selectedToken.contractAddress && (
                  <a
                    href={explorerAddrUrl(selectedToken.contractAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={selectedToken.contractAddress}
                    className="flex items-center gap-1 bg-[#080820] border border-cyan-500/20 rounded-md px-2 py-0.5 text-[10px] font-mono text-cyan-400 hover:border-cyan-500/40 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    SPL · {shortAddress(selectedToken.contractAddress)}
                  </a>
                )}
                {selectedToken.symbol === "RLO" && (
                  <a
                    href={raydiumSwapUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Raydium pool ${RLO_POOL.poolId}`}
                    className="flex items-center gap-1 bg-[#1a0f2e] border border-purple-500/30 rounded-md px-2 py-0.5 text-[10px] font-mono text-purple-300 hover:border-purple-400/50 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Trade on Raydium
                  </a>
                )}
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
              {onchainSupply !== null && (
                <div className="flex items-center gap-1.5 bg-[#071e19] border border-emerald-500/20 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] text-emerald-500/80 uppercase">On-chain Supply</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {onchainSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} {selectedToken.symbol}
                  </span>
                </div>
              )}
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
        </main>

        <VelixirFooter />
      </div>
    </div>
  );
}
