import React, { useState, useEffect } from 'react';
import { Sparkles, Coins, CheckCircle, RefreshCcw, Clock, AlertTriangle } from 'lucide-react';
import { Asset } from '@/lib/types/borrow';
import { useWalletStore, BASE_SEPOLIA_CHAIN_ID } from '@/lib/store/walletStore';
import { useBalanceStore } from '@/lib/store/balanceStore';
import { toast } from '@/lib/store/toastStore';
import { computeELT, borrowHealthStatus, getTrustTier, computeTierAPY, computeGracePeriodHours, BASE_INTEREST_RATE } from '@/lib/store/trustStore';
import { TrustTierBadge } from './TrustTierBadge';
import { TokenLogo, ASSET_METADATA } from '@/lib/store/assetMetadata';
import { LendingEngine } from '@/lib/store/borrowEngine';
import InterestCostBreakdown from './InterestCostBreakdown';

const LOAN_MIN = 10000;
const LOAN_MAX = 1000000;

interface BorrowPanelProps {
  collateralAssets: Asset[];
  borrowAssets: { symbol: string; name: string; isStable: boolean }[];
  activeCollateral: string;
  setActiveCollateral: (sym: string) => void;
  activeBorrow: string;
  setActiveBorrow: (sym: string) => void;
  collateralAmount: string;
  setCollateralAmount: (val: string) => void;
  borrowAmount: string;
  setBorrowAmount: (val: string) => void;
  healthFactor: number;
  ltv: number;
  liquidationThreshold: number;
  borrowCapacity: number;
  trustScore: number;
  onConfirmBorrow: () => void;
  onConfirmRepay: () => void;
  isReputationMode: boolean;
  engine: LendingEngine;
}

