"use client";

import React from "react";
import { motion } from "framer-motion";
import { MarketToken, SPARKLINE_DATA } from "@/constants/market";
import { TokenLogo } from "@/lib/store/assetMetadata";

interface MarketTokenCardsProps {
  tokens: MarketToken[];
  selectedId: string;
  onSelect: (token: MarketToken) => void;
}

const formatCurrency = (value: number, decimals: number = 2): string => {
  if (value >= 1000)
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  return `$${value.toFixed(decimals)}`;
};

const formatCompact = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export const TokenIcon = ({
  token,
  size = 32,
  className = "",
}: {
  token: { id: string; symbol: string; color: string; colorSecondary: string };
  size?: number;
  className?: string;
}) => {
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <TokenLogo symbol={token.symbol} size={size} />
    </div>
  );
};

const Sparkline = ({
  data,
  color,
  isPositive,
  width = 100,
  height = 36,
}: {
  data: number[];
  color: string;
  isPositive: boolean;
  width?: number;
  height?: number;
}) => {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const lineColor = isPositive ? "#22c55e" : "#ef4444";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible w-full">
      <defs>
        <linearGradient id={`sparkGrad-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sparkGrad-${color})`} />
      <polyline points={points} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const MarketTokenCards = ({ tokens, selectedId, onSelect }: MarketTokenCardsProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tokens.map((token, index) => {
        const isSelected = token.id === selectedId;
        const sparkData = SPARKLINE_DATA[token.id] || [];
        const isPositive = token.priceChange24h >= 0;

        return (
          <motion.button
            key={token.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            onClick={() => onSelect(token)}
            className={`relative text-left bg-[#080820] border rounded-xl p-4 transition-all duration-300 group overflow-hidden ${
              isSelected
                ? "border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                : "border-[#1a1a3e] hover:border-[#2a2a5e]"
            }`}
          >
            {isSelected && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-purple-500" />
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <TokenIcon token={token} size={32} />
                <div>
                  <div className="text-white text-sm font-semibold">{token.symbol}</div>
                  <div className="text-gray-500 text-[10px]">{token.name}</div>
                </div>
              </div>
              <div className={`text-xs font-semibold px-2 py-0.5 rounded ${
                isPositive ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
              }`}>
                {isPositive ? "+" : ""}{token.priceChange24h.toFixed(2)}%
              </div>
            </div>

            <div className="text-white font-bold text-lg mb-2">
              {formatCurrency(token.price, token.price < 10 ? 4 : 2)}
            </div>

            <div className="w-full">
              <Sparkline data={sparkData} color={token.id} isPositive={isPositive} width={200} height={32} />
            </div>

            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#1a1a3e]/60">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-600 uppercase">Vol 24h</span>
                <span className="text-xs font-medium text-cyan-400">{formatCompact(token.volume24h)}</span>
              </div>
              <div className="w-px h-3 bg-[#1a1a3e]" />
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-600 uppercase">Liq</span>
                <span className="text-xs font-medium text-gray-300">{formatCompact(token.liquidity)}</span>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default MarketTokenCards;
