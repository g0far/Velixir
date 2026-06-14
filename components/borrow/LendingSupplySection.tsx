"use client";

import React, { useState, useEffect, useMemo } from "react";
import AmountModal from "./AmountModal";
import { useWalletStore } from "@/lib/store/walletStore";
import { useOracleStore } from "@/lib/store/oracleStore";
import { toast } from "@/lib/store/toastStore";
import {
  LENDING_POOLS,
  LendingPool,
  useLendingStore,
  computeSupplyAPY,
  computeUtilization,
  SECONDS_PER_YEAR,
} from "@/lib/store/lendingStore";

// Official brand-mark SVGs for the lending pool assets — sharp at any size.
export function CryptoIcon({ symbol, size = 36 }: { symbol: string; size?: number }) {
  const box = { width: size, height: size };
  switch (symbol) {
    case "BTC":
      return (
        <svg viewBox="0 0 32 32" style={box} aria-label="Bitcoin">
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path fill="#FFF" d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z" />
        </svg>
      );
    case "USDC":
      return (
        <svg viewBox="0 0 2000 2000" style={box} aria-label="USD Coin">
          <path fill="#2775CA" d="M1000 2000c554.17 0 1000-445.83 1000-1000S1554.17 0 1000 0 0 445.83 0 1000s445.83 1000 1000 1000z" />
          <path fill="#FFF" d="M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z" />
          <path fill="#FFF" d="M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z" />
        </svg>
      );
    case "USDT":
      return (
        <svg viewBox="0 0 32 32" style={box} aria-label="Tether">
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117" />
        </svg>
      );
    case "SOL":
      return (
        <div style={box} className="rounded-full bg-[#131419] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 397.7 311.7" style={{ width: size * 0.6 }} aria-label="Solana">
            <defs>
              <linearGradient id="solGradLend" x1="360.8" y1="-37.5" x2="141.2" y2="383.3" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#00FFA3" />
                <stop offset="1" stopColor="#DC1FFF" />
              </linearGradient>
            </defs>
            <path fill="url(#solGradLend)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
            <path fill="url(#solGradLend)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
            <path fill="url(#solGradLend)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
          </svg>
        </div>
      );
    case "RIALO":
    case "RLO":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/rlo-logo.jpg"
          alt="Rialo"
          width={size}
          height={size}
          style={box}
          className="rounded-full object-cover shrink-0 ring-1 ring-white/10"
        />
      );
    default:
      return <div style={box} className="rounded-full bg-slate-700" />;
  }
}

