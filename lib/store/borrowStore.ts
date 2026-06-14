import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Position } from '../types/borrow';
import { useHistoryStore } from './historyStore';
import { toast } from './toastStore';
import {
  computeELT,
  computeMaxBorrowLTV,
  computeMaxBorrowCapacity,
  computeBorrowHealth,
  computeAccruedInterest,
  computeTierAPY,
  computeGracePeriodHours,
  getTrustTier,
  daysElapsed,
} from './trustStore';

// Determine position status from health factor and margin call flag
function statusFromFactors(borrowHealth: number, marginCall: boolean): Position['status'] {
  if (borrowHealth < 1.0) return 'High Risk';
  if (marginCall) return 'Margin Call';
  if (borrowHealth < 1.5) return 'Moderate Risk';
  return 'Healthy';
}

// Core recompute: applies all three risk factors
//   1. Collateral Price Drop   — new price reduces collateralValue
//   2. Accrued Interest        — totalDebt = borrowAmount + accruedInterest
//   3. Reputation Bonus        — trustScore determines maxCapacity; if totalDebt > maxCapacity → Margin Call
function recompute(p: Position, price: number): Position {
  const collateralValue = p.collateralAmount * price;
  const accruedInterest = p.accruedInterest ?? 0;
  const totalDebt = p.borrowAmount + accruedInterest;
  const ltv = collateralValue > 0 ? (totalDebt / collateralValue) * 100 : 0;
  const trustScore = p.trustScore ?? 500;
  const elt = computeELT(trustScore);
  const maxCapacity = computeMaxBorrowCapacity(collateralValue, trustScore);
  const borrowHealth = computeBorrowHealth(collateralValue, totalDebt, trustScore);

  // Margin Call: totalDebt exceeds allowed capacity but position not yet liquidatable
  const marginCall = totalDebt > maxCapacity && borrowHealth >= 1.0;

  return {
    ...p,
    accruedInterest,
    ltv,
    healthFactor: borrowHealth,
    status: statusFromFactors(borrowHealth, marginCall),
    marginCall,
    liquidationThreshold: elt,
  };
}

interface CreatePositionInput {
  collateralAsset: string;
  collateralAmount: number;
  borrowAsset: string;
  borrowAmount: number;
  ltv: number;
  healthFactor: number;
  rate: number;
  collateralRatio: number;
  trustScore: number;
  txSignature?: string;
}

interface BorrowState {
  positions: Position[];
  closedPositions: Position[];

  activeCollateral: string;
  activeBorrow: string;
  collateralAmount: string;
  borrowAmount: string;

  setActiveCollateral: (s: string) => void;
  setActiveBorrow: (s: string) => void;
  setCollateralAmount: (s: string) => void;
  setBorrowAmount: (s: string) => void;

  createPosition: (input: CreatePositionInput) => void;
  addCollateral: (id: string, amount: number, price: number) => void;
  repay: (id: string, amount: number, price: number, signature?: string) => void;
  closePosition: (id: string) => void;
  forceClose: (id: string) => void;
  setPositionsState: (positions: Position[], closedPositions: Position[]) => void;
  // Interest accrual: settle accumulated interest into the position debt
  accrueInterest: (id: string, price: number) => void;
  // Apply a trust score change — generates Margin Call if position exceeds new capacity
  applyTrustScoreDrop: (id: string, newTrustScore: number, price: number) => void;
  fastForwardTime: (days: number, prices: Record<string, number>) => void;
}

