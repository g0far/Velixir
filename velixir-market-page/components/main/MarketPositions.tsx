"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { SWAP_HISTORY, SwapTx, BASE_SEPOLIA_CONFIG } from "@/constants/market";
import { TokenIcon } from "@/components/main/MarketTokenCards";

const SYMBOL_TO_TOKEN: Record<string, { id: string; symbol: string; color: string; colorSecondary: string }> = {
  BTC: { id: "btc", symbol: "BTC", color: "#F7931A", colorSecondary: "#E8850A" },
  ETH: { id: "eth", symbol: "ETH", color: "#627EEA", colorSecondary: "#4A6BD4" },
  RIALO: { id: "rialo", symbol: "RIALO", color: "#00E5CC", colorSecondary: "#00C4AE" },
  USDT: { id: "usdt", symbol: "USDT", color: "#26A17B", colorSecondary: "#1E8A68" },
};

const iconFor = (symbol: string) =>
  SYMBOL_TO_TOKEN[symbol] || { id: symbol.toLowerCase(), symbol, color: "#64748b", colorSecondary: "#475569" };

const fmtAge = (min: number): string => {
  if (min <= 0) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ago`;
};

const fmtNum = (value: number): string =>
  value.toLocaleString("en-US", { maximumFractionDigits: value < 1 ? 4 : 2 });

const STATUS_STYLES: Record<SwapTx["status"], string> = {
  success: "bg-emerald-500/10 text-emerald-400",
  pending: "bg-amber-500/10 text-amber-400",
  failed: "bg-red-500/10 text-red-400",
};

type Filter = "all" | "success" | "pending" | "failed";

const MarketPositions = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const swaps = SWAP_HISTORY.filter((s) => (filter === "all" ? true : s.status === filter));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="bg-[#080820] border border-[#1a1a3e] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a3e]">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Recent Swaps</h3>
          <span className="text-xs text-gray-500 bg-[#0a0a24] px-2 py-0.5 rounded-full">{SWAP_HISTORY.length} swaps</span>
          <a
            href={BASE_SEPOLIA_CONFIG.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 bg-[#0a1628] border border-blue-500/20 rounded-md px-2 py-0.5 hover:border-blue-500/40 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[9px] text-blue-400 font-medium">Base Sepolia</span>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
        <div className="flex items-center gap-1">
          {(["all", "success", "pending", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 capitalize ${
                filter === f
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-[#1a1a3e]">
              {["Pair", "You paid", "You received", "Value", "Status", "Age", "Tx"].map((h) => (
                <th
                  key={h}
                  className={`py-3 px-4 text-xs text-gray-500 font-medium uppercase tracking-wider ${
                    h === "Pair" ? "text-left pl-5" : h === "Tx" ? "text-right pr-5" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {swaps.map((s, index) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-[#1a1a3e]/50 hover:bg-[#0d0d30] transition-colors duration-200"
              >
                <td className="py-3 pl-5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-2">
                      <TokenIcon token={iconFor(s.fromSymbol)} size={26} className="ring-2 ring-[#080820]" />
                      <TokenIcon token={iconFor(s.toSymbol)} size={26} className="ring-2 ring-[#080820]" />
                    </div>
                    <span className="text-white text-sm">
                      {s.fromSymbol} <span className="text-gray-600">→</span> {s.toSymbol}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-sm text-gray-300">{fmtNum(s.fromAmount)} {s.fromSymbol}</td>
                <td className="py-3 px-4 text-right text-sm text-white">{fmtNum(s.toAmount)} {s.toSymbol}</td>
                <td className="py-3 px-4 text-right text-sm text-gray-300">${s.valueUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td className="py-3 px-4 text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                </td>
                <td className="py-3 px-4 text-right text-xs text-gray-500">{fmtAge(s.ageMin)}</td>
                <td className="py-3 pr-5 pl-4 text-right">
                  <a
                    href={`${BASE_SEPOLIA_CONFIG.explorerUrl}/tx/${s.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    {s.txHash.slice(0, 6)}…{s.txHash.slice(-4)}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {swaps.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-gray-600 text-sm">No swaps found</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MarketPositions;