function fmtUSD(n: number): string {
  if (!isFinite(n)) return "$0";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(n >= 100_000 ? 0 : 1) + "K";
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtToken(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

interface AggPosition {
  amount: number;        // total token units supplied
  principalUSD: number;  // live USD value of supplied tokens
  earnedUSD: number;     // accrued yield in USD
}

export default function LendingSupplySection() {
  const connected = useWalletStore((s) => s.connected);
  const address = useWalletStore((s) => (s.connected ? s.address : ""));
  const setWalletModalOpen = useWalletStore((s) => s.setModalOpen);

  const prices = useOracleStore((s) => s.prices);
  const startOracle = useOracleStore((s) => s.start);
  const stopOracle = useOracleStore((s) => s.stop);

  const positions = useLendingStore((s) => s.positions);
  const supply = useLendingStore((s) => s.supply);
  const withdraw = useLendingStore((s) => s.withdraw);

  const [modalPool, setModalPool] = useState<LendingPool | null>(null);
  // Tick every second so accrued yield visibly counts up.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    startOracle();
    return () => stopOracle();
  }, [startOracle, stopOracle]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const priceOf = (symbol: string, fallback: number) => prices[symbol]?.price ?? fallback;
  const FALLBACK: Record<string, number> = { SOL: 152.4, BTC: 95000, RLO: 0.968, USDC: 1, USDT: 1 };

  const myDeposits = useMemo(
    () => (address ? positions[address.toLowerCase()] || [] : []),
    [positions, address]
  );

  // Per-pool live derivations.
  const rows = useMemo(() => {
    return LENDING_POOLS.map((pool) => {
      const price = priceOf(pool.symbol, FALLBACK[pool.symbol] ?? 1);
      const deposits = myDeposits.filter((d) => d.symbol === pool.symbol);
      const userAmount = deposits.reduce((s, d) => s + d.amount, 0);
      const userUSD = userAmount * price;
      const U = computeUtilization(pool, userUSD);
      const apy = computeSupplyAPY(pool, U);
      const earnedUSD = deposits.reduce((s, d) => {
        const principal = d.amount * price;
        const elapsedYears = (now - d.suppliedAt) / 1000 / SECONDS_PER_YEAR;
        return s + principal * apy * elapsedYears;
      }, 0);
      const totalSuppliedUSD = pool.seedSuppliedUSD + userUSD;
      const agg: AggPosition | null =
        userAmount > 0 ? { amount: userAmount, principalUSD: userUSD, earnedUSD } : null;
      return { pool, price, U, apy, totalSuppliedUSD, agg };
    });
  }, [myDeposits, prices, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const portfolio = useMemo(() => {
    let principal = 0;
    let earned = 0;
    let weighted = 0;
    rows.forEach((r) => {
      if (r.agg) {
        principal += r.agg.principalUSD;
        earned += r.agg.earnedUSD;
        weighted += r.agg.principalUSD * r.apy;
      }
    });
    return {
      principal,
      earned,
      netAPY: principal > 0 ? weighted / principal : 0,
      hasPositions: principal > 0,
    };
  }, [rows]);

  const openSupply = (pool: LendingPool) => {
    if (!connected) {
      toast.error("Wallet not connected", "Connect your wallet to supply assets to a lending pool.");
      setWalletModalOpen(true);
      return;
    }
    setModalPool(pool);
  };

  const confirmSupply = (amount: number) => {
    if (!modalPool || !address) return;
    const price = priceOf(modalPool.symbol, FALLBACK[modalPool.symbol] ?? 1);
    supply(address, modalPool.symbol, amount);
    toast.success(
      "Supplied to pool",
      `${fmtToken(amount)} ${modalPool.label} (~${fmtUSD(amount * price)}) is now earning ${(computeSupplyAPY(modalPool, computeUtilization(modalPool, 0)) * 100).toFixed(1)}% APY.`
    );
    setModalPool(null);
  };

  const doWithdraw = (pool: LendingPool, agg: AggPosition) => {
    withdraw(address, pool.symbol);
    toast.success(
      "Withdrawal complete",
      `${fmtUSD(agg.principalUSD + agg.earnedUSD)} returned to your wallet (${fmtUSD(agg.earnedUSD)} yield earned).`
    );
  };

  return (
    <>
      {/* Your supply summary */}
      {portfolio.hasPositions && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-950/30 to-slate-900/60 p-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/80">Total Supplied</div>
            <div className="text-2xl font-bold text-white font-display mt-1">{fmtUSD(portfolio.principal)}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Yield Earned</div>
            <div className="text-2xl font-bold text-emerald-400 font-display mt-1 tabular-nums">
              +${portfolio.earned.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Blended Net APY</div>
            <div className="text-2xl font-bold text-white font-display mt-1">{(portfolio.netAPY * 100).toFixed(2)}%</div>
          </div>
        </div>
      )}

      {/* Lending Pools */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Lending Pools</h3>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Live
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {rows.map(({ pool, U, apy, totalSuppliedUSD, agg }) => (
            <div key={pool.symbol} className="px-4 sm:px-6 py-4">
              <div className="flex items-center gap-4">
                <CryptoIcon symbol={pool.label} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{pool.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                        pool.risk === "Low"
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      }`}
                    >
                      {pool.risk} Risk
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 rounded-full bg-white/5 w-full max-w-[120px]">
                      <div className="h-1 rounded-full bg-violet-500/60" style={{ width: `${(U * 100).toFixed(0)}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">{(U * 100).toFixed(0)}% used</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">{(apy * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">APY</div>
                </div>
                <div className="text-right hidden sm:block w-24">
                  <div className="text-sm text-white">{fmtUSD(totalSuppliedUSD)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Total Supply</div>
                </div>
                <button
                  onClick={() => openSupply(pool)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  Supply
                </button>
              </div>

              {/* Your active position in this pool */}
              {agg && (
                <div className="mt-3 ml-0 sm:ml-12 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-4 py-2.5">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Your supply </span>
                      <span className="text-white font-semibold">{fmtToken(agg.amount)} {pool.label}</span>
                      <span className="text-slate-500"> (~{fmtUSD(agg.principalUSD)})</span>
                    </div>
                    <div className="hidden sm:block text-emerald-400 font-mono tabular-nums">
                      +${agg.earnedUSD.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}
                    </div>
                  </div>
                  <button
                    onClick={() => doWithdraw(pool, agg)}
                    className="px-3 py-1 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Withdraw
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AmountModal
        open={modalPool !== null}
        title={modalPool ? `Supply ${modalPool.label}` : "Supply"}
        description={
          modalPool
            ? `Deposit ${modalPool.label} into the lending pool to start earning yield. APY adjusts with pool utilization in real time.`
            : undefined
        }
        assetSymbol={modalPool?.symbol ?? "USDC"}
        accent="emerald"
        confirmLabel="Supply"
        onConfirm={confirmSupply}
        onClose={() => setModalPool(null)}
      />
    </>
  );
}
