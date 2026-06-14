"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '@/components/borrow/Header';
import SplashScreen from '@/components/borrow/SplashScreen';
import Metrics from '@/components/borrow/Metrics';
import TrustBuilder from '@/components/borrow/TrustBuilder';

import BorrowPanel from '@/components/borrow/BorrowPanel';
import CollateralReductionBreakdown from '@/components/borrow/CollateralReductionBreakdown';
import BorrowHealthMonitor from '@/components/borrow/BorrowHealthMonitor';
import RequiredCollateralSummary from '@/components/borrow/RequiredCollateralSummary';
import OpenPositions from '@/components/borrow/OpenPositions';
import LiquidationRiskSimulator from '@/components/borrow/LiquidationRiskSimulator';
import ReputationEngineFormula from '@/components/borrow/ReputationEngineFormula';

import Toaster from '@/components/borrow/Toaster';
import WalletModal from '@/components/borrow/WalletModal';
import AmountModal from '@/components/borrow/AmountModal';
import PortfolioSection from '@/components/borrow/PortfolioSection';
import { Asset, Position } from '@/lib/types/borrow';
import { ChevronRight, BarChart3, Fingerprint, AlertTriangle } from 'lucide-react';

import { useTrustStore, DEFAULT_CREDENTIALS, selectReductionSum, selectTrustScore, selectCollateralRatio, selectInterestRate, selectApprovalChance, computeELT, computeMaxBorrowLTV, computeMaxBorrowCapacity, computeBorrowHealth, STANDARD_BORROW_LTV, getTrustTier, TRUST_TIERS, BASE_INTEREST_RATE, computeTierAPY, BASE_COLLATERAL_RATIO } from '@/lib/store/trustStore';
import { computeLendingEngine, STANDARD_COLLATERAL_RATIO_FACTOR } from '@/lib/store/borrowEngine';
import { TrustTierCard, TrustTierBadge } from '@/components/borrow/TrustTierBadge';
import { useBorrowStore } from '@/lib/store/borrowStore';
import { useOracleStore } from '@/lib/store/oracleStore';
import { toast } from '@/lib/store/toastStore';
import { useWalletStore } from '@/lib/store/walletStore';
import { sendActionTx, waitForReceipt, explorerTxUrl, type OnChainAction } from '@/lib/wallet';
import { sendRialoAction, RIALO_POOLS, type RialoSymbol, type RialoAction } from '@/lib/rialoProgram';

// Map the dApp's borrow actions to real on-chain program instructions. When a
// mapping exists and the asset has a pool, submitOnChain calls the deployed
// Rialo-Devnet program; otherwise it falls back to a memo-recorded tx — the
// borrow concept/UX stays exactly the same.
const RIALO_PROGRAM_IX: Partial<Record<OnChainAction, RialoAction>> = {
  ADD_COLLATERAL: 'deposit',
  BORROW: 'borrow',
  REPAY: 'repay',
  CLOSE: 'withdraw',
};
import { useReputationStore } from '@/lib/store/reputationStore';
import { saveWalletProfile, getWalletProfile } from '@/lib/store/profileRegistryStore';
import { useHistoryStore } from '@/lib/store/historyStore';
import LendingSupplySection from '@/components/borrow/LendingSupplySection';
import { executeTreasuryBorrow, TreasuryUnavailableError, type BorrowSettleRequest } from '@/lib/swap';
import { useBalanceStore } from '@/lib/store/balanceStore';
import VelixirFooter from '@/components/main/VelixirFooter';

