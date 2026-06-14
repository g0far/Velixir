"use client";

import React from "react";

/**
 * Shared Interest Cost Breakdown component.
 * Used by BorrowPanel (for preview) and PortfolioSection (for active positions).
 *
 * Formula (simple interest, annualized):
 *   yearly  = principal × (apyPercent / 100)
 *   daily   = yearly / 365
 *   weekly  = daily × 7
 *   monthly = yearly / 12
 */

interface InterestCostBreakdownProps {
  /** The principal amount to calculate interest on (in USD) */
  principal: number;
  /** Annual Percentage Yield as a percentage number, e.g. 12.5 means 12.5% */
  apyPercent: number;
  /** Optional subtitle shown next to APY, e.g. "2 positions" */
  subtitle?: string;
  /** If true, adds mt-4 for spacing (used inside BorrowPanel) */
  compact?: boolean;
}

export function computeInterestBreakdown(principal: number, apyPercent: number) {
  const yearly = principal * (apyPercent / 100);
  const daily = yearly / 365;
  const weekly = daily * 7;
  const monthly = yearly / 12;
  return { daily, weekly, monthly, yearly };
}

function formatUSD(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InterestCostBreakdown({
  principal,
  apyPercent,
  subtitle,
  compact = false,
}: InterestCostBreakdownProps) {
  const { daily, weekly, monthly, yearly } = computeInterestBreakdown(principal, apyPercent);

  return (
    <div className={`${compact ? 'mt-4 p-3.5 space-y-2.5' : 'p-4 space-y-3'} rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/10 font-mono`}>
      {/* Header */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-indigo-300 font-bold border-b border-indigo-500/5 pb-2">
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
          </svg>
          Interest Cost Breakdown
        </span>
        <span className="text-slate-500 text-[8px] normal-case font-normal">
          Based on {apyPercent.toFixed(1)}% APY{subtitle ? ` · ${subtitle}` : ''}
        </span>
      </div>

      {/* 2×2 Grid */}
      <div className="grid grid-cols-2 gap-2.5 text-[11px]">
        <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
          <span className="text-slate-400">Daily:</span>
          <span className="text-emerald-400 font-bold">{formatUSD(daily)}</span>
        </div>
        <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
          <span className="text-slate-400">Weekly:</span>
          <span className="text-emerald-400 font-bold">{formatUSD(weekly)}</span>
        </div>
        <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
          <span className="text-slate-400">Monthly:</span>
          <span className="text-emerald-400 font-bold">{formatUSD(monthly)}</span>
        </div>
        <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
          <span className="text-indigo-300 font-bold">Yearly:</span>
          <span className="text-indigo-400 font-bold">{formatUSD(yearly)}</span>
        </div>
      </div>
    </div>
  );
}
