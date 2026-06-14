import React from 'react';
import { ShieldCheck, TrendingUp, Activity, Info, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import {
  computeELT,
  computeMarketHealth,
  computeReputationHealth,
  computeBorrowHealth,
  computeMaxBorrowLTV,
  computeMaxBorrowCapacity,
  borrowHealthStatus,
  getTrustTier,
  computeGracePeriodHours,
} from '@/lib/store/trustStore';
import { TrustTierBadge } from './TrustTierBadge';
import { LendingEngine } from '@/lib/store/borrowEngine';

interface BorrowHealthMonitorProps {
  collateralValue: number;
  debtValue: number;         // principal debt only
  accruedInterest?: number;  // interest accrued on top of principal
  trustScore: number;
  marginCall?: boolean;
  gracePeriodHours?: number; // override from active position
  marginCallAt?: number;     // timestamp when margin call was issued
  engine?: LendingEngine;
}

function formatFactor(val: number): string {
  if (!isFinite(val) || isNaN(val)) return '∞';
  if (val > 99) return '99.0+';
  return val.toFixed(2);
}

export default function BorrowHealthMonitor({
  collateralValue,
  debtValue,
  accruedInterest = 0,
  trustScore,
  marginCall = false,
  gracePeriodHours: gracePeriodHoursProp,
  marginCallAt,
  engine,
}: BorrowHealthMonitorProps) {
  const totalDebt = debtValue + accruedInterest;
  const elt = engine ? engine.elt : computeELT(trustScore);
  const tier = getTrustTier(trustScore);
  const gracePeriodHours = gracePeriodHoursProp ?? computeGracePeriodHours(trustScore);
  const maxBorrowLTV = computeMaxBorrowLTV(trustScore);
  const maxBorrow = engine ? engine.maxBorrowCapacity : computeMaxBorrowCapacity(collateralValue, trustScore);
  const ltv = engine ? engine.ltv : (collateralValue > 0 ? (totalDebt / collateralValue) * 100 : 0);

  const marketHealth = computeMarketHealth(collateralValue, totalDebt);
  const reputationHealth = computeReputationHealth(trustScore);
  const borrowHealth = engine ? engine.borrowHealth : computeBorrowHealth(collateralValue, totalDebt, trustScore);
  const baseStatus = engine ? engine.status : borrowHealthStatus(borrowHealth);

  const available = Math.max(0, maxBorrow - totalDebt);

  // Resolve overall display status considering margin call
  const isMarginCall = marginCall && baseStatus !== 'High Risk' && baseStatus !== 'Collateral Requirement Not Met';
  const displayStatus: 'Healthy' | 'Moderate Risk' | 'Margin Call' | 'High Risk' | 'Collateral Requirement Not Met' =
    engine && !engine.isValid
      ? 'Collateral Requirement Not Met'
      : baseStatus === 'High Risk'
      ? 'High Risk'
      : isMarginCall
      ? 'Margin Call'
      : (baseStatus === 'Insufficient Collateral' || baseStatus === 'Collateral Requirement Not Met'
         ? 'Collateral Requirement Not Met'
         : baseStatus);

  const statusConfig = {
    Healthy: {
      badge: '🟢 Healthy Position',
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5',
      barColor: 'bg-emerald-500',
    },
    'Moderate Risk': {
      badge: '🟡 Moderate Risk',
      color: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
      barColor: 'bg-amber-500',
    },
    'Margin Call': {
      badge: '🟠 Margin Call',
      color: 'text-orange-400',
      border: 'border-orange-500/20',
      bg: 'bg-orange-500/5',
      barColor: 'bg-orange-500',
    },
    'High Risk': {
      badge: '🔴 High Risk',
      color: 'text-rose-400',
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/5',
      barColor: 'bg-rose-500',
    },
    'Collateral Requirement Not Met': {
      badge: '❌ Collateral Requirement Not Met',
      color: 'text-rose-500',
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/5',
      barColor: 'bg-rose-500/20',
    },
  };

  const cfg = statusConfig[displayStatus];

  const bhClamped = Math.min(3, Math.max(0, isFinite(borrowHealth) ? borrowHealth : 3));
  const barWidth = engine && !engine.isValid ? 0 : (bhClamped / 3) * 100;

  // Debt breakdown percentages
  const principalPct = totalDebt > 0 ? (debtValue / totalDebt) * 100 : 100;
  const interestPct = totalDebt > 0 ? (accruedInterest / totalDebt) * 100 : 0;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 backdrop-blur-sm shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-violet-400" />
            Borrow Health Monitor
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Position risk driven by collateral value, outstanding debt, and reputation-protected collateral requirements.
          </p>
        </div>
        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${cfg.color} ${cfg.border} ${cfg.bg}`}>
          {cfg.badge}
        </span>
      </div>

      {/* Three Risk Factor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Risk Factor 1: Collateral Value */}
        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Collateral Value</span>
            <TrendingUp className="h-3 w-3 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {formatFactor(marketHealth)}<span className="text-xs text-slate-400">×</span>
          </div>
          <p className="text-[9px] text-slate-500 leading-tight">
            Baseline safety vs. debt at 80% standard LTV. Liquidates at 1.0×.
          </p>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-slate-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (Math.min(3, isFinite(marketHealth) ? marketHealth : 3) / 3) * 100)}%` }}
            />
          </div>
        </div>

        {/* Risk Factor 2: Outstanding Debt (principal + interest) */}
        <div className="bg-slate-950/60 border border-amber-500/10 rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-amber-400/80 uppercase tracking-wider">Outstanding Debt</span>
            <Clock className="h-3 w-3 text-amber-400/70" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">
            ${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          {accruedInterest > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] font-mono text-slate-500">
                <span>Principal</span>
                <span className="text-slate-400">${debtValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full flex rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600 transition-all duration-500" style={{ width: `${principalPct}%` }} />
                  <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${interestPct}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-[8px] font-mono text-slate-500">
                <span className="text-orange-400/80">+Interest</span>
                <span className="text-orange-400">+${accruedInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-slate-500 leading-tight">
              Interest accrues over time, increasing LTV even without price change.
            </p>
          )}
        </div>

        {/* Risk Factor 3: Reputation Score Degradation */}
        <div className="bg-slate-950/60 border border-indigo-500/10 rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider">Reputation Score</span>
            <ShieldCheck className="h-3 w-3 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300">
            {reputationHealth.toFixed(0)}<span className="text-xs text-indigo-400/70">%</span>
          </div>
          <p className="text-[9px] text-slate-550 leading-tight">
            Your collateral is your reputation. A lower score increases requirements and reduces Borrow Health.
          </p>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500"
              style={{ width: `${reputationHealth}%` }}
            />
          </div>
        </div>
      </div>




      {/* Margin Call Alert */}
      {isMarginCall && (
        <div className="border border-orange-500/20 bg-orange-500/5 rounded-xl p-3 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-orange-300">Margin Call Active</p>
              {gracePeriodHours > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                  <Clock className="h-3 w-3" />
                  {gracePeriodHours}h grace window
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 leading-tight">
              Outstanding debt exceeds capacity. 
              <strong className={tier ? tier.color.text : 'text-white'}>{tier ? tier.name : ''} Tier</strong> grants a{' '}
              <strong className="text-orange-300">{gracePeriodHours > 0 ? `${gracePeriodHours}h grace` : 'no grace'}</strong> window. Liquidation at <strong className="text-white">1.0×</strong>.
            </p>
          </div>
        </div>
      )}

      {/* How liquidation works info box */}
      <div className="border border-indigo-500/10 bg-indigo-500/5 rounded-lg p-2.5 flex gap-2">
        <Info className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1.5 flex-1">
          <p className="text-[10px] font-semibold text-indigo-300 leading-none">How the three risk factors work</p>
          <div className="space-y-1 text-[9px] text-slate-400 leading-relaxed">
            <div className="flex gap-1.5">
              <span className="text-slate-300 font-semibold shrink-0">①</span>
              <span><strong className="text-slate-300 font-medium">Collateral Price Drop</strong> — A falling collateral value increases LTV, pushing your Borrow Health toward the 1.0× liquidation threshold.</span>
            </div>
            <div className="flex gap-1.5">
              <span className="text-slate-300 font-semibold shrink-0">②</span>
              <span><strong className="text-slate-300 font-medium">Accrued Interest</strong> — Outstanding debt grows over time, increasing LTV even if the collateral price stays constant.</span>
            </div>
            <div className="flex gap-1.5">
              <span className="text-slate-300 font-semibold shrink-0">③</span>
              <span><strong className="text-slate-300 font-medium">Reputation Score Degradation</strong> — Your collateral is your reputation. A lower Reputation Score increases collateral requirements and reduces Borrow Health. Positions below the required threshold receive a <strong className="text-orange-300">Margin Call</strong>. Liquidation occurs only when Borrow Health falls below <strong className="text-white">1.0×</strong>.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
