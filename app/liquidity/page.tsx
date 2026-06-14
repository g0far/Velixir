"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import VelixirFooter from "@/components/main/VelixirFooter";
import ImportTokens from "@/components/main/ImportTokens";
import { LENDING_POOLS, useLendingStore, computeSupplyAPY } from "@/lib/store/lendingStore";
import { useWalletStore } from "@/lib/store/walletStore";
import { CryptoIcon } from "@/components/borrow/LendingSupplySection";
import { BASE_SEPOLIA_CONFIG } from "@/constants/market";
import { useOracleStore } from "@/lib/store/oracleStore";
import { explorerAddrUrl, shortAddress, sendActionTx, waitForReceipt, explorerTxUrl, type OnChainAction } from "@/lib/wallet";
import { raydiumSwapUrl, RLO_POOL } from "@/lib/raydium";
import { PAIR_POOLS } from "@/constants/pools";
import {
  fetchLendingPools,
  fetchAmmPool,
  fetchPairPools,
  type LendingPoolInfo,
  type AmmPoolInfo,
  type PairPoolInfo,
} from "@/lib/pools";
import { useTrustStore, selectTrustScore, getTrustTier, getReputationTierName, RLO_STAKING_APY, LP_STAKING_APY } from "@/lib/store/trustStore";
import { toast } from "@/lib/store/toastStore";
import Toaster from "@/components/borrow/Toaster";
import { useBalanceStore } from "@/lib/store/balanceStore";
import { Lock, ShieldCheck, TrendingUp, Sparkles, Coins, ArrowUpRight, Loader2, Info, History } from "lucide-react";