export default function BorrowPage() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Set mounted true on client and listen to search param changes
  useEffect(() => {
    setMounted(true);
    
    const handleLocationChange = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const mode = params.get('mode');

        if (tab) {
          setActiveNavigation(tab);
        }
        if (mode === 'lending') {
          useTrustStore.getState().setReputationMode(false);
        } else if (mode === 'borrow') {
          useTrustStore.getState().setReputationMode(true);
        }

        // Clear query params from URL after applying them once,
        // so navigation is not locked on subsequent clicks.
        if (tab || mode) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    // Run initially
    handleLocationChange();

    // Listen for back/forward navigation
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  const [activeNavigation, setActiveNavigation] = useState('Lending&Borrow');

  // ---- Trust Credentials Engine (persisted) ----
  const credentials = useTrustStore((s) => s.credentials);
  const isReputationMode = useTrustStore((s) => s.isReputationMode);
  const toggleCredential = useTrustStore((s) => s.toggleCredential);
  const setReputationMode = useTrustStore((s) => s.setReputationMode);

  // ---- Borrow store (positions + form, persisted) ----
  const positions = useBorrowStore((s) => s.positions);
  const activeCollateral = useBorrowStore((s) => s.activeCollateral);
  const activeBorrow = useBorrowStore((s) => s.activeBorrow);
  const collateralAmount = useBorrowStore((s) => s.collateralAmount);
  const borrowAmount = useBorrowStore((s) => s.borrowAmount);
  const setActiveCollateral = useBorrowStore((s) => s.setActiveCollateral);
  const setActiveBorrow = useBorrowStore((s) => s.setActiveBorrow);
  const setCollateralAmount = useBorrowStore((s) => s.setCollateralAmount);
  const setBorrowAmount = useBorrowStore((s) => s.setBorrowAmount);
  const createPosition = useBorrowStore((s) => s.createPosition);
  const addCollateral = useBorrowStore((s) => s.addCollateral);
  const repay = useBorrowStore((s) => s.repay);
  const closePosition = useBorrowStore((s) => s.closePosition);
  const forceClose = useBorrowStore((s) => s.forceClose);

  // ---- Mock Oracle (live price feed) ----
  const prices = useOracleStore((s) => s.prices);
  const startOracle = useOracleStore((s) => s.start);
  const stopOracle = useOracleStore((s) => s.stop);
  
  useEffect(() => {
    if (mounted && !showSplash) {
      startOracle();
      return () => stopOracle();
    }
  }, [mounted, showSplash, startOracle, stopOracle]);

  // Settle accrued interest on active positions when prices update
  useEffect(() => {
    if (mounted && !showSplash) {
      const activePositions = useBorrowStore.getState().positions;
      activePositions.forEach((p) => {
        const price = prices[p.collateralAsset]?.price;
        if (price) {
          useBorrowStore.getState().accrueInterest(p.id, price);
        }
      });
    }
  }, [prices, mounted, showSplash]);

  const priceOf = (symbol: string, fallback: number) => prices[symbol]?.price ?? fallback;

  // Asset metadata merged with live oracle prices
  const collateralAssets: Asset[] = useMemo(() => [
    { id: 'sol', symbol: 'SOL', name: 'Solana', price: priceOf('SOL', 152.4), icon: 'sol', standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.035 },
    { id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: priceOf('BTC', 95000), icon: 'btc', standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.012 },
    { id: 'rialo', symbol: 'RLO', name: 'Rialo', price: priceOf('RLO', 0.968), icon: 'rialo', standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.145 },
    { id: 'usdc_col', symbol: 'USDC', name: 'USD Coin', price: priceOf('USDC', 1.00), icon: 'usdc', standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.048 },
  ], [prices]);

  const borrowAssets = useMemo(() => [
    { symbol: 'USDC', name: 'USD Coin', isStable: true },
    { symbol: 'USDT', name: 'Tether USD', isStable: true },
  ], []);

  // ---- Trust Credentials Engine derivations ----
  const connected = useWalletStore((s) => s.connected);
  const connectedAddress = useWalletStore((s) => s.connected ? s.address : '');
  const isSimulated = useWalletStore((s) => s.isSimulated);
  const wrongNetwork = useWalletStore((s) => s.isWrongNetwork());
  const activeReductionSum = useMemo(() => {
    if (!connected) return 0;
    return selectReductionSum(credentials, isReputationMode);
  }, [credentials, isReputationMode, connected]);

  const trustScore = useMemo(() => {
    if (!connected) return 0;
    return selectTrustScore(credentials);
  }, [credentials, connected]);

  const approvalChance = useMemo(() => selectApprovalChance(trustScore), [trustScore]);
  const calculatedBorrowRate = useMemo(() => {
    if (!isReputationMode) return BASE_INTEREST_RATE;
    return computeTierAPY(trustScore);
  }, [trustScore, isReputationMode]);
  const currentTier = useMemo(() => isReputationMode ? getTrustTier(trustScore) : null, [trustScore, isReputationMode]);

  // ---- Collateral / capacity math ----
  const currentCollateralAsset = useMemo(
    () => collateralAssets.find((a) => a.symbol === activeCollateral) || collateralAssets[0],
    [activeCollateral, collateralAssets]
  );

  const collateralPrice = currentCollateralAsset.price;

  const engine = useMemo(() => {
    return computeLendingEngine(
      Number(collateralAmount) || 0,
      Number(borrowAmount) || 0,
      trustScore,
      isReputationMode,
      collateralPrice,
      activeReductionSum
    );
  }, [collateralAmount, borrowAmount, trustScore, isReputationMode, collateralPrice, activeReductionSum]);



  const totalCollateralValuation = engine.currentCollateralValue;
  const standardCapacity = engine.standardCapacity;
  const reputationCapacity = engine.reputationCapacity;
  const maxBorrowCapacity = engine.maxBorrowCapacity;
  const currentLtvValue = engine.ltv;
  const currentHealthFactor = engine.borrowHealth;

  const comparisonBorrowAmount = useMemo(() => {
    const amt = Number(borrowAmount) || 0;
    if (amt > 0) return amt;
    return maxBorrowCapacity > 0 ? maxBorrowCapacity : 1000;
  }, [borrowAmount, maxBorrowCapacity]);

  const standardCollateralNeeded = engine.standardCollateral;
  const reputationCollateralNeeded = engine.velixirCollateral;
  const collateralSaved = engine.capitalSaved;
  const capacityIncreasePercent = engine.reduction * 100;
  const collateralRatioPercent = engine.collateralRatioPercent;
  // ---- Live positions: recompute LTV / BorrowHealth from current oracle prices ----
  const livePositions: Position[] = useMemo(() => {
    return positions.map((p) => {
      const meta = collateralAssets.find((a) => a.symbol === p.collateralAsset);
      const price = meta?.price ?? 1;
      const collateralValue = p.collateralAmount * price;
      const positionTrustScore = p.trustScore ?? trustScore;
      const accruedInterest = p.accruedInterest ?? 0;
      const totalDebt = p.borrowAmount + accruedInterest;
      const ltv = collateralValue > 0 ? (totalDebt / collateralValue) * 100 : 0;
      const bh = computeBorrowHealth(collateralValue, totalDebt, positionTrustScore);
      const elt = computeELT(positionTrustScore);
      const maxCapacity = computeMaxBorrowCapacity(collateralValue, positionTrustScore);
      const marginCall = totalDebt > maxCapacity && bh >= 1.0;
      const status: Position['status'] =
        bh < 1.0 ? 'High Risk'
        : marginCall ? 'Margin Call'
        : bh < 1.5 ? 'Moderate Risk'
        : 'Healthy';
      return { ...p, accruedInterest, ltv, healthFactor: bh, status, marginCall, liquidationThreshold: elt };
    });
  }, [positions, collateralAssets, trustScore]);

  // ---- Liquidation / Margin Call warning watcher ----
  useEffect(() => {
    if (mounted && !showSplash) {
      livePositions.forEach((p) => {
        if (p.status === 'High Risk') {
          toast.warning('Liquidation risk', `Position ${p.collateralAmount} ${p.collateralAsset} is below the safe health factor.`);
        } else if (p.status === 'Margin Call') {
          toast.warning('Margin Call', `Position ${p.collateralAmount} ${p.collateralAsset} exceeded reputation capacity — add collateral or repay.`);
        }
      });
    }
  }, [prices, mounted, showSplash]);


  // ---- On-chain submission helper ----
  // Sends a real Solana Devnet transaction (SPL Memo) recording the action when
  // a real Phantom wallet is connected. In a simulated session it resolves true
  // immediately so the demo flow still works without a wallet.
  const submitOnChain = useCallback(
    async (action: OnChainAction, symbol: string, amount: number, toSymbol?: string): Promise<{ ok: boolean; signature?: string }> => {
      // Simulated session (default/dummy wallet): no real wallet to sign with.
      if (isSimulated || !connectedAddress) {
        toast.info('Simulated session', 'Connect Phantom/Solflare to record this borrow on Solana Devnet.');
        return { ok: true };
      }
      try {
        toast.info('Confirm in wallet', `Signing ${action} on Solana Devnet…`);
        let sig: string | undefined;
        const progIx = RIALO_PROGRAM_IX[action];
        if (progIx && symbol in RIALO_POOLS) {
          try {
            sig = await sendRialoAction(progIx, symbol as RialoSymbol, amount);
          } catch {
            // Prerequisite missing (no token account / liquidity / position):
            // fall back so the borrow UX never breaks.
            sig = undefined;
          }
        }
        if (!sig) {
          sig = await sendActionTx({ action, symbol, toSymbol, amount: String(amount), from: connectedAddress });
        }
        toast.info('Transaction submitted', 'Waiting for Devnet confirmation…');
        const { status } = await waitForReceipt(sig);
        if (status === 'success') {
          toast.success('On-chain confirmed', `View on Solana Explorer: ${explorerTxUrl(sig)}`);
          return { ok: true, signature: sig };
        }
        toast.error('Transaction failed', 'The Devnet transaction did not confirm.');
        return { ok: false };
      } catch (err) {
        const e = err as { code?: number; message?: string };
        toast.error('Transaction rejected', e?.message || 'Signing was cancelled.');
        return { ok: false };
      }
    },
    [isSimulated, connectedAddress]
  );

  // ---- Real treasury settlement (moves actual tokens in the wallet) ----
  // Tries the treasury co-signer so borrowed funds land in the wallet and
  // collateral leaves it (visible in Phantom/Solflare). `fellBack=true` means no
  // treasury is configured, so the caller should use submitOnChain instead.
  const settleReal = useCallback(
    async (req: BorrowSettleRequest): Promise<{ ok: boolean; signature?: string; fellBack?: boolean }> => {
      if (isSimulated || !connectedAddress) return { ok: false, fellBack: true };
      try {
        toast.info('Confirm in wallet', 'Sign the transaction on Solana Devnet…');
        const sig = await executeTreasuryBorrow(req);
        toast.success('On-chain confirmed', `View on Solana Explorer: ${explorerTxUrl(sig)}`);
        useBalanceStore.getState().refresh();
        useBalanceStore.getState().refreshSoon();
        return { ok: true, signature: sig };
      } catch (e) {
        if (e instanceof TreasuryUnavailableError) return { ok: false, fellBack: true };
        const err = e as { code?: number; message?: string };
        toast.error('Transaction rejected', err?.message || 'Signing was cancelled.');
        return { ok: false };
      }
    },
    [isSimulated, connectedAddress]
  );

  // ---- Handlers ----
  const handleToggleCredential = (id: string) => {
    if (!connected) {
      toast.warning('Wallet not connected', 'Please connect your wallet to verify credentials.');
      return;
    }
    if (wrongNetwork) {
      toast.error('Wrong Network', 'Please switch to Solana Devnet.');
      return;
    }
    const cred = credentials.find((c) => c.id === id);
    toggleCredential(id);
    if (cred) {
      const willBeActive = !cred.active;
      toast.info(
        willBeActive ? 'Credential verified' : 'Credential disabled',
        `${cred.title} ${willBeActive ? `activated: -${cred.reductionValue * 100}% collateral ratio` : 'removed from your trust profile'}`
      );
    }
  };

  const handleCreateBorrowPosition = async () => {
    if (wrongNetwork) {
      toast.error('Wrong Network', 'Please switch to Solana Devnet.');
      return;
    }
    const amount = Number(borrowAmount) || 0;
    const colAmount = Number(collateralAmount) || 0;
    if (amount <= 0 || colAmount <= 0) return;
    if (!engine.isValid) return;
    // Prefer real treasury settlement (collateral out + loan in); fall back to
    // the program/memo path when no treasury is configured.
    const real = await settleReal({
      user: connectedAddress,
      action: 'borrow',
      collateralSymbol: activeCollateral,
      collateralAmount: colAmount,
      borrowSymbol: activeBorrow,
      borrowAmount: amount,
    });
    let res: { ok: boolean; signature?: string };
    if (real.fellBack) {
      res = await submitOnChain('BORROW', activeBorrow, amount, activeCollateral);
    } else {
      if (!real.ok) return;
      res = { ok: true, signature: real.signature };
    }
    if (!res.ok) return;
    createPosition({
      collateralAsset: activeCollateral,
      collateralAmount: colAmount,
      borrowAsset: activeBorrow,
      borrowAmount: amount,
      ltv: engine.ltv,
      healthFactor: engine.borrowHealth,
      rate: calculatedBorrowRate,
      collateralRatio: Math.round(engine.collateralRatioPercent),
      trustScore,
      txSignature: res.signature,
    });
  };

  const handleRepayLoan = async () => {
    if (wrongNetwork) {
      toast.error('Wrong Network', 'Please switch to Solana Devnet.');
      return;
    }
    if (positions.length === 0) {
      toast.error('No open positions', 'There is no debt to repay.');
      return;
    }
    const target = positions[0];
    const amount = Number(borrowAmount) || 0;
    const real = await settleReal({
      user: connectedAddress,
      action: 'repay',
      borrowSymbol: target.borrowAsset,
      borrowAmount: amount,
    });
    let res: { ok: boolean; signature?: string };
    if (real.fellBack) {
      res = await submitOnChain('REPAY', target.borrowAsset, amount);
    } else {
      if (!real.ok) return;
      res = { ok: true, signature: real.signature };
    }
    if (!res.ok) return;
    const price = collateralAssets.find((a) => a.symbol === target.collateralAsset)?.price ?? 1;
    repay(target.id, amount, price, res.signature);
  };



  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-white relative">
      <div className="absolute inset-0 z-[0] pointer-events-none overflow-hidden h-[800px]">
        <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute md:top-[-240px] lg:top-[-335px] top-[-400px] left-0 w-full h-auto object-cover opacity-40 mix-blend-screen"
        >
            <source src="/blackhole.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030014]/60 to-[#030014] z-10" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 w-full">
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        {/* Dynamic Header */}
        <Header activeTab={activeNavigation} setActiveTab={setActiveNavigation} />

      {/* Main Page Area */}
      {activeNavigation === 'Home' || activeNavigation === 'Lending&Borrow' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
          {/* Hero Banner Section */}
          <div className="relative rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-950/40 via-slate-900 to-slate-950 border border-white/5 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
            <div className="absolute top-0 right-1/4 h-[300px] w-[300px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-10 h-[150px] w-[200px] bg-violet-600/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="space-y-2 max-w-2xl">
              {isReputationMode ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-violet-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm animate-pulse">
                    Under-Collateralized Lending
                  </span>
                  <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Borrow With Reputation Power
                  </h1>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                    DeFi credit lines designed around decentralized reputation, trust certificates, and verifiable credentials. Reduce collateral requirements and unlock greater capital efficiency through verified trust.
                  </p>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm animate-pulse">
                    Velixir Lending Protocol
                  </span>
                  <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Lend Assets, Earn Yield
                  </h1>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                    Supply your crypto assets to Velixir liquidity pools and earn competitive on-chain yield. Your funds fuel under-collateralized loans issued to reputation-verified borrowers — fully non-custodial, transparent, and secured by Solana smart contracts.
                  </p>
                </>
              )}
            </div>

            {/* Reputation Segment Switcher + Tier badge */}
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              {isReputationMode && currentTier && (
                <div className={`w-full md:w-auto flex items-center gap-3 px-4 py-2.5 rounded-xl border ${currentTier.color.bg} ${currentTier.color.border}`}>
                  <div className="flex items-center gap-2">
                    <TrustTierBadge trustScore={trustScore} size="lg" />
                  </div>
                  <div className="flex gap-4 text-[10px] font-mono">
                    <div>
                      <div className="text-slate-500 uppercase">APY</div>
                      <div className={`font-bold ${currentTier.color.text}`}>{currentTier.apy.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase">Reduction</div>
                      <div className={`font-bold ${currentTier.color.text}`}>{(currentTier.borrowCapacityPct * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase">Grace</div>
                      <div className={`font-bold ${currentTier.color.text}`}>{currentTier.gracePeriodHours}h</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-slate-950 p-1.5 rounded-2xl border border-white/5 flex gap-2 w-full">
                <button
                  onClick={() => setReputationMode(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-center text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    !isReputationMode
                      ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-900/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {!isReputationMode && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                  )}
                  Lending
                </button>
                <button
                  onClick={() => setReputationMode(true)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-center text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                    isReputationMode
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Reputation Borrow
                  <span className="text-[8px] tracking-wide font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/20 uppercase font-black ml-1">
                    Trust
                  </span>
                </button>
              </div>
            </div>
          </div>          {/* Wrong Network Warning Banner */}
          {wrongNetwork && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-3 text-left">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 animate-pulse" />
                <div>
                  <div className="text-sm font-bold text-white">Please switch to Solana Devnet</div>
                  <p className="text-xs text-slate-400 mt-0.5">Velixir operates exclusively on Solana Devnet. All features are currently disabled.</p>
                </div>
              </div>
              <button
                onClick={() => useWalletStore.getState().switchToBaseSepolia()}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Switch Network
              </button>
            </div>
          )}

          {/* Metrics Panel Row — only on Reputation Borrow tab */}
          {isReputationMode && (
            <Metrics
              score={trustScore}
              borrowPower={Math.round(computeMaxBorrowLTV(trustScore) * 100)}
              credentials={credentials}
              activeReductionSum={activeReductionSum}
              trustStrength={Math.min(100, Math.round(60 + (activeReductionSum / 0.30) * 40))}
            />
          )}

          {/* Two-Column Work Grid or Centened Single Panel */}
          {isReputationMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-4">
                <TrustBuilder
                  credentials={credentials}
                  onToggle={handleToggleCredential}
                  totalReduction={engine.reduction}
                  collateralSaved={collateralSaved}
                  collateralRatio={collateralRatioPercent}
                  connected={connected}
                  trustScore={trustScore}
                  wrongNetwork={wrongNetwork}
                />

                <ReputationEngineFormula
                  collateralValue={totalCollateralValuation}
                  score={trustScore}
                  isReputationMode={isReputationMode}
                  totalReduction={engine.reduction}
                />

                <RequiredCollateralSummary
                  standardCollateralNeeded={standardCollateralNeeded}
                  reputationCollateralNeeded={reputationCollateralNeeded}
                  collateralSaved={collateralSaved}
                  collateralAsset={activeCollateral}
                  collateralPrice={collateralPrice}
                  isReputationMode={isReputationMode}
                />

                <BorrowHealthMonitor
                  collateralValue={totalCollateralValuation}
                  debtValue={Number(borrowAmount) || 0}
                  accruedInterest={0}
                  trustScore={trustScore}
                  gracePeriodHours={currentTier?.gracePeriodHours}
                  engine={engine}
                />

                <LiquidationRiskSimulator
                  collateralValue={totalCollateralValuation}
                  borrowValue={Number(borrowAmount) || 0}
                  accruedInterest={0}
                  annualRatePct={calculatedBorrowRate}
                  trustScore={trustScore}
                  standardLimitRatio={STANDARD_BORROW_LTV}
                  isReputationMode={isReputationMode}
                />
              </div>

              {/* Right Sticky Sidebar Column */}
              <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
                <BorrowPanel
                  collateralAssets={collateralAssets}
                  borrowAssets={borrowAssets}
                  activeCollateral={activeCollateral}
                  setActiveCollateral={setActiveCollateral}
                  activeBorrow={activeBorrow}
                  setActiveBorrow={setActiveBorrow}
                  collateralAmount={collateralAmount}
                  setCollateralAmount={setCollateralAmount}
                  borrowAmount={borrowAmount}
                  setBorrowAmount={setBorrowAmount}
                  healthFactor={currentHealthFactor}
                  ltv={currentLtvValue}
                  liquidationThreshold={currentCollateralAsset.liquidationThreshold * 100}
                  borrowCapacity={maxBorrowCapacity}
                  trustScore={trustScore}
                  onConfirmBorrow={handleCreateBorrowPosition}
                  onConfirmRepay={handleRepayLoan}
                  isReputationMode={isReputationMode}
                  engine={engine}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.942" />
                      </svg>
                    ),
                    title: 'Earn Passive Yield',
                    desc: 'Supply USDC, SOL or BTC into live pools and watch your balance compound — real yield, paid by protocol borrowers, every single block.',
                    tag: 'Up to 14% APY',
                    iconGrad: 'from-emerald-400 to-teal-600',
                    glow: 'shadow-emerald-500/40',
                    tagCls: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
                    hoverBorder: 'hover:border-emerald-500/40',
                    blob: 'bg-emerald-500/25',
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      </svg>
                    ),
                    title: 'Non-Custodial & Secure',
                    desc: 'Funds stay locked in audited Solana smart contracts. No middleman ever touches your assets — you alone hold the keys to every withdrawal.',
                    tag: 'On-Chain Vault',
                    iconGrad: 'from-sky-400 to-blue-600',
                    glow: 'shadow-blue-500/40',
                    tagCls: 'text-sky-300 bg-sky-500/10 border-sky-400/30',
                    hoverBorder: 'hover:border-sky-500/40',
                    blob: 'bg-sky-500/25',
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 0 0 2.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                      </svg>
                    ),
                    title: 'Reputation-Boosted Rates',
                    desc: 'Trust is alpha. Supplying to reputation-verified borrowers unlocks a yield premium — the higher their score, the better the rate for both sides.',
                    tag: 'Trust Premium',
                    iconGrad: 'from-violet-500 to-fuchsia-600',
                    glow: 'shadow-violet-500/40',
                    tagCls: 'text-violet-300 bg-violet-500/10 border-violet-400/30',
                    hoverBorder: 'hover:border-violet-500/40',
                    blob: 'bg-violet-500/25',
                  },
                ].map((f) => (
                  <div
                    key={f.title}
                    className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900/80 to-slate-900/30 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${f.hoverBorder}`}
                  >
                    {/* hover glow blob */}
                    <div className={`pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full ${f.blob} blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                    {/* top accent line */}
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${f.iconGrad} opacity-0 transition-opacity duration-300 group-hover:opacity-60`} />

                    <div className="relative z-10 space-y-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.iconGrad} flex items-center justify-center text-white shadow-lg ${f.glow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                        {f.icon}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white tracking-tight font-display">{f.title}</h3>
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${f.tagCls}`}>{f.tag}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Lending Pools — supply assets & earn yield */}
              <LendingSupplySection />
            </div>
          )}
        </main>
      ) : activeNavigation === 'Portfolio' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">Your Institutional Credit Portfolio</h1>
              <p className="text-xs text-slate-400">Manage locked assets, active lines of sovereign credit, and your reputation equity balances.</p>
            </div>
            {currentTier && (
              <div className="hidden md:flex items-center gap-3">
                <TrustTierBadge trustScore={trustScore} size="lg" />
                <div className="text-xs font-mono text-slate-400">
                  <span className={currentTier.color.text}>{currentTier.apy.toFixed(1)}% APY</span>
                  <span className="mx-2 text-slate-600">·</span>
                  <span className="text-slate-300">{currentTier.gracePeriodHours}h grace</span>
                </div>
              </div>
            )}
          </div>

          <PortfolioSection />
        </main>
      ) : activeNavigation === 'Reputation' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">Sovereign Financial DecentID Profile</h1>
            <p className="text-xs text-slate-400">Review your verified identity attestations, credit certificates, and reputation keys.</p>
          </div>

          {/* Trust Tier Full Breakdown */}
          <div className="space-y-2">
            <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Trust Tier Privileges</h2>
            <TrustTierCard trustScore={trustScore} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-indigo-500/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-indigo-400">Velixir DecentID Card</span>
                <Fingerprint className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">HOLDER ID</span>
                  <span className="font-mono font-bold text-white text-[11px]">0x71C7...6E9a</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">SCORE REGISTERED</span>
                  <span className="font-mono text-emerald-400 font-bold">{trustScore} / 1000</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">TRUST TIER</span>
                  <TrustTierBadge trustScore={trustScore} size="sm" />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">BORROW APY</span>
                  <span className={`font-mono font-bold ${currentTier ? currentTier.color.text : 'text-amber-400'}`}>
                    {calculatedBorrowRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">GRACE PERIOD</span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {currentTier ? `${currentTier.gracePeriodHours}h` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">VERIFIED ATTRIBUTES</span>
                  <span className="text-slate-300 font-semibold">{credentials.filter((c) => c.active).length} of 5 Factors</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">Credential Attestors &amp; Ledger Registry</h3>
              <div className="divide-y divide-white/5">
                {[
                  { name: 'Sovereign Beacon Bureau', cert: 'Equifax DID-Attest v2', validity: '365 Days Valid', status: 'Active' },
                  { name: 'Coinbase Identity Registry', cert: 'Passport Verifiable Attestation', validity: 'Lifetime Valid', status: 'Active' },
                  { name: 'Sovereign Bank Node Ledger', cert: 'Plaid Token Attestation v1', validity: '180 Days Valid', status: 'Active' },
                ].map((att, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 text-xs">
                    <div>
                      <p className="font-semibold text-white">{att.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{att.cert}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-300">{att.validity}</span>
                      <span className="block text-[10px] font-mono text-indigo-400 font-bold mt-0.5">{att.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tier Progression */}
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3">Tier Progression</p>
                <div className="space-y-2">
                  {TRUST_TIERS.map((tier) => {
                    const isActive = currentTier?.name === tier.name;
                    const isUnlocked = trustScore >= tier.minScore;
                    return (
                      <div
                        key={tier.name}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                          isActive
                            ? `${tier.color.bg} ${tier.color.border}`
                            : isUnlocked
                            ? 'bg-slate-900/40 border-white/5'
                            : 'bg-slate-950/20 border-white/5 opacity-40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <TrustTierBadge trustScore={isActive ? trustScore : (isUnlocked ? tier.minScore : 0)} size="sm" showLabel={true} />
                          <div className="text-[10px] font-mono text-slate-400">Score {tier.minScore}+</div>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono">
                          <div className="text-center">
                            <div className="text-slate-600 uppercase text-[8px]">Reduction</div>
                            <div className={isActive ? tier.color.text : 'text-slate-400'}>{(tier.borrowCapacityPct * 100).toFixed(0)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-600 uppercase text-[8px]">APY</div>
                            <div className={isActive ? tier.color.text : 'text-slate-400'}>{tier.apy.toFixed(1)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-600 uppercase text-[8px]">Grace</div>
                            <div className={isActive ? tier.color.text : 'text-slate-400'}>{tier.gracePeriodHours}h</div>
                          </div>
                          {isActive && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tier.color.bg} ${tier.color.text} border ${tier.color.border}`}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="border border-white/5 bg-slate-900/40 p-12 rounded-3xl text-center space-y-4 max-w-lg mx-auto my-12">
            <BarChart3 className="h-12 w-12 text-indigo-500 mx-auto animate-pulse" />
            <h2 className="text-lg font-bold font-display text-white">Interactive {activeNavigation} Module Active</h2>
            <p className="text-xs text-slate-400 leading-normal">
              This sandbox dashboard simulates standard DeFi borrowing contrasting directly with reputation borrowing capabilities. Toggle components within the Dashboard or Borrow sections to customize the on-chain lending protocols and monitor algorithmic margins.
            </p>
            <button
              onClick={() => setActiveNavigation('Home')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer inline-flex items-center gap-1"
            >
              Back to Dashboard
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </main>
      )}

      {/* Footer */}
      <VelixirFooter />

      {/* Global overlays */}
      </div>
    </div>
  );
}
