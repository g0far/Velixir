import React from 'react';
import { Layers, Plus, Minimize2, AlertTriangle, Clock } from 'lucide-react';
import { Position } from '@/lib/types/borrow';
import { TrustTierBadge } from './TrustTierBadge';
import { computeGracePeriodHours } from '@/lib/store/trustStore';
import { TokenLogo } from '@/lib/store/assetMetadata';

interface OpenPositionsProps {
  positions: Position[];
  onAddCollateral: (id: string) => void;
  onRepay: (id: string) => void;
  onClose: (id: string) => void;
  onForceClose: (id: string) => void;
  wrongNetwork?: boolean;
}

export default function OpenPositions({
  positions,
  onAddCollateral,
  onRepay,
  onClose,
  onForceClose,
  wrongNetwork = false,
}: OpenPositionsProps) {
  const getStatusBadge = (status: Position['status']) => {
    switch (status) {
      case 'Healthy':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15';
      case 'Moderate Risk':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/15';
      case 'Margin Call':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/15';
      case 'High Risk':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/15';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/15';
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-violet-400" />
            Open Credit Positions
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Real-time statuses of your verified active collateralized and under-collateralized loan positions.
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-white/5 font-semibold">
          Active: {positions.length}
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-white/5 rounded-xl bg-slate-950/20">
          <Layers className="h-10 w-10 text-slate-600 mb-3 animate-pulse" />
          <p className="text-sm font-semibold text-slate-300">No Active Borrows</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Use the liquidity board panel on the right side to establish a new borrowing position.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 font-mono text-slate-500 text-[10px] uppercase tracking-wider">
                <th className="py-2 px-2">Collateral</th>
                <th className="py-2 px-2">Debt</th>
                <th className="py-2 px-2">LTV Ratio</th>
                <th className="py-2 px-2">Health Factor</th>
                <th className="py-2 px-2">Net APR</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-slate-300">
              {positions.map((pos) => {
                const accruedInterest = pos.accruedInterest ?? 0;
                const totalDebt = pos.borrowAmount + accruedInterest;
                const posScore = pos.trustScore ?? 500;
                const grace = pos.gracePeriodHours ?? computeGracePeriodHours(posScore);
                return (
                  <tr key={pos.id} className={`hover:bg-white/[0.02] transition-colors ${pos.status === 'Margin Call' ? 'bg-orange-500/[0.02]' : ''}`}>
                     <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <TokenLogo symbol={pos.collateralAsset} size={20} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-white font-sans">{pos.collateralAmount} {pos.collateralAsset}</span>
                          <span className="text-[10px] text-slate-500">Deposit locked</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <TokenLogo symbol={pos.borrowAsset} size={20} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{formatCurrency(totalDebt)}</span>
                          {accruedInterest > 0 ? (
                            <span className="text-[10px] text-orange-400/80">
                              +{formatCurrency(accruedInterest)} interest
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">{pos.borrowAsset} liability</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="font-bold text-indigo-400">{pos.ltv.toFixed(0)}%</span>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                        pos.healthFactor >= 2.0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                          : pos.healthFactor >= 1.2
                          ? 'bg-amber-500/10 text-amber-400 border-indigo-500/15'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/15'
                      }`}>
                        {pos.healthFactor === Infinity ? '∞' : pos.healthFactor.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-indigo-300 font-mono">{pos.rate.toFixed(1)}% APY</span>
                        <TrustTierBadge trustScore={posScore} size="sm" />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(pos.status)}`}>
                           {pos.status}
                        </span>
                        {pos.status === 'Margin Call' && (
                          <div className="space-y-0.5">
                            <span className="flex items-center gap-1 text-[9px] text-orange-400/70 font-sans">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Add collateral or repay
                            </span>
                            {grace > 0 && (
                              <span className="flex items-center gap-1 text-[9px] text-orange-300/80 font-mono font-bold">
                                <Clock className="h-2.5 w-2.5" />
                                {grace}h grace window
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onAddCollateral(pos.id)}
                          disabled={wrongNetwork}
                          title="Add Collateral"
                          className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onRepay(pos.id)}
                          disabled={wrongNetwork}
                          title="Repay Debt"
                          className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Minimize2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onRepay(pos.id)}
                          disabled={wrongNetwork}
                          title="Repay Debt — auto-closes when fully paid"
                          className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:text-white hover:bg-rose-500 border border-rose-500/20 transition-all cursor-pointer text-[11px] font-bold font-mono tracking-wide disabled:opacity-30 disabled:pointer-events-none"
                        >
                          Repay
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
