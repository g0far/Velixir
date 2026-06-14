import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Equal } from 'lucide-react';

interface ReputationEngineFormulaProps {
  collateralValue: number;       // total collateral USD value
  score: number;                 // current reputation score e.g. 865
  isReputationMode: boolean;
  totalReduction: number;        // e.g. 0.30
}

export default function ReputationEngineFormula({
  collateralValue,
  score,
  isReputationMode,
  totalReduction,
}: ReputationEngineFormulaProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Compute live breakdown segments aligning to the "Unlock Borrowing Power Up To 110%" narrative.
  // 1) Base collateral capability: Collateral * Standard LTV (80% — traditional baseline)
  const baseLTV = 0.80;
  const baseCollateralCap = collateralValue * baseLTV;

  // 2) Max reputation boost is 30% LTV (totaling 110% LTV).
  // This is split into:
  // - Credential Bonus (up to 10% LTV, proportional to totalReduction / 0.30)
  // - Score Boost (up to 20% LTV, taking the rest of the reputation score leverage)
  const maxReputationLTVBoost = 0.30;
  const totalLTVBoost = isReputationMode ? maxReputationLTVBoost * ((score - 300) / 700) : 0;

  const credentialLTVBoost = isReputationMode ? 0.10 * (totalReduction / 0.30) : 0;
  const scoreLTVBoost = Math.max(0, totalLTVBoost - credentialLTVBoost);

  // Values in USD
  const scoreBoostUSD = collateralValue * scoreLTVBoost;
  const credentialBonusUSD = collateralValue * credentialLTVBoost;
  const totalBorrowPower = baseCollateralCap + scoreBoostUSD + credentialBonusUSD;
  const totalLTVPercent = (baseLTV + scoreLTVBoost + credentialLTVBoost) * 100;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl transition-all">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] select-none"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Cpu className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Velixir Reputation Engine
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              Formula: Borrow Power = Standart Cap (80% LTV) + Score Boost (up to +20%) + Credential Bonus (up to +10%)
            </p>
          </div>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-6 pt-0 border-t border-white/5 space-y-6">
          <div className="pt-4 flex flex-col items-center justify-center text-center max-w-xl mx-auto">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Live Algorithmic State
            </h4>

            {/* Formula Block visualization */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/80 px-6 py-4.5 rounded-xl border border-white/5 mt-3 font-mono">
              <div className="text-center flex-1">
                <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold tracking-wider">Standart Cap (80% LTV)</div>
                <div className="text-sm font-extrabold text-slate-300 mt-1">
                  ${baseCollateralCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>

              <div className="text-slate-650 font-extrabold text-xs select-none py-1 md:py-0">+</div>

              <div className="text-center flex-1">
                <div className="text-[10px] text-indigo-400 uppercase font-sans font-semibold tracking-wider">
                  Score Boost (+{(scoreLTVBoost * 100).toFixed(1)}% LTV)
                </div>
                <div className="text-sm font-extrabold text-indigo-300 mt-1">
                  ${scoreBoostUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>

              <div className="text-slate-655 font-extrabold text-xs select-none py-1 md:py-0">+</div>

              <div className="text-center flex-1">
                <div className="text-[10px] text-emerald-400 uppercase font-sans font-semibold tracking-wider">
                  Credential Bonus (+{(credentialLTVBoost * 100).toFixed(1)}% LTV)
                </div>
                <div className="text-sm font-extrabold text-emerald-300 mt-1">
                  ${credentialBonusUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {/* Equals arrow pointing to final value */}
            <div className="flex flex-col items-center justify-center my-3">
              <Equal className="h-5 w-5 text-indigo-500/50" />
            </div>

            {/* Total Capability Indicator */}
            <div className="bg-gradient-to-tr from-violet-600/20 via-indigo-600/10 to-transparent border border-indigo-500/20 px-8 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/5">
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-semibold block">
                Total Live Borrow Power ({totalLTVPercent.toFixed(1)}% LTV)
              </span>
              <span className="text-3xl font-extrabold font-display text-white mt-1 block">
                ${totalBorrowPower.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 mt-2 text-center">
            *This protocol evaluation formula operates fully on-chain. Disconnecting credentials or experiencing credit rating drops recalculates parameter allocations instantly to protect depositor safety pools.
          </p>
        </div>
      )}
    </div>
  );
}