export default function BorrowPanel({
  collateralAssets,
  borrowAssets,
  activeCollateral,
  setActiveCollateral,
  activeBorrow,
  setActiveBorrow,
  collateralAmount,
  setCollateralAmount,
  borrowAmount,
  setBorrowAmount,
  healthFactor,
  ltv,
  liquidationThreshold,
  borrowCapacity,
  trustScore,
  onConfirmBorrow,
  onConfirmRepay,
  isReputationMode,
  engine,
}: BorrowPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [successActionMsg, setSuccessActionMsg] = useState('');
  const [collateralDropdownOpen, setCollateralDropdownOpen] = useState(false);

  // Real wallet balance for the selected collateral token (matches the wallet).
  const connected = useWalletStore((s) => s.connected);
  const isSimulated = useWalletStore((s) => s.isSimulated);
  const walletSol = useWalletStore((s) => s.balance);
  const realBalances = useBalanceStore((s) => s.balances);
  const refreshBalances = useBalanceStore((s) => s.refresh);

  useEffect(() => {
    if (connected && !isSimulated) refreshBalances();
  }, [connected, isSimulated, refreshBalances, activeCollateral]);

  const collateralBalance = (() => {
    if (!connected) return 0;
    const sym = activeCollateral.toUpperCase();
    if (isSimulated) return sym === 'SOL' ? parseFloat(walletSol) || 0 : 0;
    const real = realBalances[sym];
    if (typeof real === 'number') return real;
    return sym === 'SOL' ? parseFloat(walletSol) || 0 : 0;
  })();

  const fmtBalance = (v: number) =>
    v.toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 2 : 4 });

  const chainId = useWalletStore((s) => s.chainId);
  const setModalOpen = useWalletStore((s) => s.setModalOpen);
  const switchToBaseSepolia = useWalletStore((s) => s.switchToBaseSepolia);

  const selectedCollateralAsset = collateralAssets.find(a => a.symbol === activeCollateral) || collateralAssets[0];

  const capPercentageOptions = [50, 60, 70, 80, 90, 100];
  const currentBorrowPct = borrowCapacity > 0 ? Math.round((Number(borrowAmount) / borrowCapacity) * 100) : 0;
  const selectedCapValue = capPercentageOptions.includes(currentBorrowPct) ? currentBorrowPct.toString() : "";

  // Real-time Collateral Requirements Calculation (derived from single source of truth engine)
  const standardCollateralNeeded = engine.standardCollateral;
  const reduction = engine.reduction;
  const reputationCollateralNeeded = engine.velixirCollateral;
  const collateralSaved = engine.capitalSaved;

  const colSymbol = selectedCollateralAsset.symbol;
  const colPrice = selectedCollateralAsset.price;
  const standardColAssetUnits = colPrice > 0 ? (standardCollateralNeeded / colPrice) : 0;
  const reputationColAssetUnits = colPrice > 0 ? (reputationCollateralNeeded / colPrice) : 0;
  const savedColAssetUnits = colPrice > 0 ? (collateralSaved / colPrice) : 0;

  const handleAction = (action: 'borrow' | 'repay') => {
    // Validation: wallet connected -> Base Sepolia -> amount > 0
    if (!connected) {
      toast.error('Wallet not connected', 'Connect a wallet to continue.');
      setModalOpen(true);
      return;
    }
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      toast.error('Wrong network', 'Switch to Solana Devnet to transact.');
      switchToBaseSepolia();
      return;
    }
    if (action === 'borrow') {
      if (Number(borrowAmount) <= 0) {
        toast.error('Invalid amount', 'Enter a loan amount.');
        return;
      }
      if (!engine.isValid) {
        toast.error('Invalid position', engine.validationWarning || 'Check collateral requirements.');
        return;
      }
    } else if (Number(borrowAmount) <= 0) {
      toast.error('Invalid amount', 'Enter an amount to repay.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTxSuccess(true);
      setSuccessActionMsg(action === 'borrow' ? 'Borrow Position Executed!' : 'Repayment Successfully Settled!');
      if (action === 'borrow') {
        onConfirmBorrow();
      } else {
        onConfirmRepay();
      }
      setTimeout(() => setTxSuccess(false), 2500);
    }, 1200);
  };

  const elt = engine.elt;
  const tierAPY = computeTierAPY(trustScore);
  const gracePeriodHours = computeGracePeriodHours(trustScore);
  const tier = getTrustTier(trustScore);

  const getHealthColor = (hf: number) => {
    if (hf === Infinity || isNaN(hf)) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (hf > 1.5) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (hf >= 1.0) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-500 border-rose-500/20 bg-rose-500/5';
  };

  const getHealthBadge = (hf: number) => {
    return borrowHealthStatus(hf);
  };

  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden backdrop-blur-xl shadow-2xl shadow-indigo-500/5 h-fit space-y-6">
      {/* Absolute background element accent */}
      <div className="absolute top-0 right-0 h-[200px] w-[200px] bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="font-display text-base md:text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <Coins className="h-5 w-5 text-indigo-400" />
          Terminal Liquidity Board
        </h3>
        {isReputationMode && (
          <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-400/30 flex items-center gap-0.5 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.1)]">
            <Sparkles className="h-3 w-3" />
            Reputation Active
          </span>
        )}
      </div>

      {txSuccess ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
          <div className="h-20 w-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/15 animate-bounce">
            <CheckCircle className="h-12 w-12" />
          </div>
          <div>
            <h4 className="text-white font-display text-lg font-bold">{successActionMsg}</h4>
            <p className="text-xs text-slate-400 mt-1">Transaction recorded on Solana Devnet</p>
          </div>
          <div className="bg-slate-950/80 px-5 py-2.5 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-2 border border-emerald-500/15">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            Network fee: 0.000005 SOL ($1.5k Rep cap)
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* STEP 1: Select Collateral Asset */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold block mb-1">
              Step 1 — Collateral Asset
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCollateralDropdownOpen(!collateralDropdownOpen)}
                className="w-full py-3.5 px-4 rounded-xl border border-white/10 bg-slate-950/60 text-left transition-all cursor-pointer flex items-center justify-between hover:border-indigo-500/40 hover:bg-slate-950/80 focus:ring-2 focus:ring-indigo-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <TokenLogo symbol={selectedCollateralAsset.symbol} size={20} />
                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold text-white leading-none">
                      {selectedCollateralAsset.symbol}
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-mono mt-1 leading-none">Collateral Asset</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-mono text-indigo-400">${selectedCollateralAsset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      collateralDropdownOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>

              {collateralDropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl p-1.5 z-50 backdrop-blur-xl space-y-1">
                  {collateralAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setActiveCollateral(asset.symbol);
                        setCollateralDropdownOpen(false);
                      }}
                      className={`w-full py-2.5 px-3.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                        activeCollateral === asset.symbol
                          ? 'bg-indigo-600/20 text-white font-bold'
                          : 'text-slate-450 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <TokenLogo symbol={asset.symbol} size={22} />
                        <span>{asset.symbol}</span>
                      </div>
                      <span className="font-mono text-slate-400">${asset.price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: Collateral Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold flex justify-between mb-1">
              <span>Step 2 — Collateral Deposit</span>
              <span className="text-slate-350 normal-case font-semibold flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-[9px]">
                Balance: {connected ? fmtBalance(collateralBalance) : '—'} <TokenLogo symbol={activeCollateral} size={12} /> {activeCollateral}
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3.5 text-base text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                onClick={() => setCollateralAmount(collateralBalance > 0 ? String(collateralBalance) : '')}
                disabled={collateralBalance <= 0}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-indigo-400 hover:text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 px-2.5 py-1 rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Max
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>Value: <span className="text-emerald-455 font-mono font-extrabold">${(Number(collateralAmount || 0) * selectedCollateralAsset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> USD</span>
            </div>
          </div>

          {/* STEP 3: Borrow Asset Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold block mb-1">
              Step 3 — Borrow Stable Asset
            </label>
            <div className="grid grid-cols-2 gap-3">
              {borrowAssets.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => setActiveBorrow(asset.symbol)}
                  className={`py-3 px-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-3 ${
                    activeBorrow === asset.symbol
                      ? 'bg-indigo-600/10 border-indigo-500/80 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-950/60'
                  }`}
                >
                  <TokenLogo symbol={asset.symbol} size={20} />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-extrabold font-mono leading-none">{asset.symbol}</span>
                    <span className="text-[9px] text-slate-400 font-medium tracking-wide mt-1 leading-none">{ASSET_METADATA[asset.symbol]?.fullName || asset.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 4: Borrow Amount Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold flex justify-between mb-1">
              <span>Step 4 — Borrow Size</span>
              <button
                type="button"
                onClick={() => setBorrowAmount(Math.round(borrowCapacity).toString())}
                className="text-indigo-300 hover:text-white font-mono normal-case font-bold bg-indigo-500/10 hover:bg-indigo-500/25 px-2.5 py-0.5 rounded-full border border-indigo-500/20 text-[9px] cursor-pointer transition-all active:scale-[0.95] select-none"
                title="Click to set maximum borrow size"
              >
                Max: ${borrowCapacity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </button>
            </label>
            <div className="relative">
              <input
                type="number"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3.5 text-base text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <select
                value={selectedCapValue}
                onChange={(e) => {
                  const pct = Number(e.target.value) / 100;
                  setBorrowAmount(Math.round(borrowCapacity * pct).toString());
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-350 hover:text-white bg-slate-950 border border-white/10 px-2 py-1.5 rounded-lg cursor-pointer focus:outline-none"
              >
                <option value="" disabled hidden>Select Cap</option>
                <option value="50" className="bg-slate-950 text-white">50% Cap</option>
                <option value="60" className="bg-slate-950 text-white">60% Cap</option>
                <option value="70" className="bg-slate-950 text-white">70% Cap</option>
                <option value="80" className="bg-slate-950 text-white">80% Cap</option>
                <option value="90" className="bg-slate-950 text-white">90% Cap</option>
                <option value="100" className="bg-slate-950 text-white">100% Cap</option>
              </select>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
              <span className="flex items-center gap-1.5 font-medium">
                Borrowing: <span className="text-white font-mono font-extrabold flex items-center gap-1"><TokenLogo symbol={activeBorrow} size={14} /> {activeBorrow}</span>
              </span>
              {isReputationMode && tier ? (
                <span className="flex items-center gap-1.5">
                  <TrustTierBadge trustScore={trustScore} size="sm" showLabel={false} />
                  <span className={`font-mono font-extrabold ${tier.color.text}`}>{tierAPY.toFixed(1)}% APY</span>
                </span>
              ) : (
                <span className="font-medium">APY: <span className="text-amber-400 font-mono font-extrabold">12.5%</span></span>
              )}
            </div>

            {/* Loan Amount Slider */}
            <div className="mt-2">
              <input
                type="range"
                min={0}
                max={borrowCapacity || 0}
                step={borrowCapacity > 10000 ? 1000 : (borrowCapacity > 100 ? 10 : 1)}
                value={Math.min(borrowCapacity || 0, Math.max(0, Number(borrowAmount) || 0))}
                onChange={(e) => setBorrowAmount(e.target.value)}
                disabled={!borrowCapacity || borrowCapacity <= 0}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>$0</span>
                <span className="text-indigo-300 font-black">
                  ${(Number(borrowAmount) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span>${(borrowCapacity || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          {/* Trust Tier Privileges Banner */}
          {isReputationMode && tier && (
            <div className={`rounded-xl border p-3.5 space-y-2 bg-gradient-to-br ${tier.color.bg} ${tier.color.border}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-extrabold uppercase tracking-widest ${tier.color.text}`}>
                  {tier.name} Tier Privileges
                </span>
                <TrustTierBadge trustScore={trustScore} size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center bg-black/10 py-1.5 rounded-lg border border-white/5">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">Reduction</div>
                  <div className={`text-xs font-bold font-mono ${tier.color.text}`}>{(tier.borrowCapacityPct * 100).toFixed(0)}%</div>
                </div>
                <div className="text-center bg-black/10 py-1.5 rounded-lg border border-white/5">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">APY</div>
                  <div className={`text-xs font-bold font-mono ${tier.color.text}`}>{tier.apy.toFixed(1)}%</div>
                </div>
                <div className="text-center bg-black/10 py-1.5 rounded-lg border border-white/5">
                  <div className="text-[9px] font-mono text-slate-400 flex items-center justify-center gap-0.5 uppercase">
                    <Clock className="h-2.5 w-2.5 text-indigo-400" />Grace
                  </div>
                  <div className={`text-xs font-bold font-mono ${tier.color.text}`}>{tier.gracePeriodHours}h</div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time statistics block */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Max Borrow Capacity</span>
              <span className="font-mono font-bold text-indigo-300 text-[13px]">
                ${engine.maxBorrowCapacity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Current LTV</span>
              <span className={`font-mono font-bold text-[13px] ${engine.ltv > engine.elt * 100 ? 'text-red-400 animate-pulse' : engine.ltv > (engine.elt - 0.05) * 100 ? 'text-amber-400' : 'text-indigo-300'}`}>
                {isNaN(engine.ltv) ? '0.0' : engine.ltv.toFixed(1)}%
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium flex items-center">
                Safe Liquidation Threshold
                <span className="group relative cursor-pointer ml-1 text-slate-500 hover:text-indigo-400">
                  ⓘ
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded bg-slate-950 border border-white/10 text-[9px] font-medium text-slate-400 normal-case leading-normal hidden group-hover:block z-50">
                    Maximum debt ratio supported before liquidation risk increases. Your verified reputation extends this threshold.
                  </span>
                </span>
              </span>
              <span className="font-mono font-bold text-violet-400 text-[13px]">
                {(engine.elt * 100).toFixed(0)}%
              </span>
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-white/5 text-xs">
              <span className="text-white font-bold">Borrow Health</span>
              <span className={`font-mono font-extrabold px-3 py-1 rounded-lg border ${!engine.isValid ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : getHealthColor(engine.borrowHealth)} text-[12px] shadow-sm`}>
                {engine.isValid && engine.borrowHealth !== Infinity ? `${engine.borrowHealth.toFixed(2)}× ` : ''}({engine.borrowHealthText})
              </span>
            </div>
          </div>

          {/* Interest Cost Breakdown Preview */}
          {Number(borrowAmount) > 0 && (
            <InterestCostBreakdown
              principal={Number(borrowAmount)}
              apyPercent={isReputationMode ? tierAPY : BASE_INTEREST_RATE}
              compact={true}
            />
          )}

          {/* Validation Warning Banner */}
          {!engine.isValid && engine.validationWarning && (
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-rose-450">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                <span>{engine.validationWarning}</span>
              </div>
              {!engine.isOverCapacity ? (
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono mt-1 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px] leading-none mb-1">Required</span>
                    <span className="font-extrabold text-white">${Math.round(engine.velixirCollateral).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px] leading-none mb-1">Current</span>
                    <span className="font-extrabold text-white">${Math.round(engine.currentCollateralValue).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px] leading-none mb-1">Add Needed</span>
                    <span className="font-extrabold text-rose-400">${Math.round(engine.additionalNeeded).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 leading-normal">
                  Your borrow amount exceeds your maximum borrowing capacity. Please reduce the borrow size or deposit more collateral.
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => handleAction('borrow')}
              disabled={isSubmitting || !collateralAmount || !borrowAmount || !engine.isValid}
              className="py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:pointer-events-none shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer text-center flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                'Borrow Now'
              )}
            </button>
            <button
              onClick={() => handleAction('repay')}
              disabled={isSubmitting || !borrowAmount}
              className="py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-slate-300 bg-slate-950 hover:bg-slate-950/80 hover:text-white border border-white/10 hover:border-white/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-center flex items-center justify-center gap-2"
            >
              Repay Loan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