const compactUsd = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const compactNum = (value: number, max = 4): string =>
  value.toLocaleString("en-US", { maximumFractionDigits: max });

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function LiquidityPage() {
  const oraclePrices = useOracleStore((s) => s.prices);
  const startOracle = useOracleStore((s) => s.start);
  const stopOracle = useOracleStore((s) => s.stop);

  const [lending, setLending] = useState<LendingPoolInfo[]>([]);
  const [amm, setAmm] = useState<AmmPoolInfo | null>({
    price: 0.968,
    usdcReserve: 250000,
    rloReserve: 258264,
    poolId: RLO_POOL.poolId,
    programId: RLO_POOL.programId,
    usdcMint: RLO_POOL.usdcMint,
    rloMint: RLO_POOL.rloMint,
  });
  const [pairs, setPairs] = useState<PairPoolInfo[]>(
    PAIR_POOLS.map((p) => ({
      ...p,
      reserveA: 5000,
      reserveB: 5000,
    }))
  );
  const [loadingAmm, setLoadingAmm] = useState(false);
  const [loadingPairs, setLoadingPairs] = useState(false);

  const connected = useWalletStore((s) => s.connected);
  const address = useWalletStore((s) => (s.connected ? s.address : ""));
  const isSimulated = useWalletStore((s) => s.isSimulated);
  const walletSol = useWalletStore((s) => s.balance);
  const realBalances = useBalanceStore((s) => s.balances);
  const refreshBalances = useBalanceStore((s) => s.refresh);

  // Trust store
  const credentials = useTrustStore((s) => s.credentials);
  const stakedRlo = useTrustStore((s) => s.stakedRlo || 0);
  const stakedLp = useTrustStore((s) => s.stakedLp || 0);
  const stakeRlo = useTrustStore((s) => s.stakeRlo);
  const unstakeRlo = useTrustStore((s) => s.unstakeRlo);
  const stakeLp = useTrustStore((s) => s.stakeLp);
  const unstakeLp = useTrustStore((s) => s.unstakeLp);
  const rloRewards = useTrustStore((s) => s.rloRewards || 0);
  const lpRewards = useTrustStore((s) => s.lpRewards || 0);
  const claimedRlo = useTrustStore((s) => s.claimedRlo || 0);
  const claimedLp = useTrustStore((s) => s.claimedLp || 0);
  const addRewards = useTrustStore((s) => s.addRewards);
  const claimRewards = useTrustStore((s) => s.claimRewards);

  const stakingPositions = useTrustStore((s) => s.stakingPositions || []);
  const unstakePosition = useTrustStore((s) => s.unstakePosition);

  // Tab State
  const [activeTab, setActiveTab] = useState<'pools' | 'staking'>('pools');
  const [claimingRewards, setClaimingRewards] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleLocationChange = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        if (tabParam === "staking") {
          setActiveTab("staking");
        } else if (tabParam === "pools") {
          setActiveTab("pools");
        }
      }
    };

    // Run initially
    handleLocationChange();

    // Listen for back/forward navigation
    window.addEventListener('popstate', handleLocationChange);
    
    // Listen for any link click that changes search parameters
    const handleClicks = () => {
      setTimeout(handleLocationChange, 50);
    };
    document.addEventListener('click', handleClicks);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleClicks);
    };
  }, []);

  // Input states
  const [rloInput, setRloInput] = useState("");
  const [lpInput, setLpInput] = useState("");

  // Lock Duration states
  const [rloLockDuration, setRloLockDuration] = useState<'none' | '7d' | '30d' | '90d'>('none');
  const [lpLockDuration, setLpLockDuration] = useState<'none' | '7d' | '30d' | '90d'>('none');

  // Loading states for buttons
  const [rloActionLoading, setRloActionLoading] = useState<'stake' | 'unstake' | null>(null);
  const [lpActionLoading, setLpActionLoading] = useState<'stake' | 'unstake' | null>(null);
  const [unstakingPositionId, setUnstakingPositionId] = useState<string | null>(null);

  // Fetch real balances if real wallet is connected
  useEffect(() => {
    if (connected && !isSimulated) {
      refreshBalances();
    }
  }, [connected, isSimulated, refreshBalances]);

  // Trigger re-render every second for lockup countdown timers
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const positions = useLendingStore((s) => s.positions);
  const myDeposits = useMemo(
    () => (address ? positions[address.toLowerCase()] || [] : []),
    [positions, address]
  );

  useEffect(() => {
    startOracle();
    return () => {
      stopOracle();
    };
  }, [startOracle, stopOracle]);

  // Real-time Yield Accumulation Engine based on active locked staking positions
  useEffect(() => {
    if (!connected || stakingPositions.length === 0) return;
    const interval = setInterval(() => {
      let rloRewardSec = 0;
      let lpRewardSec = 0;

      for (const pos of stakingPositions) {
        // Yield rates per second: amount * (apy / 100) / (365 * 24 * 3600)
        const yieldSec = (pos.amount * (pos.apy / 100)) / (365 * 24 * 3600);
        if (pos.token === 'RLO') {
          rloRewardSec += yieldSec;
        } else {
          lpRewardSec += yieldSec;
        }
      }

      if (rloRewardSec > 0 || lpRewardSec > 0) {
        addRewards(rloRewardSec, lpRewardSec);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [connected, stakingPositions, addRewards]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      fetchLendingPools().then((pools) => {
        if (!cancelled && pools.length > 0) {
          setLending(pools);
        }
      }).catch((e) => console.error(e));

      fetchAmmPool().then((ammPool) => {
        if (!cancelled && ammPool) {
          setAmm(ammPool);
        }
      }).catch((e) => console.error(e)).finally(() => {
        if (!cancelled) setLoadingAmm(false);
      });

      fetchPairPools().then((pairPools) => {
        if (!cancelled && pairPools.length > 0) {
          setPairs(pairPools);
        }
      }).catch((e) => console.error(e)).finally(() => {
        if (!cancelled) setLoadingPairs(false);
      });
    };
    load();
    const id = window.setInterval(load, 30_000); // refresh every 30s
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const priceOf = (symbol: string): number => oraclePrices[symbol.toUpperCase()]?.price ?? (symbol === "USDC" || symbol === "USDT" ? 1 : 0);

  const integratedLendingPools = useMemo(() => {
    return LENDING_POOLS.map((staticPool) => {
      const onChain = lending.find((o) => o.symbol === staticPool.symbol);
      const price = priceOf(staticPool.symbol);
      
      const deposits = myDeposits.filter((d) => d.symbol === staticPool.symbol);
      const userAmount = deposits.reduce((s, d) => s + d.amount, 0);
      const userUSD = userAmount * price;

      if (onChain) {
        return {
          symbol: staticPool.symbol,
          poolAddress: onChain.poolAddress,
          isNative: onChain.isNative,
          vaultBalance: onChain.vaultBalance,
          totalDeposits: onChain.totalDeposits,
          totalBorrows: onChain.totalBorrows,
          ltvBps: onChain.ltvBps,
          thresholdBps: onChain.thresholdBps,
        };
      } else {
        const totalSuppliedUSD = staticPool.seedSuppliedUSD + userUSD;
        const totalBorrowedUSD = staticPool.seedBorrowedUSD;
        
        const totalDeposits = price > 0 ? totalSuppliedUSD / price : 0;
        const totalBorrows = price > 0 ? totalBorrowedUSD / price : 0;
        const vaultBalance = Math.max(0, totalDeposits - totalBorrows);

        const ltvBps = 8000;
        const thresholdBps = 8500;

        return {
          symbol: staticPool.symbol,
          poolAddress: staticPool.symbol === "SOL" 
            ? "So11111111111111111111111111111111111111112" 
            : staticPool.symbol === "BTC"
            ? "9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV" 
            : `RIALOPoolPlaceholderPubkey_${staticPool.symbol}`,
          isNative: staticPool.symbol === "SOL",
          vaultBalance,
          totalDeposits,
          totalBorrows,
          ltvBps,
          thresholdBps,
        };
      }
    });
  }, [lending, myDeposits, oraclePrices]);

  const lendingTvl = useMemo(
    () => integratedLendingPools.reduce((sum, p) => sum + p.vaultBalance * priceOf(p.symbol), 0),
    [integratedLendingPools, oraclePrices]
  );
  const ammTvl = useMemo(() => {
    if (!amm) return 0;
    return amm.usdcReserve * priceOf("USDC") + amm.rloReserve * priceOf("RLO");
  }, [amm, oraclePrices]);
  const pairsTvl = useMemo(
    () => pairs.reduce((sum, p) => sum + p.reserveA * priceOf(p.symbolA) + p.reserveB * priceOf(p.symbolB), 0),
    [pairs, oraclePrices]
  );
  const totalTvl = lendingTvl + ammTvl + pairsTvl;
  const poolCount = integratedLendingPools.length + (amm ? 1 : 0) + pairs.length;

  // Derived staking values
  const rloBalance = useMemo(() => {
    if (!connected) return 0;
    if (isSimulated) return Math.max(0, 1500 + claimedRlo - stakedRlo);
    return realBalances["RLO"] ?? 0;
  }, [connected, isSimulated, stakedRlo, claimedRlo, realBalances]);

  const lpBalance = useMemo(() => {
    if (!connected) return 0;
    if (isSimulated) return Math.max(0, 500 + claimedLp - stakedLp);
    return realBalances["LP"] ?? 0;
  }, [connected, isSimulated, stakedLp, claimedLp, realBalances]);

  const lpPrice = useMemo(() => {
    return priceOf("USDC") + priceOf("RLO");
  }, [oraclePrices]);

  const totalStakedUSD = useMemo(() => {
    return stakedRlo * priceOf("RLO") + stakedLp * lpPrice;
  }, [stakedRlo, stakedLp, lpPrice, oraclePrices]);

  const submitOnChainStaking = async (
    action: OnChainAction,
    symbol: string,
    amount: number
  ): Promise<{ ok: boolean; signature?: string }> => {
    if (isSimulated || !address) {
      toast.info("Simulated session", "Connect Phantom/Solflare to record this staking transaction on Solana Devnet.");
      return { ok: true };
    }
    try {
      toast.info("Confirm in wallet", `Signing ${action} on Solana Devnet…`);
      const sig = await sendActionTx({
        action,
        symbol,
        amount: String(amount),
        from: address,
      });
      toast.info("Transaction submitted", "Waiting for Devnet confirmation…");
      const { status } = await waitForReceipt(sig);
      if (status === "success") {
        return { ok: true, signature: sig };
      }
      toast.error("Transaction failed", "The Devnet transaction did not confirm.");
      return { ok: false };
    } catch (err) {
      const e = err as { code?: number; message?: string };
      toast.error("Transaction rejected", e?.message || "Signing was cancelled.");
      return { ok: false };
    }
  };

  const handleRloAction = async (action: 'stake' | 'unstake') => {
    if (!connected) {
      toast.error("Wallet not connected", "Please connect your wallet first.");
      return;
    }
    const amountNum = parseFloat(rloInput);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Invalid amount", "Please enter a positive amount of RLO.");
      return;
    }
    if (action === 'stake') {
      if (amountNum > rloBalance) {
        toast.error("Insufficient balance", `You only have ${rloBalance.toFixed(2)} RLO available.`);
        return;
      }
      setRloActionLoading('stake');
      const res = await submitOnChainStaking('STAKE', 'RLO', amountNum);
      if (res.ok) {
        stakeRlo(amountNum, rloLockDuration, res.signature);
        setRloInput("");
        if (res.signature) {
          toast.success("Stake Successful", `Successfully staked ${amountNum.toFixed(2)} RLO! Explorer: ${explorerTxUrl(res.signature)}`);
        } else {
          toast.success("Stake Successful", `Successfully staked ${amountNum.toFixed(2)} RLO!`);
        }
        if (!isSimulated) refreshBalances();
      }
      setRloActionLoading(null);
    } else {
      if (amountNum > stakedRlo) {
        toast.error("Insufficient staked balance", `You only have ${stakedRlo.toFixed(2)} RLO staked.`);
        return;
      }
      setRloActionLoading('unstake');
      const res = await submitOnChainStaking('UNSTAKE', 'RLO', amountNum);
      if (res.ok) {
        unstakeRlo(amountNum, res.signature);
        setRloInput("");
        if (res.signature) {
          toast.success("Unstake Successful", `Successfully unstaked ${amountNum.toFixed(2)} RLO! Explorer: ${explorerTxUrl(res.signature)}`);
        } else {
          toast.success("Unstake Successful", `Successfully unstaked ${amountNum.toFixed(2)} RLO!`);
        }
        if (!isSimulated) refreshBalances();
      }
      setRloActionLoading(null);
    }
  };

  const handleLpAction = async (action: 'stake' | 'unstake') => {
    if (!connected) {
      toast.error("Wallet not connected", "Please connect your wallet first.");
      return;
    }
    const amountNum = parseFloat(lpInput);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Invalid amount", "Please enter a positive amount of LP tokens.");
      return;
    }
    if (action === 'stake') {
      if (amountNum > lpBalance) {
        toast.error("Insufficient balance", `You only have ${lpBalance.toFixed(2)} USDC/RLO LP available.`);
        return;
      }
      setLpActionLoading('stake');
      const res = await submitOnChainStaking('STAKE', 'LP', amountNum);
      if (res.ok) {
        stakeLp(amountNum, lpLockDuration, res.signature);
        setLpInput("");
        if (res.signature) {
          toast.success("Stake Successful", `Successfully staked ${amountNum.toFixed(2)} USDC/RLO LP! Explorer: ${explorerTxUrl(res.signature)}`);
        } else {
          toast.success("Stake Successful", `Successfully staked ${amountNum.toFixed(2)} USDC/RLO LP!`);
        }
        if (!isSimulated) refreshBalances();
      }
      setLpActionLoading(null);
    } else {
      if (amountNum > stakedLp) {
        toast.error("Insufficient staked balance", `You only have ${stakedLp.toFixed(2)} USDC/RLO LP staked.`);
        return;
      }
      setLpActionLoading('unstake');
      const res = await submitOnChainStaking('UNSTAKE', 'LP', amountNum);
      if (res.ok) {
        unstakeLp(amountNum, res.signature);
        setLpInput("");
        if (res.signature) {
          toast.success("Unstake Successful", `Successfully unstaked ${amountNum.toFixed(2)} USDC/RLO LP! Explorer: ${explorerTxUrl(res.signature)}`);
        } else {
          toast.success("Unstake Successful", `Successfully unstaked ${amountNum.toFixed(2)} USDC/RLO LP!`);
        }
        if (!isSimulated) refreshBalances();
      }
      setLpActionLoading(null);
    }
  };

  const handleUnstakePosition = async (posId: string) => {
    const pos = stakingPositions.find((p) => p.id === posId);
    if (!pos) return;
    if (pos.lockDuration !== 'none' && Date.now() < pos.lockedUntil) {
      toast.error("Position Still Locked", "You cannot unstake this position until the lockup expires.");
      return;
    }
    setUnstakingPositionId(posId);
    const res = await submitOnChainStaking('UNSTAKE', pos.token, pos.amount);
    if (res.ok) {
      unstakePosition(posId, res.signature);
      if (!isSimulated) refreshBalances();
    }
    setUnstakingPositionId(null);
  };

  const handleClaimRewards = async () => {
    if (!connected) {
      toast.error("Wallet not connected", "Please connect your wallet first.");
      return;
    }
    if (rloRewards <= 0 && lpRewards <= 0) {
      toast.warning("No rewards", "You do not have any rewards to claim at this time.");
      return;
    }
    setClaimingRewards(true);
    const totalAmount = rloRewards + lpRewards;
    const res = await submitOnChainStaking('CLAIM', 'REWARDS', totalAmount);
    if (res.ok) {
      claimRewards(res.signature);
      if (!isSimulated) refreshBalances();
    }
    setClaimingRewards(false);
  };

  return (
    <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-white relative">
      {/* Background Video */}
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

      <div className="relative z-10 flex flex-col flex-1 w-full pt-[100px]">
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-6 lg:px-10 pb-10 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold font-display">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
                  {activeTab === 'pools' ? 'Liquidity Pools' : 'Velixir Staking'}
                </span>
              </h1>
              <div className="flex items-center gap-1.5 bg-[#0a1628] border border-blue-500/20 rounded-lg px-2.5 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] text-blue-400 font-medium">{BASE_SEPOLIA_CONFIG.chainName}</span>
              </div>
            </div>
            <a
              href={`${BASE_SEPOLIA_CONFIG.explorerUrl}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 transition-colors"
            >
              <span>Block Explorer</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </motion.div>

          {/* Sub-tab Switcher */}
          <div className="flex justify-start border-b border-[#1a1a3e] pb-px">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('pools')}
                className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all relative cursor-pointer ${
                  activeTab === 'pools'
                    ? 'border-cyan-500 text-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeTab === 'pools' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500"
                  />
                )}
                Pools Overview
              </button>
              <button
                onClick={() => setActiveTab('staking')}
                className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all relative flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'staking'
                    ? 'border-cyan-500 text-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeTab === 'staking' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500"
                  />
                )}
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Velixir Staking
              </button>
            </div>
          </div>

          {activeTab === 'pools' ? (
            <div className="space-y-6">

          {/* Aggregate stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Value Locked", value: compactUsd(totalTvl), accent: "text-cyan-400" },
              { label: "Active Pools", value: String(poolCount), accent: "text-purple-400" },
              { label: "Lending TVL", value: compactUsd(lendingTvl), accent: "text-emerald-400" },
              { label: "AMM / Pair TVL", value: compactUsd(ammTvl + pairsTvl), accent: "text-amber-400" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                {...fadeUp}
                transition={{ delay: 0.05 * i, duration: 0.4 }}
                className="bg-[#080820] border border-[#1a1a3e] rounded-2xl px-4 py-3.5"
              >
                <div className="text-[10px] uppercase tracking-wide text-gray-500">{s.label}</div>
                <div className={`text-lg md:text-xl font-bold mt-1 ${s.accent}`}>{s.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Add tokens to wallet */}
          <ImportTokens />

          {/* Lending Pools */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Lending Pools</h2>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-md px-2 py-0.5">
                Velixir Protocol
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integratedLendingPools.map((p, i) => {
                const price = priceOf(p.symbol);
                const tvl = p.vaultBalance * price;
                const utilization = p.totalDeposits > 0 ? Math.min(100, (p.totalBorrows / p.totalDeposits) * 100) : 0;
                const poolCfg = LENDING_POOLS.find((lp) => lp.symbol === p.symbol);
                const supplyApy = poolCfg ? computeSupplyAPY(poolCfg, p.totalDeposits > 0 ? p.totalBorrows / p.totalDeposits : 0) * 100 : 0;
                return (
                  <motion.div
                    key={p.symbol}
                    {...fadeUp}
                    transition={{ delay: 0.06 * i, duration: 0.45 }}
                    whileHover={{ y: -4 }}
                    className="bg-[#080820] border border-[#1a1a3e] rounded-2xl p-5 hover:border-cyan-500/40 transition-colors duration-300 flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full overflow-hidden shrink-0">
                          <CryptoIcon symbol={p.symbol} size={38} />
                        </div>
                        <div>
                          <div className="text-white font-semibold leading-tight">{p.symbol}</div>
                          <div className="text-[10px] text-gray-500">{p.isNative ? "Native pool" : "SPL pool"}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5">
                        Lending
                      </span>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-gray-500">Pool TVL</div>
                        <div className="text-xl font-bold text-cyan-400">{compactUsd(tvl)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500">Supply APY</div>
                        <div className="text-xl font-bold text-emerald-400">{supplyApy.toFixed(1)}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500">Liquidity</div>
                        <div className="text-sm font-semibold text-gray-200">
                          {compactNum(p.vaultBalance)} {p.symbol}
                        </div>
                      </div>
                    </div>

                    {/* Utilization */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-gray-500">Utilization</span>
                        <span className="text-gray-300 font-medium">{utilization.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#12123a] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${utilization}%` }}
                          transition={{ duration: 0.8, delay: 0.1 + 0.06 * i }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                        <span>Supplied {compactNum(p.totalDeposits)}</span>
                        <span>Borrowed {compactNum(p.totalBorrows)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#0a0a24]/60 border border-[#1a1a3e] rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                        <div className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">Max LTV</div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-sm font-bold font-mono text-white">{(p.ltvBps / 100).toFixed(0)}%</span>
                          <span className="text-[10px] text-gray-500">→</span>
                          <span className="text-sm font-bold font-mono text-indigo-400">{Math.min(110, p.ltvBps / 100 + 30).toFixed(0)}%</span>
                        </div>
                        <div className="text-[8px] text-indigo-400/80 font-semibold mt-1">
                          Standard → Elite Reputation
                        </div>
                      </div>
                      <div className="bg-[#0a0a24]/60 border border-[#1a1a3e] rounded-xl p-2.5 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                        <div className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">Liq. Threshold</div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-sm font-bold font-mono text-white">{(p.thresholdBps / 100).toFixed(0)}%</span>
                          <span className="text-[10px] text-gray-500">→</span>
                          <span className="text-sm font-bold font-mono text-indigo-400">{Math.min(115, p.thresholdBps / 100 + 30).toFixed(0)}%</span>
                        </div>
                        <div className="text-[8px] text-indigo-400/80 font-semibold mt-1">
                          Standard → Elite Reputation
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#1a1a3e]">
                      <a
                        href={explorerAddrUrl(p.poolAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-cyan-400 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Pool {shortAddress(p.poolAddress)}
                      </a>
                      <div className="flex items-center gap-2.5">
                        <a
                          href="/borrow?mode=lending"
                          className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Deposit / Supply →
                        </a>
                        <span className="text-gray-700">·</span>
                        <a
                          href="/borrow?mode=borrow"
                          className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Borrow →
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* AMM Pool */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">AMM Pool</h2>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2 py-0.5">
                Raydium CPMM
              </span>
            </div>

            {loadingAmm ? (
              <div className="h-[180px] bg-[#080820] border border-[#1a1a3e] rounded-2xl animate-pulse" />
            ) : amm ? (
              <motion.div
                {...fadeUp}
                transition={{ duration: 0.45 }}
                whileHover={{ y: -3 }}
                className="bg-[#080820] border border-[#1a1a3e] rounded-2xl p-5 hover:border-purple-500/40 transition-colors duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Pair */}
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="rounded-full overflow-hidden ring-2 ring-[#080820]">
                        <CryptoIcon symbol="USDC" size={38} />
                      </div>
                      <div className="rounded-full overflow-hidden ring-2 ring-[#080820]">
                        <CryptoIcon symbol="RLO" size={38} />
                      </div>
                    </div>
                    <div>
                      <div className="text-white font-semibold">USDC / RLO</div>
                      <div className="text-[10px] text-gray-500">Constant-product · 0.3% fee</div>
                    </div>
                  </div>

                  {/* Reserves */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-2xl">
                    <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg px-3 py-2">
                      <div className="text-[9px] uppercase text-gray-500">Pool TVL</div>
                      <div className="text-sm font-bold text-cyan-400">{compactUsd(ammTvl)}</div>
                    </div>
                    <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg px-3 py-2">
                      <div className="text-[9px] uppercase text-gray-500">USDC Reserve</div>
                      <div className="text-sm font-semibold text-gray-200">{compactNum(amm.usdcReserve, 2)}</div>
                    </div>
                    <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg px-3 py-2">
                      <div className="text-[9px] uppercase text-gray-500">RLO Reserve</div>
                      <div className="text-sm font-semibold text-gray-200">{compactNum(amm.rloReserve, 2)}</div>
                    </div>
                    <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg px-3 py-2">
                      <div className="text-[9px] uppercase text-gray-500">RLO Price</div>
                      <div className="text-sm font-semibold text-emerald-400">${amm.price.toFixed(4)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#1a1a3e]">
                  <a
                    href={explorerAddrUrl(amm.poolId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Pool {shortAddress(amm.poolId)}
                  </a>
                  <a
                    href={raydiumSwapUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    Trade on Raydium →
                  </a>
                </div>
              </motion.div>
            ) : (
              <div className="bg-[#080820] border border-[#1a1a3e] rounded-2xl p-6 text-center text-xs text-gray-500">
                AMM pool data unavailable right now.
              </div>
            )}
          </section>

          {/* Pair Pools */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Pair Pools</h2>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5">
                Velixir Liquidity
              </span>
            </div>

            {loadingPairs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[150px] bg-[#080820] border border-[#1a1a3e] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pairs.map((p, i) => {
                  const tvl = p.reserveA * priceOf(p.symbolA) + p.reserveB * priceOf(p.symbolB);
                  return (
                    <motion.div
                      key={p.poolId}
                      {...fadeUp}
                      transition={{ delay: 0.06 * i, duration: 0.45 }}
                      whileHover={{ y: -4 }}
                      className="bg-[#080820] border border-[#1a1a3e] rounded-2xl p-5 hover:border-emerald-500/40 transition-colors duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <div className="rounded-full overflow-hidden ring-2 ring-[#080820]">
                              <CryptoIcon symbol={p.symbolA} size={36} />
                            </div>
                            <div className="rounded-full overflow-hidden ring-2 ring-[#080820]">
                              <CryptoIcon symbol={p.symbolB} size={36} />
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-semibold">{p.name}</div>
                            <div className="text-[10px] text-gray-500">Constant-product · {(p.feeBps / 100).toFixed(1)}% fee</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5">
                          Pair
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg px-3 py-2">
                          <div className="text-[9px] uppercase text-gray-500">Pool TVL</div>
                          <div className="text-sm font-bold text-cyan-400">{compactUsd(tvl)}</div>
                        </div>
                        <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg px-3 py-2">
                          <div className="text-[9px] uppercase text-gray-500">{p.symbolA} Reserve</div>
                          <div className="text-sm font-semibold text-gray-200">{compactNum(p.reserveA, 2)}</div>
                        </div>
                        <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg px-3 py-2">
                          <div className="text-[9px] uppercase text-gray-500">{p.symbolB} Reserve</div>
                          <div className="text-sm font-semibold text-gray-200">{compactNum(p.reserveB, 2)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#1a1a3e]">
                        <a
                          href={explorerAddrUrl(p.poolId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-cyan-400 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Pool {shortAddress(p.poolId)}
                        </a>
                        <a
                          href="/market"
                          className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                        >
                          Swap pair →
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
          </div>
          ) : (
            <div className="space-y-6">
              {/* Staking Summary Cards */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {/* Card 1: Total Staked */}
                <div className="bg-[#080820]/80 border border-[#1a1a3e] rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 font-medium flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-cyan-400" />
                    Total Staked Value
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300 mt-2">
                    {compactUsd(totalStakedUSD)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {stakedRlo.toFixed(1)} RLO staked · {stakedLp.toFixed(1)} LP staked
                  </div>
                </div>

                {/* Card 2: Rewards Earned */}
                <div className="bg-[#080820]/80 border border-[#1a1a3e] rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-medium flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      Rewards Earned (Yield)
                    </div>
                    <div className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-2">
                      {compactUsd(rloRewards * priceOf("RLO") + lpRewards * lpPrice)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {rloRewards.toFixed(4)} RLO · {lpRewards.toFixed(4)} LP
                    </div>
                  </div>
                  <button
                    onClick={handleClaimRewards}
                    disabled={claimingRewards || (rloRewards <= 0 && lpRewards <= 0)}
                    className="mt-3 w-full py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {claimingRewards ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        Claim Rewards
                      </>
                    )}
                  </button>
                </div>

                {/* Card 3: Ecosystem TVL */}
                <div className="bg-[#080820]/80 border border-[#1a1a3e] rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Ecosystem TVL
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-300 mt-2">
                    {compactUsd(totalTvl + totalStakedUSD)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Staking: {compactUsd(totalStakedUSD)} · Pools: {compactUsd(totalTvl)}
                  </div>
                </div>
              </motion.div>

              {/* Staking Pools Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pool 1: Single-Sided RLO Staking */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.05 }}
                  className="bg-[#080820] border border-[#1a1a3e] rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300 flex flex-col gap-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/[0.02] rounded-full blur-3xl" />
                  
                  {/* Pool Header */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full overflow-hidden shrink-0">
                        <CryptoIcon symbol="RLO" size={44} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">Single-Sided RLO</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">Stake RLO to earn high APY rewards in the Velixir ecosystem</p>
                      </div>
                    </div>
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-1 text-center shrink-0">
                      <div className="text-[9px] uppercase tracking-wide text-cyan-400/80 font-medium">APY UP TO</div>
                      <div className="text-base font-black text-cyan-400 leading-none mt-0.5">42.5%</div>
                    </div>
                  </div>

                  {/* Pool Stats */}
                  <div className="grid grid-cols-3 gap-3 bg-[#0a0a24]/50 border border-[#1a1a3e]/50 rounded-xl p-3.5 z-10">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Staked</div>
                      <div className="text-base font-bold text-white mt-0.5">{stakedRlo.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} RLO</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Available</div>
                      <div className="text-base font-semibold text-gray-300 mt-0.5">{rloBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} RLO</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Selected APY</div>
                      <div className="text-base font-semibold text-cyan-400 mt-0.5">{RLO_STAKING_APY[rloLockDuration]}%</div>
                    </div>
                  </div>

                  {/* Pool Action form */}
                  <div className="flex flex-col gap-4.5 z-10">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={rloInput}
                        onChange={(e) => setRloInput(e.target.value)}
                        className="w-full bg-[#030014] border border-[#1a1a3e] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors pr-16 font-mono"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">RLO</span>
                    </div>

                    {/* Quick percentage buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0.25, 0.50, 0.75, 1.0].map((pct) => {
                        const label = pct === 1.0 ? "MAX" : `${pct * 100}%`;
                        return (
                          <button
                            key={pct}
                            onClick={() => {
                              if (!connected) return;
                              setRloInput((rloBalance * pct).toFixed(2));
                            }}
                            className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg py-1.5 text-xs text-gray-400 hover:text-white hover:border-cyan-500/30 transition-all font-mono cursor-pointer"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Lock Duration Selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Lock Duration & APY Boost</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['none', '7d', '30d', '90d'] as const).map((dur) => {
                          const isSelected = rloLockDuration === dur;
                          const label = dur === 'none' ? 'Flexible' : dur === '7d' ? '7 Days' : dur === '30d' ? '30 Days' : '90 Days';
                          const apy = RLO_STAKING_APY[dur];
                          return (
                            <button
                              key={dur}
                              onClick={() => setRloLockDuration(dur)}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-black shadow-md shadow-cyan-500/5'
                                  : 'bg-[#0a0a24]/60 border-[#1a1a3e] text-gray-400 hover:text-gray-200 hover:border-cyan-500/20'
                              }`}
                            >
                              <span>{label}</span>
                              <span className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-cyan-400' : 'text-gray-500'}`}>{apy}% APY</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stake Button */}
                    <div className="mt-1">
                      <button
                        onClick={() => handleRloAction('stake')}
                        disabled={rloActionLoading !== null}
                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl py-3 text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
                      >
                        {rloActionLoading === 'stake' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            Staking...
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Stake RLO
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Pool 2: USDC/RLO LP Farming */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                  className="bg-[#080820] border border-[#1a1a3e] rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 flex flex-col gap-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/[0.02] rounded-full blur-3xl" />
                  
                  {/* Pool Header */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2 shrink-0">
                        <div className="rounded-full overflow-hidden ring-2 ring-[#080820]">
                          <CryptoIcon symbol="USDC" size={36} />
                        </div>
                        <div className="rounded-full overflow-hidden ring-2 ring-[#080820]">
                          <CryptoIcon symbol="RLO" size={36} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">USDC / RLO LP</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">Supply liquidity to Raydium, farm LP tokens here</p>
                      </div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1 text-center shrink-0">
                      <div className="text-[9px] uppercase tracking-wide text-purple-400/80 font-medium">APY UP TO</div>
                      <div className="text-base font-black text-purple-400 leading-none mt-0.5">68.5%</div>
                    </div>
                  </div>

                  {/* Pool Stats */}
                  <div className="grid grid-cols-3 gap-3 bg-[#0a0a24]/50 border border-[#1a1a3e]/50 rounded-xl p-3.5 z-10">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Staked</div>
                      <div className="text-base font-bold text-white mt-0.5">{stakedLp.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} LP</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Available</div>
                      <div className="text-base font-semibold text-gray-300 mt-0.5">{lpBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} LP</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Selected APY</div>
                      <div className="text-base font-semibold text-emerald-400 mt-0.5">{LP_STAKING_APY[lpLockDuration]}%</div>
                    </div>
                  </div>

                  {/* Pool Action form */}
                  <div className="flex flex-col gap-4.5 z-10">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={lpInput}
                        onChange={(e) => setLpInput(e.target.value)}
                        className="w-full bg-[#030014] border border-[#1a1a3e] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors pr-16 font-mono"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">LP</span>
                    </div>

                    {/* Quick percentage buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0.25, 0.50, 0.75, 1.0].map((pct) => {
                        const label = pct === 1.0 ? "MAX" : `${pct * 100}%`;
                        return (
                          <button
                            key={pct}
                            onClick={() => {
                              if (!connected) return;
                              setLpInput((lpBalance * pct).toFixed(2));
                            }}
                            className="bg-[#0a0a24] border border-[#1a1a3e] rounded-lg py-1.5 text-xs text-gray-400 hover:text-white hover:border-purple-500/30 transition-all font-mono cursor-pointer"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Lock Duration Selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Lock Duration & APY Boost</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['none', '7d', '30d', '90d'] as const).map((dur) => {
                          const isSelected = lpLockDuration === dur;
                          const label = dur === 'none' ? 'Flexible' : dur === '7d' ? '7 Days' : dur === '30d' ? '30 Days' : '90 Days';
                          const apy = LP_STAKING_APY[dur];
                          return (
                            <button
                              key={dur}
                              onClick={() => setLpLockDuration(dur)}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-500/10 border-purple-500 text-purple-400 font-black shadow-md shadow-purple-500/5'
                                  : 'bg-[#0a0a24]/60 border-[#1a1a3e] text-gray-400 hover:text-gray-200 hover:border-purple-500/20'
                              }`}
                            >
                              <span>{label}</span>
                              <span className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-purple-400' : 'text-gray-500'}`}>{apy}% APY</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stake Button */}
                    <div className="mt-1">
                      <button
                        onClick={() => handleLpAction('stake')}
                        disabled={lpActionLoading !== null}
                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl py-3 text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-purple-500/10 cursor-pointer"
                      >
                        {lpActionLoading === 'stake' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            Staking...
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Stake LP
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Active Staking Positions Section */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12 }}
                className="bg-[#080820]/80 border border-[#1a1a3e] rounded-2xl p-6 hover:border-cyan-500/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/[0.01] rounded-full blur-3xl" />
                
                <div className="flex items-center justify-between mb-6 z-10 relative">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-bold text-white">Active Staking Positions</h3>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2 py-0.5">
                      {stakingPositions.length} active
                    </span>
                  </div>
                </div>

                {stakingPositions.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center gap-3 border border-dashed border-[#1a1a3e] rounded-xl bg-[#030014]/20 z-10 relative">
                    <Lock className="w-8 h-8 text-gray-700 animate-pulse" />
                    <p className="text-xs text-gray-500">No active staking positions. Choose a pool and lock duration above to start staking.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto z-10 relative">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#1a1a3e] text-gray-500">
                          <th className="pb-3 font-semibold uppercase tracking-wider">Asset</th>
                          <th className="pb-3 font-semibold uppercase tracking-wider">Amount</th>
                          <th className="pb-3 font-semibold uppercase tracking-wider">APY</th>
                          <th className="pb-3 font-semibold uppercase tracking-wider">Lock Duration</th>
                          <th className="pb-3 font-semibold uppercase tracking-wider">Status / Time Left</th>
                          <th className="pb-3 font-semibold uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a1a3e]/40">
                        {stakingPositions.map((pos) => {
                          const isLocked = pos.lockDuration !== 'none' && Date.now() < pos.lockedUntil;
                          const durationLabel = pos.lockDuration === 'none' ? 'Flexible' : pos.lockDuration === '7d' ? '7 Days' : pos.lockDuration === '30d' ? '30 Days' : '90 Days';
                          
                          let countdownText = 'Flexible (Unlocked)';
                          if (pos.lockDuration !== 'none') {
                            const diff = pos.lockedUntil - Date.now();
                            if (diff <= 0) {
                              countdownText = 'Unlocked';
                            } else {
                              const secs = Math.floor(diff / 1000);
                              const mins = Math.floor(secs / 60);
                              const hours = Math.floor(mins / 60);
                              const days = Math.floor(hours / 24);

                              if (days > 0) {
                                countdownText = `Locked (${days}d ${hours % 24}h left)`;
                              } else if (hours > 0) {
                                countdownText = `Locked (${hours}h ${mins % 60}m left)`;
                              } else if (mins > 0) {
                                countdownText = `Locked (${mins}m ${secs % 60}s left)`;
                              } else {
                                countdownText = `Locked (${secs}s left)`;
                              }
                            }
                          }

                          return (
                            <tr key={pos.id} className="hover:bg-slate-900/25 transition-colors">
                              <td className="py-3.5 flex items-center gap-2">
                                <CryptoIcon symbol={pos.token} size={24} />
                                <span className="text-white font-bold">{pos.token}</span>
                              </td>
                              <td className="py-3.5 text-white font-bold font-mono">
                                {pos.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {pos.token}
                              </td>
                              <td className="py-3.5 text-cyan-400 font-bold font-mono">
                                {pos.apy}% APY
                              </td>
                              <td className="py-3.5 text-gray-300 font-semibold">
                                {durationLabel}
                              </td>
                              <td className="py-3.5">
                                {isLocked ? (
                                  <span className="flex items-center gap-1.5 text-amber-500 font-medium font-mono">
                                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                                    {countdownText}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    {countdownText}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-right">
                                <button
                                  onClick={() => handleUnstakePosition(pos.id)}
                                  disabled={isLocked || unstakingPositionId !== null}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    isLocked
                                      ? 'bg-slate-950/40 text-gray-600 border border-slate-900 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black shadow-md cursor-pointer'
                                  }`}
                                >
                                  {unstakingPositionId === pos.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-white" />
                                  ) : isLocked ? (
                                    "Locked"
                                  ) : (
                                    "Unstake"
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>



              {/* Stake info notes */}
              <div className="bg-[#080820]/40 border border-[#1a1a3e] rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold shrink-0">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Staking Information
                </div>
                <div className="flex-1 leading-relaxed">
                  Staking on Velixir has evolved. Empower your capital in our high-velocity yield ecosystem, operating independently from the Reputation Finance (RepFi) system. Enjoy premium compounding rates of <span className="text-cyan-400 font-semibold">18.5% APY</span> on Single-Sided RLO and <span className="text-purple-400 font-semibold">32.4% APY</span> on USDC/RLO LP. Yield accumulates in real-time, second-by-second, and is claimable directly to your wallet at any moment. Harness the power of decentralized yield and supercharge your crypto portfolio.
                </div>
              </div>
            </div>
          )}
        </main>

        <Toaster />
        <VelixirFooter />
      </div>
    </div>
  );
}