export const useBorrowStore = create<BorrowState>()(
  persist(
    (set, get) => ({
      positions: [
        {
          id: 'pos-1',
          collateralAsset: 'SOL',
          collateralAmount: 100,
          borrowAsset: 'USDC',
          borrowAmount: 6000,
          accruedInterest: 0,
          ltv: 38.1,
          healthFactor: 2.26,
          rate: 7.5,
          status: 'Healthy',
          collateralRatio: 120,
          trustScore: 1000,
          tierName: 'Elite',
          gracePeriodHours: 72,
          createdAt: Date.now(),
          lastInterestAt: Date.now(),
        },
      ],
      closedPositions: [],

      activeCollateral: 'SOL',
      activeBorrow: 'USDC',
      collateralAmount: '100',
      borrowAmount: '10000',

      setActiveCollateral: (s) => set({ activeCollateral: s }),
      setActiveBorrow: (s) => set({ activeBorrow: s }),
      setCollateralAmount: (s) => set({ collateralAmount: s }),
      setBorrowAmount: (s) => set({ borrowAmount: s }),

      createPosition: (input) => {
        const now = Date.now();
        const trustScore = input.trustScore;
        const collateralValue = input.collateralAmount; // will be recomputed on first price tick
        const maxCapacity = computeMaxBorrowCapacity(collateralValue, trustScore);
        const marginCall = input.borrowAmount > maxCapacity && input.healthFactor >= 1.0;
        const tier = getTrustTier(trustScore);
        const tierAPY = computeTierAPY(trustScore);
        const gracePeriodHours = computeGracePeriodHours(trustScore);

        const pos: Position = {
          id: `pos-${now}`,
          ...input,
          rate: tierAPY,
          accruedInterest: 0,
          status: statusFromFactors(input.healthFactor, marginCall),
          marginCall,
          marginCallAt: marginCall ? now : undefined,
          tierName: tier?.name,
          gracePeriodHours,
          createdAt: now,
          lastInterestAt: now,
        };
        set({ positions: [pos, ...get().positions] });
        useHistoryStore.getState().record({
          action: 'Borrow',
          asset: input.borrowAsset,
          amount: input.borrowAmount,
          positionId: pos.id,
          signature: input.txSignature,
        });
        toast.success(
          'Borrow successful',
          `Borrowed ${input.borrowAmount.toLocaleString()} ${input.borrowAsset} at ${input.collateralRatio}% ratio`
        );
      },

      addCollateral: (id, amount, price) => {
        const target = get().positions.find((p) => p.id === id);
        if (!target || amount <= 0) return;
        set({
          positions: get().positions.map((p) =>
            p.id === id ? recompute({ ...p, collateralAmount: p.collateralAmount + amount }, price) : p
          ),
        });
        useHistoryStore.getState().record({
          action: 'Add Collateral',
          asset: target.collateralAsset,
          amount,
          positionId: id,
        });
        toast.success('Collateral added', `+${amount} ${target.collateralAsset} — health factor improved`);
      },

      repay: (id, amount, price, signature) => {
        const target = get().positions.find((p) => p.id === id);
        if (!target || amount <= 0) return;

        // Repayments first clear accrued interest, then principal
        let remaining = amount;
        let newAccruedInterest = target.accruedInterest ?? 0;
        let newBorrowAmount = target.borrowAmount;

        if (remaining >= newAccruedInterest) {
          remaining -= newAccruedInterest;
          newAccruedInterest = 0;
        } else {
          newAccruedInterest -= remaining;
          remaining = 0;
        }
        newBorrowAmount = Math.max(0, newBorrowAmount - remaining);
        const repaid = amount - Math.max(0, newBorrowAmount - (target.borrowAmount - remaining));
        const actualRepaid = Math.min(amount, (target.accruedInterest ?? 0) + target.borrowAmount);

        useHistoryStore.getState().record({
          action: 'Repay',
          asset: target.borrowAsset,
          amount: actualRepaid,
          positionId: id,
          signature,
        });

        if (newBorrowAmount <= 0.0001 && newAccruedInterest <= 0.0001) {
          set({
            positions: get().positions.filter((p) => p.id !== id),
            closedPositions: [{ ...target, borrowAmount: 0, accruedInterest: 0, status: 'Healthy' }, ...get().closedPositions],
          });
          useHistoryStore.getState().record({
            action: 'Close Position',
            asset: target.collateralAsset,
            amount: target.collateralAmount,
            positionId: id,
          });
          toast.success(
            'Loan fully repaid & position closed',
            `${target.collateralAmount} ${target.collateralAsset} collateral released back to your wallet.`
          );
        } else {
          set({
            positions: get().positions.map((p) =>
              p.id === id
                ? recompute({ ...p, borrowAmount: newBorrowAmount, accruedInterest: newAccruedInterest }, price)
                : p
            ),
          });
          const remaining2 = newBorrowAmount + newAccruedInterest;
          toast.success(
            'Repayment settled',
            `Repaid ${actualRepaid.toLocaleString()} ${target.borrowAsset} — remaining: ${remaining2.toLocaleString()} ${target.borrowAsset}`
          );
        }
      },

      closePosition: (id) => {
        const target = get().positions.find((p) => p.id === id);
        if (!target) return;
        const totalDebt = target.borrowAmount + (target.accruedInterest ?? 0);
        if (totalDebt > 0.0001) {
          toast.error('Cannot close position', 'Outstanding debt must be fully repaid first.');
          return;
        }
        set({
          positions: get().positions.filter((p) => p.id !== id),
          closedPositions: [{ ...target, status: 'Healthy' }, ...get().closedPositions],
        });
        useHistoryStore.getState().record({
          action: 'Close Position',
          asset: target.collateralAsset,
          amount: target.collateralAmount,
          positionId: id,
        });
        toast.info('Position closed', 'Collateral released back to your wallet.');
      },

      forceClose: (id) => {
        const target = get().positions.find((p) => p.id === id);
        if (!target) return;
        set({
          positions: get().positions.filter((p) => p.id !== id),
          closedPositions: [{ ...target, borrowAmount: 0, accruedInterest: 0, status: 'Healthy' }, ...get().closedPositions],
        });
        useHistoryStore.getState().record({
          action: 'Repay',
          asset: target.borrowAsset,
          amount: target.borrowAmount + (target.accruedInterest ?? 0),
          positionId: id,
        });
        useHistoryStore.getState().record({
          action: 'Close Position',
          asset: target.collateralAsset,
          amount: target.collateralAmount,
          positionId: id,
        });
        const total = target.borrowAmount + (target.accruedInterest ?? 0);
        toast.success('Position closed', `Repaid ${total.toLocaleString()} ${target.borrowAsset} — ${target.collateralAmount} ${target.collateralAsset} collateral released.`);
      },

      setPositionsState: (positions, closedPositions) => {
        set({ positions, closedPositions });
      },

      // Settle accrued interest based on time elapsed since lastInterestAt
      accrueInterest: (id, price) => {
        const target = get().positions.find((p) => p.id === id);
        if (!target) return;
        const lastAt = target.lastInterestAt ?? target.createdAt ?? Date.now();
        const days = daysElapsed(lastAt);
        const newInterest = computeAccruedInterest(target.borrowAmount, target.rate, days);
        const totalAccrued = (target.accruedInterest ?? 0) + newInterest;
        set({
          positions: get().positions.map((p) =>
            p.id === id
              ? recompute({ ...p, accruedInterest: totalAccrued, lastInterestAt: Date.now() }, price)
              : p
          ),
        });
      },

      // Apply a trust score change to a position.
      // Does NOT immediately liquidate — generates a Margin Call if debt exceeds new capacity.
      applyTrustScoreDrop: (id, newTrustScore, price) => {
        const target = get().positions.find((p) => p.id === id);
        if (!target) return;
        const collateralValue = target.collateralAmount * price;
        const totalDebt = target.borrowAmount + (target.accruedInterest ?? 0);
        const newMaxCapacity = computeMaxBorrowCapacity(collateralValue, newTrustScore);
        const newBorrowHealth = computeBorrowHealth(collateralValue, totalDebt, newTrustScore);
        const marginCall = totalDebt > newMaxCapacity && newBorrowHealth >= 1.0;
        const newTier = getTrustTier(newTrustScore);
        const newGrace = computeGracePeriodHours(newTrustScore);
        const newAPY = computeTierAPY(newTrustScore);
        const now = Date.now();

        set({
          positions: get().positions.map((p) =>
            p.id === id
              ? recompute({
                  ...p,
                  trustScore: newTrustScore,
                  tierName: newTier?.name,
                  gracePeriodHours: newGrace,
                  rate: newAPY,
                  marginCallAt: marginCall && !p.marginCall ? now : (marginCall ? p.marginCallAt : undefined),
                }, price)
              : p
          ),
        });

        if (newBorrowHealth < 1.0) {
          toast.error(
            'Liquidation Risk',
            `Trust Score drop to ${newTrustScore} — position health is critical. Add collateral or repay immediately.`
          );
        } else if (marginCall) {
          const graceStr = newGrace > 0 ? ` You have ${newGrace}h grace period.` : '';
          toast.error(
            'Margin Call Issued',
            `Trust Score drop to ${newTrustScore} reduced your ${newTier?.name ?? ''} tier capacity.${graceStr} Add collateral or repay to restore.`
          );
        } else {
          toast.success('Trust Score updated', `${newTier?.name ?? 'Standard'} tier active — APY ${newAPY.toFixed(1)}%, borrow capacity updated.`);
        }
      },
      fastForwardTime: (days, currentPrices) => {
        set({
          positions: get().positions.map((p) => {
            const newInterest = computeAccruedInterest(p.borrowAmount, p.rate, days);
            const totalAccrued = (p.accruedInterest ?? 0) + newInterest;
            const price = currentPrices[p.collateralAsset] ?? 1.0;

            const shiftedCreated = (p.createdAt ?? Date.now()) - (days * 24 * 60 * 60 * 1000);
            const shiftedLast = (p.lastInterestAt ?? Date.now()) - (days * 24 * 60 * 60 * 1000);

            return recompute({
              ...p,
              accruedInterest: totalAccrued,
              createdAt: shiftedCreated,
              lastInterestAt: shiftedLast,
            }, price);
          }),
        });
        toast.info(
          'Time Machine Activated',
          `Simulated +${days} days of time passing. Accrued interest applied to all positions.`
        );
      },
    }),
    {
      name: 'velixir-borrow-sol-v1',
      partialize: (s) => ({
        positions: s.positions,
        closedPositions: s.closedPositions,
        activeCollateral: s.activeCollateral,
        activeBorrow: s.activeBorrow,
        collateralAmount: s.collateralAmount,
        borrowAmount: s.borrowAmount,
      }),
    }
  )
);
