import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface RequiredCollateralSummaryProps {
  standardCollateralNeeded: number;
  reputationCollateralNeeded: number;
  collateralSaved: number;
  collateralAsset: string;
  collateralPrice: number;
  isReputationMode: boolean;
}

export default function RequiredCollateralSummary({
  standardCollateralNeeded,
  reputationCollateralNeeded,
  collateralSaved,
  collateralAsset,
  collateralPrice,
  isReputationMode
}: RequiredCollateralSummaryProps) {
  
  const stdAssetAmount = collateralPrice > 0 ? standardCollateralNeeded / collateralPrice : 0;
  const repAssetAmount = collateralPrice > 0 ? reputationCollateralNeeded / collateralPrice : 0;
  const savedAssetAmount = collateralPrice > 0 ? collateralSaved / collateralPrice : 0;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 md:p-5 backdrop-blur-sm shadow-sm relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 relative z-10">
        <div>
          <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Required Collateral Summary
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            See how verified reputation reduces collateral requirements compared to traditional DeFi lending.
          </p>
        </div>
        {isReputationMode && collateralSaved > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Reputation Active
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
        {/* Standard */}
        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">Standard Required Collateral</span>
          <div>
            <div className="text-lg font-bold font-display text-slate-400">
              ${Math.round(standardCollateralNeeded).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
              ({stdAssetAmount.toLocaleString('en-US', { maximumFractionDigits: 4 })} {collateralAsset})
            </div>
          </div>
        </div>

        {/* Velixir */}
        <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3 flex flex-col justify-between shadow-inner">
          <span className="text-[9px] font-mono text-indigo-400 uppercase block mb-1">Velixir Required Collateral</span>
          <div>
            <div className="text-lg font-bold font-display text-emerald-400">
              ${Math.round(reputationCollateralNeeded).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[9px] text-indigo-300/70 font-mono mt-0.5">
              ({repAssetAmount.toLocaleString('en-US', { maximumFractionDigits: 4 })} {collateralAsset})
            </div>
          </div>
        </div>

        {/* Savings */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[9px] font-mono text-emerald-500 uppercase block mb-1">Capital Saved</span>
          <div>
            <div className="text-lg font-bold font-display text-emerald-400">
              ${Math.round(collateralSaved).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[9px] text-emerald-500/70 font-mono mt-0.5">
              ({savedAssetAmount.toLocaleString('en-US', { maximumFractionDigits: 4 })} {collateralAsset})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
