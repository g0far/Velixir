"use client";

import React, { useState, useMemo, useEffect } from "react";
import Metrics from "./Metrics";
import { TrustTierCard } from "./TrustTierBadge";
import OpenPositions from "./OpenPositions";
import ActivityHistory from "./ActivityHistory";
import AmountModal from "./AmountModal";
import InterestCostBreakdown from "./InterestCostBreakdown";
import { Position } from "@/lib/types/borrow";
import { useWalletStore } from "@/lib/store/walletStore";
import { useBorrowStore } from "@/lib/store/borrowStore";
import { useReputationStore } from "@/lib/store/reputationStore";
import { useTrustStore, selectTrustScore, selectReductionSum, computeMaxBorrowLTV, STANDARD_BORROW_LTV, computeTierAPY, BASE_INTEREST_RATE } from "@/lib/store/trustStore";
import { useOracleStore } from "@/lib/store/oracleStore";
import { toast } from "@/lib/store/toastStore";

export default function PortfolioSection() {
  const connected = useWalletStore((s) => s.connected);
  const connectedAddress = useWalletStore((s) => s.connected ? s.address : "");
  const wrongNetwork = useWalletStore((s) => s.isWrongNetwork());
  const setWalletModalOpen = useWalletStore((s) => s.setModalOpen);
  
  const credentials = useTrustStore((s) => s.credentials);
  const isReputationMode = useTrustStore((s) => s.isReputationMode);
  const trustScore = connected ? selectTrustScore(credentials) : 0;
  const activeReductionSum = selectReductionSum(credentials, isReputationMode);

  const positions = useBorrowStore((s) => s.positions);
  const addCollateral = useBorrowStore((s) => s.addCollateral);
  const repay = useBorrowStore((s) => s.repay);
  const closePosition = useBorrowStore((s) => s.closePosition);
  const forceClose = useBorrowStore((s) => s.forceClose);

  const prices = useOracleStore((s) => s.prices);
  const startOracle = useOracleStore((s) => s.start);
  const stopOracle = useOracleStore((s) => s.stop);

  useEffect(() => {
    startOracle();
    return () => stopOracle();
  }, [startOracle, stopOracle]);

  // Settle accrued interest on active positions when prices update
  useEffect(() => {
    if (connected) {
      const activePositions = useBorrowStore.getState().positions;
      activePositions.forEach((p) => {
        const price = prices[p.collateralAsset]?.price;
        if (price) {
          useBorrowStore.getState().accrueInterest(p.id, price);
        }
      });
    }
  }, [prices, connected]);

  const priceOf = (symbol: string, fallback: number) => prices[symbol]?.price ?? fallback;

  const collateralAssets = useMemo(() => [
    { id: "sol", symbol: "SOL", name: "Solana", price: priceOf("SOL", 152.4), icon: "sol", standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.035 },
    { id: "btc", symbol: "BTC", name: "Bitcoin", price: priceOf("BTC", 95000), icon: "btc", standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.012 },
    { id: "rialo", symbol: "RLO", name: "Rialo", price: priceOf("RLO", 0.968), icon: "rialo", standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.145 },
    { id: "usdc_col", symbol: "USDC", name: "USD Coin", price: priceOf("USDC", 1.00), icon: "usdc", standardLTV: STANDARD_BORROW_LTV, liquidationThreshold: 0.85, apy: 0.048 },
  ], [prices]);

  const livePositions = positions;

  // Modal actions
  const [modal, setModal] = useState<{ type: "add" | "repay"; position: Position } | null>(null);

  const confirmModal = (amount: number) => {
    if (!modal) return;
    const price = priceOf(modal.position.collateralAsset, 1);
    if (modal.type === "add") {
      addCollateral(modal.position.id, amount, price);
      toast.success("Collateral Added", `Deposited ${amount} ${modal.position.collateralAsset}`);
    } else {
      repay(modal.position.id, amount, price);
      toast.success("Repayment Processed", `Repaid ${amount} ${modal.position.borrowAsset}`);
    }
    setModal(null);
  };

  const handleAddCollateralPosition = (id: string) => {
    const pos = positions.find((p) => p.id === id);
    if (pos) setModal({ type: "add", position: pos });
  };

  const handleRepayPosition = (id: string) => {
    const pos = positions.find((p) => p.id === id);
    if (pos) setModal({ type: "repay", position: pos });
  };

  const handleClosePosition = (id: string) => {
    closePosition(id);
    toast.success("Position Closed", "Collateral returned to wallet");
  };

  const handleForceClose = (id: string) => {
    forceClose(id);
    toast.warning("Position Liquidated", "Collateral seized to cover debt");
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-white/5 bg-slate-900/40 rounded-3xl max-w-xl mx-auto my-10 space-y-4 backdrop-blur-sm">
        <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white font-display">Reputation Portfolio Locked</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-normal">
          Connect your Web3 wallet to verify economic identity credentials, monitor active collateralized loans, and review reputation tier status.
        </p>
        <button
          onClick={() => setWalletModalOpen(true)}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.3)] cursor-pointer"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <Metrics
        score={isReputationMode ? trustScore : 300}
        borrowPower={isReputationMode
          ? Math.round(computeMaxBorrowLTV(trustScore) * 100)
          : Math.round(STANDARD_BORROW_LTV * 100)}
        credentials={credentials}
        activeReductionSum={activeReductionSum}
        trustStrength={isReputationMode ? Math.min(100, Math.round(60 + (activeReductionSum / 0.30) * 40)) : 40}
      />

      {/* Trust Tier Breakdown */}
      <TrustTierCard trustScore={trustScore} />


      {/* Value summary blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Total collateral asset value</span>
          <span className="text-2xl font-bold font-display text-white">
            ${livePositions.reduce((sum, p) => {
              const assetObj = collateralAssets.find((a) => a.symbol === p.collateralAsset) || collateralAssets[0];
              return sum + p.collateralAmount * assetObj.price;
            }, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-indigo-400 block mt-2 font-mono">Secured behind Solana Devnet program</span>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
          <span className="text-[10px] font-mono text-indigo-400 uppercase block mb-1">Sovereign Debt Outstanding</span>
          <span className="text-2xl font-bold font-display text-rose-400">
            ${livePositions.reduce((sum, p) => sum + p.borrowAmount + (p.accruedInterest ?? 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-2 font-mono">Principal + accrued interest</span>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
          <span className="text-[10px] font-mono text-emerald-400 block mb-1 uppercase">Total Capital Saved</span>
          <span className="text-2xl font-bold font-display text-emerald-400">
            ${(livePositions.reduce((sum, p) => {
              const posScore = p.trustScore ?? trustScore;
              const standardNeeded = p.borrowAmount * 1.5; // STANDARD_COLLATERAL_RATIO_FACTOR is 1.5
              const scoreClamped = Math.max(300, Math.min(1000, posScore));
              const reduction = 0.30 * ((scoreClamped - 300) / 700);
              return sum + (standardNeeded * reduction);
            }, 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-2 font-mono">Less capital locked on-chain due to reputation advantage</span>
        </div>
      </div>

      {/* Aggregate Interest Cost Breakdown */}
      {livePositions.length > 0 && (() => {
        const totalDebt = livePositions.reduce((sum, p) => sum + p.borrowAmount + (p.accruedInterest ?? 0), 0);
        const weightedAPY = totalDebt > 0
          ? livePositions.reduce((sum, p) => {
              const posDebt = p.borrowAmount + (p.accruedInterest ?? 0);
              const posAPY = isReputationMode ? computeTierAPY(p.trustScore ?? trustScore) : BASE_INTEREST_RATE;
              return sum + posDebt * posAPY;
            }, 0) / totalDebt
          : (isReputationMode ? computeTierAPY(trustScore) : BASE_INTEREST_RATE);
        return (
          <InterestCostBreakdown
            principal={totalDebt}
            apyPercent={weightedAPY}
            subtitle={`${livePositions.length} position${livePositions.length > 1 ? 's' : ''}`}
          />
        );
      })()}

      {/* Positions list */}
      <OpenPositions
        positions={livePositions}
        onAddCollateral={handleAddCollateralPosition}
        onRepay={handleRepayPosition}
        onClose={handleClosePosition}
        onForceClose={handleForceClose}
        wrongNetwork={wrongNetwork}
      />

      {/* Activity History */}
      <ActivityHistory />

      {/* Position action overlay */}
      <AmountModal
        open={modal !== null}
        title={modal?.type === "add" ? "Add Collateral" : "Repay Debt"}
        description={
          modal?.type === "add"
            ? `Deposit additional ${modal?.position.collateralAsset} to strengthen this position's health factor.`
            : `Repay outstanding ${modal?.position.borrowAsset} debt. Fully repay to unlock position closure.`
        }
        assetSymbol={modal?.type === "add" ? modal?.position.collateralAsset ?? "" : modal?.position.borrowAsset ?? ""}
        max={modal?.type === "repay" ? modal?.position.borrowAmount : undefined}
        accent={modal?.type === "add" ? "indigo" : "emerald"}
        confirmLabel={modal?.type === "add" ? "Add Collateral" : "Confirm Repay"}
        onConfirm={confirmModal}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
