import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Coins, Wallet, Sparkles } from 'lucide-react';

interface RequiredCollateralSummaryProps {
  standardCollateralNeeded: number;
  reputationCollateralNeeded: number;
  collateralSaved: number;
  collateralAsset: string;
  collateralPrice: number;
  isReputationMode: boolean;
  hasBorrowAmount?: boolean;
  borrowAmount?: number;
  borrowAsset?: string;
  depositedCollateralAmount?: number;
  depositedCollateralValue?: number;
  standardCapacity?: number;
  reputationCapacity?: number;
}

export default function RequiredCollateralSummary({
  standardCollateralNeeded,
  reputationCollateralNeeded,
  collateralSaved,
  collateralAsset,
  collateralPrice,
  isReputationMode,
  hasBorrowAmount = false,
  borrowAmount = 0,
  borrowAsset = 'USDC',
  depositedCollateralAmount = 0,
  depositedCollateralValue = 0,
  standardCapacity = 0,
  reputationCapacity = 0,
}: RequiredCollateralSummaryProps) {
  
  const stdAssetAmount = collateralPrice > 0 ? standardCollateralNeeded / collateralPrice : 0;
  const repAssetAmount = collateralPrice > 0 ? reputationCollateralNeeded / collateralPrice : 0;

  // Active when collateral has been deposited/entered
  const hasDeposit = depositedCollateralValue > 0;

  const stdLtvPct = depositedCollateralValue > 0 ? Math.round((standardCapacity / depositedCollateralValue) * 100) : 80;
  const repLtvPct = depositedCollateralValue > 0 ? Math.round((reputationCapacity / depositedCollateralValue) * 100) : 110;
  const efficiencyGainPct = standardCapacity > 0
    ? (((reputationCapacity - standardCapacity) / standardCapacity) * 100).toFixed(1)
    : '37.5';

  const isCovered = depositedCollateralValue >= reputationCollateralNeeded && reputationCollateralNeeded > 0;
  const coveragePercent = reputationCollateralNeeded > 0
    ? Math.round((depositedCollateralValue / reputationCollateralNeeded) * 100)
    : 0;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 md:p-5 backdrop-blur-sm shadow-sm relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 relative z-10">
        <div>
          <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Capital Efficiency & Collateral Summary
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {hasDeposit ? (
              <span>
                Based on your <strong className="text-white">${Math.round(depositedCollateralValue).toLocaleString()} {collateralAsset}</strong> deposit: see your traditional vs. reputation borrowing power.
              </span>
            ) : (
              <span>Enter a collateral deposit in Step 2 to see how verified reputation boosts your borrowing power.</span>
            )}
          </p>
        </div>
        {isReputationMode && hasDeposit && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-emerald-400 animate-pulse" />
            Reputation Active ({repLtvPct}% Power)
          </div>
        )}
      </div>

      {!hasDeposit ? (
        <div className="flex flex-col items-center justify-center py-6 relative z-10">
          <ShieldCheck className="h-8 w-8 text-slate-600 mb-2" />
          <p className="text-xs text-slate-500 text-center font-mono">
            Enter a collateral deposit in Step 2 above to calculate<br />your borrowing power and unlocked capital savings.
          </p>
        </div>
      ) : (
      <div className="space-y-3 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Deposited Collateral (Directly from Step 2) */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">Your Collateral Deposit</span>
                <Wallet className="h-3 w-3 text-slate-500" />
              </div>
              <div className="text-lg font-bold font-display text-white">
                ${Math.round(depositedCollateralValue).toLocaleString('en-US')}
              </div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                ({depositedCollateralAmount.toLocaleString('en-US', { maximumFractionDigits: 4 })} {collateralAsset})
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-400 font-mono">
              Deposited in Step 2
            </div>
          </div>

          {/* 2. Traditional DeFi Limit (Standard LTV) */}
          <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">Traditional DeFi Cap ({stdLtvPct}%)</span>
              <div className="text-lg font-bold font-display text-slate-400">
                ${Math.round(standardCapacity).toLocaleString('en-US')}
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                Maximum standard loan limit
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-500 font-mono">
              Without reputation
            </div>
          </div>

          {/* 3. Velixir Elite Limit (Reputation LTV) */}
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 flex flex-col justify-between shadow-inner">
            <div>
              <span className="text-[9px] font-mono text-indigo-400 uppercase font-semibold block mb-1">Velixir Elite Cap ({repLtvPct}%)</span>
              <div className="text-lg font-bold font-display text-emerald-400">
                ${Math.round(reputationCapacity).toLocaleString('en-US')}
              </div>
              <div className="text-[9px] text-indigo-300/70 font-mono mt-0.5">
                Your reputation borrowing limit
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-indigo-500/10 text-[9px] text-emerald-400 font-mono font-medium">
              {repLtvPct}% borrowing power unlocked
            </div>
          </div>

          {/* 4. Capital Efficiency Gain / Capital Saved */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-mono text-emerald-400 uppercase font-semibold block mb-1">Capital Saved / Extra Power</span>
              <div className="text-lg font-bold font-display text-emerald-400">
                +${Math.round(collateralSaved).toLocaleString('en-US')}
              </div>
              <div className="text-[9px] text-emerald-500/70 font-mono mt-0.5">
                Extra loan unlocked from same deposit
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-emerald-500/10 text-[9px] text-emerald-400 font-mono font-semibold">
              +{efficiencyGainPct}% more capital efficiency
            </div>
          </div>
        </div>

        {/* Live Loan Check Row (when user also enters borrow amount in Step 4) */}
        {borrowAmount > 0 && (
          <div className="bg-slate-950/80 border border-white/5 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Loan Request:</span>
              <span className="text-white font-bold">${Math.round(borrowAmount).toLocaleString()} {borrowAsset}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Required Collateral:</span>
              <span className="text-indigo-300 font-bold">${Math.round(reputationCollateralNeeded).toLocaleString()} ({repAssetAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {collateralAsset})</span>
            </div>
            <div>
              {isCovered ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" /> Deposit is Sufficient ({coveragePercent}% Coverage)
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="h-3 w-3" /> Deposit below required ({coveragePercent}%)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
