import React, { useState } from 'react';
import { AlertOctagon, Flame, ArrowDown, ShieldAlert, Clock, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { computeELT, computeMaxBorrowLTV, computeBorrowHealth, computeMaxBorrowCapacity, computeAccruedInterest, getTrustTier, computeGracePeriodHours } from '@/lib/store/trustStore';
import { TrustTierBadge } from './TrustTierBadge';

interface LiquidationRiskSimulatorProps {
  collateralValue: number;       // total collateral value USD
  borrowValue: number;           // principal debt USD
  accruedInterest?: number;      // already-accrued interest USD
  annualRatePct?: number;        // annual rate % for interest simulation
  trustScore: number;            // current trust score
  standardLimitRatio: number;    // standard LTV e.g. 0.60
  isReputationMode: boolean;
}

export default function LiquidationRiskSimulator({
  collateralValue,
  borrowValue,
  accruedInterest = 0,
  annualRatePct = 10,
  trustScore,
  standardLimitRatio,
  isReputationMode,
}: LiquidationRiskSimulatorProps) {
  const [customPriceDrop, setCustomPriceDrop] = useState(0);     // 0–50% price drop
  const [interestMonths, setInterestMonths] = useState(0);       // 0–24 months
  const [trustScoreDrop, setTrustScoreDrop] = useState(0);       // 0–trust score reduction

  // Compute simulated metrics for given price drop, interest months, and trust score delta
  const getSimulationMetrics = (dropPercent: number, months: number, scoreDrop: number) => {
    const priceMultiplier = 1 - dropPercent / 100;
    const simulatedCollateral = collateralValue * priceMultiplier;

    // Factor 2: simulated accrued interest (months of additional interest)
    const additionalInterest = computeAccruedInterest(borrowValue, annualRatePct, (months / 12) * 365);
    const totalAccrued = accruedInterest + additionalInterest;
    const totalDebt = borrowValue + totalAccrued;

    // Factor 3: reputation — reduce trust score
    const simulatedScore = Math.max(0, trustScore - scoreDrop);
    const elt = computeELT(simulatedScore);
    const maxBorrowLTV = computeMaxBorrowLTV(simulatedScore);
    const maxCapacity = computeMaxBorrowCapacity(simulatedCollateral, simulatedScore);

    const ltv = simulatedCollateral > 0 ? (totalDebt / simulatedCollateral) * 100 : 0;
    const borrowHealth = simulatedCollateral > 0 && totalDebt > 0
      ? computeBorrowHealth(simulatedCollateral, totalDebt, simulatedScore)
      : Infinity;

    // Margin Call: debt > maxCapacity but ELT not breached
    const marginCall = totalDebt > maxCapacity && borrowHealth >= 1.0;

    let status: 'Safe' | 'Margin Call' | 'Warning' | 'Liquidation' = 'Safe';
    let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    if (borrowHealth < 1.0) {
      status = 'Liquidation';
      statusColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    } else if (marginCall) {
      status = 'Margin Call';
      statusColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    } else if (borrowHealth < 1.5) {
      status = 'Warning';
      statusColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }

    return {
      ltv,
      borrowHealth: isFinite(borrowHealth) ? borrowHealth : 99.9,
      status,
      statusColor,
      collateral: simulatedCollateral,
      totalDebt,
      totalAccrued,
      elt,
      maxCapacity,
      marginCall,
      simulatedScore,
    };
  };

  const current   = getSimulationMetrics(0, interestMonths, trustScoreDrop);
  const tenPct    = getSimulationMetrics(10, interestMonths, trustScoreDrop);
  const twentyPct = getSimulationMetrics(20, interestMonths, trustScoreDrop);
  const thirtyPct = getSimulationMetrics(30, interestMonths, trustScoreDrop);
  const custom    = getSimulationMetrics(customPriceDrop, interestMonths, trustScoreDrop);

  const currentTier = getTrustTier(trustScore);
  const simulatedTier = getTrustTier(Math.max(0, trustScore - trustScoreDrop));
  const gracePeriodHours = computeGracePeriodHours(Math.max(0, trustScore - trustScoreDrop));

  const formatLtv = (val: number) => {
    if (isNaN(val) || !isFinite(val)) return '0%';
    return `${val.toFixed(0)}%`;
  };

  const formatHf = (val: number) => {
    if (val > 10) return '9.98+';
    if (val <= 0.01) return '0.00';
    return val.toFixed(2);
  };

  const StatusBadge = ({ s }: { s: ReturnType<typeof getSimulationMetrics> }) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.statusColor}`}>
      {s.status}
    </span>
  );

  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Flame className="h-4.5 w-4.5 text-orange-500" />
            Liquidation Risk Simulator
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Stress-test across three risk factors: collateral price, accrued interest, and Trust Score changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentTier && (
            <TrustTierBadge trustScore={trustScore} size="md" />
          )}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-white/5 text-[10px] font-mono text-slate-400">
            <span>Mode: {isReputationMode ? 'Reputation Trust' : 'Isolated standard'}</span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1 flex items-center justify-center"
            title={isCollapsed ? "Expand Simulator" : "Minimize Simulator"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4.5 w-4.5" />
            ) : (
              <ChevronUp className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-4">

      {/* Tier Privileges Summary */}
      {currentTier && (
        <div className={`rounded-xl border p-3 mb-4 ${currentTier.color.bg} ${currentTier.color.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-mono font-bold uppercase ${currentTier.color.text}`}>
              {currentTier.name} Tier — Active Privileges
            </span>
            {trustScoreDrop > 0 && simulatedTier && simulatedTier.name !== currentTier.name && (
              <span className="text-[9px] font-mono text-orange-400 flex items-center gap-1">
                Tier drops to {simulatedTier.name} at -{trustScoreDrop}
              </span>
            )}
            {trustScoreDrop > 0 && !simulatedTier && (
              <span className="text-[9px] font-mono text-rose-400">Tier lost at -{trustScoreDrop}</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="text-center">
              <div className="text-[9px] font-mono text-slate-500 uppercase">Borrow Cap</div>
              <div className={`text-sm font-bold font-mono ${currentTier.color.text}`}>{(currentTier.borrowCapacityPct * 100).toFixed(0)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-mono text-slate-500 uppercase">APY</div>
              <div className={`text-sm font-bold font-mono ${currentTier.color.text}`}>{currentTier.apy.toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-mono text-slate-500 flex items-center justify-center gap-0.5 uppercase">
                <Clock className="h-2.5 w-2.5" /> Grace
              </div>
              <div className={`text-sm font-bold font-mono ${currentTier.color.text}`}>{currentTier.gracePeriodHours}h</div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Factor Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {/* Factor 2: Accrued Interest */}
        <div className="bg-slate-950/50 rounded-xl p-3.5 border border-amber-500/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-semibold text-amber-400/80 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Accrued Interest
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">{interestMonths}mo</span>
          </div>
          <input
            type="range" min="0" max="24" value={interestMonths}
            onChange={(e) => setInterestMonths(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-amber-500 focus:outline-none"
          />
          <div className="mt-2 flex justify-between text-[9px] font-mono text-slate-500">
            <span>0 months</span>
            <span className="text-amber-400/70">
              +${current.totalAccrued.toLocaleString(undefined, { maximumFractionDigits: 0 })} interest
            </span>
            <span>24mo</span>
          </div>
        </div>

        {/* Factor 3: Trust Score Drop */}
        <div className="bg-slate-950/50 rounded-xl p-3.5 border border-indigo-500/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-semibold text-indigo-400 flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3" />
              Trust Score Drop
            </span>
            <span className="text-xs font-mono font-bold text-indigo-400">
              -{trustScoreDrop} → {Math.max(0, trustScore - trustScoreDrop)}
            </span>
          </div>
          <input
            type="range" min="0" max={trustScore} value={trustScoreDrop}
            onChange={(e) => setTrustScoreDrop(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-indigo-500 focus:outline-none"
          />
          <div className="mt-2 flex justify-between text-[9px] font-mono text-slate-500">
            <span>No change</span>
            <span className="text-indigo-400/70">
              ELT: {(current.elt * 100).toFixed(0)}%
            </span>
            <span>-{trustScore}</span>
          </div>
        </div>

        {/* Factor 1: Price Drop — also appears in the table but config here too */}
        <div className="bg-slate-950/50 rounded-xl p-3.5 border border-rose-500/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" />
              Collateral Price Drop
            </span>
            <span className="text-xs font-mono font-bold text-rose-400">-{customPriceDrop}%</span>
          </div>
          <input
            type="range" min="0" max="50" value={customPriceDrop}
            onChange={(e) => setCustomPriceDrop(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-rose-500 focus:outline-none"
          />
          <div className="mt-2 flex justify-between text-[9px] font-mono text-slate-500">
            <span>0%</span>
            <span className="text-slate-300">
              ${custom.collateral.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span>-50%</span>
          </div>
        </div>
      </div>

      {/* Simulation Table: fixed price drops with current factor 2 & 3 settings */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/5 font-mono text-slate-400 text-[10px]">
              <th className="py-2.5 pb-2">METRIC</th>
              <th className="py-2.5 pb-2">CURRENT</th>
              <th className="py-2.5 pb-2 text-rose-300">
                <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" />-10% DROP</span>
              </th>
              <th className="py-2.5 pb-2 text-rose-400">
                <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" />-20% DROP</span>
              </th>
              <th className="py-2.5 pb-2 text-rose-500 font-bold">
                <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 animate-pulse" />-30% CRASH</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {/* LTV row */}
            <tr>
              <td className="py-3 font-semibold text-slate-400 font-sans">LTV Ratio</td>
              <td className="py-3 text-white font-bold">{formatLtv(current.ltv)}</td>
              <td className="py-3 text-slate-300">{formatLtv(tenPct.ltv)}</td>
              <td className="py-3 text-slate-300">{formatLtv(twentyPct.ltv)}</td>
              <td className="py-3 text-amber-300 font-bold">{formatLtv(thirtyPct.ltv)}</td>
            </tr>

            {/* Total Debt row */}
            <tr>
              <td className="py-3 font-semibold text-slate-400 font-sans">Total Debt</td>
              <td className="py-3 text-white font-bold">
                ${current.totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="py-3 text-slate-300">
                ${tenPct.totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="py-3 text-slate-300">
                ${twentyPct.totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="py-3 text-amber-300 font-bold">
                ${thirtyPct.totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* Borrow Health row */}
            <tr>
              <td className="py-3 font-semibold text-slate-400 font-sans">Borrow Health</td>
              <td className="py-3 font-bold text-emerald-400">{formatHf(current.borrowHealth)}</td>
              <td className="py-3 text-emerald-400/80">{formatHf(tenPct.borrowHealth)}</td>
              <td className={`py-3 ${twentyPct.status === 'Safe' ? 'text-emerald-400' : twentyPct.status === 'Warning' ? 'text-amber-400' : 'text-orange-400'}`}>
                {formatHf(twentyPct.borrowHealth)}
              </td>
              <td className={`py-3 font-semibold ${thirtyPct.status === 'Liquidation' ? 'text-red-400' : thirtyPct.status === 'Margin Call' ? 'text-orange-400' : thirtyPct.status === 'Warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatHf(thirtyPct.borrowHealth)}
              </td>
            </tr>

            {/* Risk State row */}
            <tr>
              <td className="py-3 font-semibold text-slate-400 font-sans">Risk State</td>
              <td className="py-3"><StatusBadge s={current} /></td>
              <td className="py-3"><StatusBadge s={tenPct} /></td>
              <td className="py-3"><StatusBadge s={twentyPct} /></td>
              <td className="py-3"><StatusBadge s={thirtyPct} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Custom scenario summary */}
      <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5 mt-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 text-indigo-400" />
            Combined Stress Scenario
          </span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${custom.statusColor}`}>
            {custom.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Price Drop</div>
            <div className="font-mono text-sm font-bold text-rose-400">-{customPriceDrop}%</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Total Debt</div>
            <div className="font-mono text-sm font-bold text-amber-400">
              ${custom.totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Trust Score</div>
            <div className="font-mono text-sm font-bold text-indigo-400">{custom.simulatedScore}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Borrow Health</div>
            <div className={`font-mono text-sm font-bold ${custom.status === 'Liquidation' ? 'text-red-400' : custom.status === 'Margin Call' ? 'text-orange-400' : 'text-emerald-400'}`}>
              {formatHf(custom.borrowHealth)}×
            </div>
          </div>
        </div>

        {custom.marginCall && !['Liquidation'].includes(custom.status) && (
          <div className="mt-3 text-[10px] text-orange-400/80 bg-orange-500/5 border border-orange-500/10 rounded-lg px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-orange-300">Margin Call Active</strong>
              {gracePeriodHours > 0 && (
                <span className="flex items-center gap-1 text-orange-300 font-mono font-bold">
                  <Clock className="h-3 w-3" />
                  {gracePeriodHours}h grace before liquidation
                </span>
              )}
            </div>
            <p>Debt (${custom.totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}) exceeds capacity (${custom.maxCapacity.toLocaleString(undefined, { maximumFractionDigits: 0 })}) for Score {custom.simulatedScore}.
            {simulatedTier ? ` ${simulatedTier.name} Tier grants ${simulatedTier.gracePeriodHours}h to resolve.` : ' No grace period — resolve immediately.'}</p>
          </div>
        )}
      </div>

      {/* Risk factor legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-[9px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Price Drop → lower collateral value → higher LTV</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Interest → growing debt → higher LTV</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Trust Drop → lower capacity → Margin Call</span>
      </div>
      </div>
      )}
    </div>
  );
}
