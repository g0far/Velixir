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

  // 3D holographic card interactive tilt states
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const [cardShiny, setCardShiny] = useState({ x: 50, y: 50, opacity: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateX = -(y - yc) / 10;
    const rotateY = (x - xc) / 10;

    setCardTilt({ x: rotateX, y: rotateY });
    setCardShiny({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.6
    });
  };

  const handleCardMouseLeave = () => {
    setCardTilt({ x: 0, y: 0 });
    setCardShiny(prev => ({ ...prev, opacity: 0 }));
  };

  // Set mounted true on client and listen to search param changes
  useEffect(() => {
    setMounted(true);
    
    const handleLocationChange = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');

        if (tab) {
          setActiveNavigation(tab);
          setShowSplash(false);
        }

        // Clear query params from URL after applying them once,
        // so navigation is not locked on subsequent clicks.
        if (tab) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    // Run initially
    handleLocationChange();

    // Force borrow mode on this page
    useTrustStore.getState().setReputationMode(true);

    // Listen for back/forward navigation
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  const [activeNavigation, setActiveNavigation] = useState('Borrow');

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
    { id: 'rialo', symbol: 'RLO', name: 'Rialo', price: priceOf('RLO', 1), icon: 'rialo', standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.145 },
    { id: 'usdc_col', symbol: 'USDC', name: 'USD Coin', price: priceOf('USDC', 1.00), icon: 'usdc', standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.048 },
    { id: 'usdt_col', symbol: 'USDT', name: 'Tether USD', price: priceOf('USDT', 1.00), icon: 'usdt', standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.048 },
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
          toast.success('On-chain confirmed', `View on Solscan: ${explorerTxUrl(sig)}`);
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
        toast.success('On-chain confirmed', `View on Solscan: ${explorerTxUrl(sig)}`);
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
        {mounted && showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        {/* Dynamic Header */}
        <Header activeTab={activeNavigation} setActiveTab={setActiveNavigation} />

      {/* Main Page Area */}
      {activeNavigation === 'Home' || activeNavigation === 'Borrow' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
          {/* Hero Banner Section */}
          <div className="relative rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-950/40 via-slate-900 to-slate-950 border border-white/5 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
            <div className="absolute top-0 right-1/4 h-[300px] w-[300px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-10 h-[150px] w-[200px] bg-violet-600/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-violet-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm animate-pulse">
                Under-Collateralized Lending
              </span>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Borrow With Reputation Power
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                DeFi credit lines designed around decentralized reputation, trust certificates, and verifiable credentials. Reduce collateral requirements and unlock greater capital efficiency through verified trust.
              </p>
            </div>

            {/* Tier badge */}
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              {currentTier && (
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
          <Metrics
            score={trustScore}
            borrowPower={Math.round(computeMaxBorrowLTV(trustScore) * 100)}
            credentials={credentials}
            activeReductionSum={activeReductionSum}
            trustStrength={Math.min(100, Math.round(60 + (activeReductionSum / 0.30) * 40))}
          />

          {/* Two-Column Work Grid */}
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
            <div 
              className="relative bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-purple-950/40 p-6 rounded-3xl border border-indigo-500/20 space-y-4 overflow-hidden shadow-[0_0_50px_-12px_rgba(99,102,241,0.2)] hover:shadow-[0_0_50px_-6px_rgba(99,102,241,0.4)] cursor-pointer group hover:border-indigo-500/40 transition-all duration-300"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{
                transform: `perspective(1000px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
                transformStyle: 'preserve-3d',
                transition: cardTilt.x === 0 && cardTilt.y === 0 ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.3s ease, box-shadow 0.3s ease' : 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              {/* Holographic shimmer effect overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-color-dodge"
                style={{
                  background: `radial-gradient(circle 220px at ${cardShiny.x}% ${cardShiny.y}%, rgba(255, 255, 255, 0.22) 0%, rgba(99, 102, 241, 0.15) 30%, rgba(168, 85, 247, 0.1) 60%, transparent 100%)`,
                  opacity: cardShiny.opacity,
                  zIndex: 10,
                }}
              />
              
              {/* Diagonal holographic rainbow sheen */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity duration-300 mix-blend-overlay"
                style={{
                  backgroundImage: 'linear-gradient(135deg, rgba(255,0,128,0.1) 0%, rgba(128,0,255,0.1) 25%, rgba(0,128,255,0.1) 50%, rgba(0,255,128,0.1) 75%, rgba(255,255,0,0.1) 100%)',
                  backgroundSize: '200% 200%',
                  backgroundPosition: `${cardShiny.x}% ${cardShiny.y}%`,
                  zIndex: 2,
                }}
              />

              {/* Decorative Tech Grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-0" />
              <div className="absolute -right-16 -top-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none z-0" />
              <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none z-0" />

              {/* Card Header (Depth Pop) */}
              <div 
                className="flex justify-between items-center relative z-10"
                style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}
              >
                <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Velixir DecentID Card
                </span>
                <Fingerprint className="h-6 w-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              </div>

              {/* Card Chips & Sensor Graphic */}
              <div 
                className="flex items-center gap-3 pt-2 relative z-10"
                style={{ transform: 'translateZ(20px)' }}
              >
                {/* Microchip representation */}
                <div className="w-9 h-7 rounded bg-gradient-to-br from-amber-500/40 via-yellow-600/30 to-amber-700/40 border border-amber-500/30 relative overflow-hidden flex flex-col justify-between p-1">
                  <div className="w-full h-[1px] bg-amber-400/20" />
                  <div className="flex justify-between">
                    <div className="w-1.5 h-full bg-amber-400/20 border-r border-amber-400/20" />
                    <div className="w-1.5 h-full bg-amber-400/20 border-l border-amber-400/20" />
                  </div>
                  <div className="w-full h-[1px] bg-amber-400/20" />
                </div>
                {/* Contactless symbol */}
                <svg className="w-4 h-4 text-slate-500/80 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              {/* Card Body Data (Depth Pop) */}
              <div 
                className="pt-4 space-y-3 relative z-10"
                style={{ transform: 'translateZ(15px)', transformStyle: 'preserve-3d' }}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">HOLDER ID</span>
                  <span className="font-mono font-bold text-white text-[11px] bg-slate-950/60 px-2 py-0.5 rounded border border-white/5 shadow-inner">0x71C7...6E9a</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">SCORE REGISTERED</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm">{trustScore} <span className="text-slate-500 text-xs font-normal">/ 1000</span></span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">TRUST TIER</span>
                  <div className="scale-95 origin-right">
                    <TrustTierBadge trustScore={trustScore} size="sm" />
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">BORROW APY</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded bg-slate-950/40 border border-white/5 ${currentTier ? currentTier.color.text : 'text-amber-400'}`}>
                    {calculatedBorrowRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">GRACE PERIOD</span>
                  <span className="font-mono text-indigo-300 font-bold px-2 py-0.5 rounded bg-indigo-950/20 border border-indigo-500/10">
                    {currentTier ? `${currentTier.gracePeriodHours}h` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">VERIFIED ATTRIBUTES</span>
                  <span className="text-slate-200 font-semibold bg-slate-950/40 px-2 py-0.5 rounded border border-white/5">{credentials.filter((c) => c.active).length} of 5 Factors</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">Credential Attestors &amp; Ledger Registry</h3>
              <div className="divide-y divide-white/5">
                {[
                  { id: 'credit_score', name: 'Sovereign Beacon Bureau', cert: 'Equifax DID-Attest v2', validity: '365 Days Valid' },
                  { id: 'kyc', name: 'Coinbase Identity Registry', cert: 'Passport Verifiable Attestation', validity: 'Lifetime Valid' },
                  { id: 'banking', name: 'Sovereign Bank Node Ledger', cert: 'Plaid Token Attestation v1', validity: '180 Days Valid' },
                  { id: 'onchain', name: 'Solana Reputation Ledger', cert: 'Rialo/Aave History Attestation', validity: 'Lifetime Valid' },
                  { id: 'consent', name: 'Decentralized Credit Consent Registry', cert: 'Equifax Credit Consent Certificate', validity: '365 Days Valid' },
                ].map((att) => {
                  const cred = credentials.find((c) => c.id === att.id);
                  const isActive = cred?.active ?? false;
                  return (
                    <div key={att.id} className="flex justify-between items-center py-3 text-xs">
                      <div>
                        <p className="font-semibold text-white">{att.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{att.cert}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-300">{att.validity}</span>
                        <span className={`block text-[10px] font-mono font-bold mt-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isActive ? 'Active' : 'Not Verified'}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
