import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CredentialCard } from '../types/borrow';
import { toast } from './toastStore';
import { useWalletStore } from './walletStore';

// Active wallet (base58) at record time — staking history is scoped per wallet.
function activeAddress(): string | undefined {
  return useWalletStore.getState().address || undefined;
}

// The Trust Credentials Engine is the heart of Velixir: each credential
// reduces the required collateral ratio and contributes Trust Score points.
//   reductionValue -> collateral-ratio reduction (Credit -9%, Bank/KYC/On-chain -6%, Consent -3% => 30% max)
//   trustPoints    -> Trust Score contribution (Credit 150, Bank/KYC/On-chain 140, Consent 130 => 700 max)
//   rateDiscount   -> interest-rate discount (0.5% each => 2.5% max)
export const DEFAULT_CREDENTIALS: CredentialCard[] = [
  { id: 'credit_score', title: 'Credit Score', subtitle: 'Credit Score', reductionValue: 0.09, rateDiscount: 0.005, status: 'Excellent 785+', active: false },
  { id: 'kyc', title: 'KYC / Identity Verified', subtitle: 'Passport ID & Biometrics', reductionValue: 0.06, rateDiscount: 0.005, status: 'Verified', active: false },
  { id: 'banking', title: 'Banking verification', subtitle: 'Sovereign Bank feed link', reductionValue: 0.06, rateDiscount: 0.005, status: 'Verified', active: false },
  { id: 'onchain', title: 'On-chain Reputation', subtitle: 'Rialo/Aave score factor', reductionValue: 0.06, rateDiscount: 0.005, status: 'Elite history', active: false },
  { id: 'consent', title: 'Credit Reporting Consent', subtitle: 'Equifax credit reporting consent', reductionValue: 0.03, rateDiscount: 0.005, status: 'Granted', active: false },
];

// Trust Score points per credential (drives tier/APY/capacity ONLY).
// Decoupled from collateral reduction: the borrow engine derives collateral
// reduction from each credential's reductionValue, while these points drive the
// Trust Score / tier. This keeps capital-efficiency and tiering independent — a
// single high-value credential (e.g. Credit Score = 150 pts → score 450) lowers
// collateral without jumping a trust tier (Bronze starts at 500 / ≥2 credentials).
export const TRUST_POINTS: Record<string, number> = {
  credit_score: 150,
  banking: 140,
  kyc: 140,
  onchain: 140,
  consent: 130,
};

export const BASE_COLLATERAL_RATIO = 125.0; // % — standard DeFi required collateral ratio
export const BASE_INTEREST_RATE = 12.5; // % APY (traditional, no reputation)

// ---- Trust Tier System ----
// Each tier unlocks real economic benefits: lower APY, higher borrow capacity, and a grace period
// before liquidation when a position becomes unhealthy.
export interface TrustTier {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Elite';
  minScore: number;
  maxScore: number;
  borrowCapacityPct: number; // e.g. 0.80 = 80%
  apy: number;               // e.g. 10.0 (%)
  gracePeriodHours: number;  // time before liquidation after margin call
  color: {
    text: string;
    bg: string;
    border: string;
    glow: string;
  };
}

export const TRUST_TIERS: TrustTier[] = [
  {
    name: 'Bronze',
    minScore: 500,
    maxScore: 699,
    borrowCapacityPct: 0.0857,
    apy: 10.0,
    gracePeriodHours: 12,
    color: { text: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/25', glow: '#d97706' },
  },
  {
    name: 'Silver',
    minScore: 700,
    maxScore: 849,
    borrowCapacityPct: 0.1714,
    apy: 9.5,
    gracePeriodHours: 24,
    color: { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-400/25', glow: '#94a3b8' },
  },
  {
    name: 'Gold',
    minScore: 850,
    maxScore: 999,
    borrowCapacityPct: 0.2357,
    apy: 8.5,
    gracePeriodHours: 36,
    color: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', glow: '#eab308' },
  },
  {
    name: 'Elite',
    minScore: 1000,
    maxScore: 1000,
    borrowCapacityPct: 0.30,
    apy: 7.5,
    gracePeriodHours: 48,
    color: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25', glow: '#7c3aed' },
  },
];

// Returns the active tier for a given score (null = below reputation threshold)
export function getTrustTier(score: number): TrustTier | null {
  if (score < 500) return null;
  for (let i = TRUST_TIERS.length - 1; i >= 0; i--) {
    if (score >= TRUST_TIERS[i].minScore) return TRUST_TIERS[i];
  }
  return TRUST_TIERS[0];
}

export function getReputationTierName(score: number): string {
  if (score < 500) return 'Neutral';
  const tier = getTrustTier(score);
  if (!tier) return 'Neutral';
  if (tier.name === 'Silver') return 'Advanced Borrower';
  if (tier.name === 'Bronze') return 'Bronze Borrower';
  if (tier.name === 'Gold') return 'Gold Borrower';
  if (tier.name === 'Elite') return 'Elite Borrower';
  return tier.name;
}

// APY from the tier (lower is better — reputation reward)
export function computeTierAPY(score: number): number {
  const tier = getTrustTier(score);
  return tier ? tier.apy : BASE_INTEREST_RATE;
}

// Grace period in hours before liquidation after a margin call
export function computeGracePeriodHours(score: number): number {
  const tier = getTrustTier(score);
  return tier ? tier.gracePeriodHours : 0;
}

export interface StakingTransaction {
  id: string;
  action: 'STAKE' | 'UNSTAKE' | 'CLAIM';
  token: 'RLO' | 'LP' | 'ALL';
  amount: number;
  timestamp: number;
  signature?: string;
  onchain?: boolean;
  /** Wallet (base58) that created this entry — history is scoped per wallet. */
  address?: string;
}

export interface StakingPosition {
  id: string;
  token: 'RLO' | 'LP';
  amount: number;
  lockDuration: 'none' | '7d' | '30d' | '90d';
  lockedUntil: number; // timestamp in ms
  apy: number;
  createdAt: number;
}

export const RLO_STAKING_APY: Record<'none' | '7d' | '30d' | '90d', number> = {
  none: 18.5,
  '7d': 22.5,
  '30d': 28.5,
  '90d': 42.5,
};

export const LP_STAKING_APY: Record<'none' | '7d' | '30d' | '90d', number> = {
  none: 32.4,
  '7d': 38.5,
  '30d': 48.5,
  '90d': 68.5,
};

function getLockedUntil(duration: 'none' | '7d' | '30d' | '90d', createdAt: number): number {
  if (duration === 'none') return createdAt;
  const days = duration === '7d' ? 7 : duration === '30d' ? 30 : 90;
  return createdAt + days * 24 * 3600 * 1000;
}

interface TrustState {
  credentials: CredentialCard[];
  isReputationMode: boolean;
  stakedRlo: number;
  stakedLp: number;
  rloRewards: number;
  lpRewards: number;
  claimedRlo: number;
  claimedLp: number;
  stakingHistory: StakingTransaction[];
  stakingPositions: StakingPosition[];
  toggleCredential: (id: string) => void;
  setCredentials: (credentials: CredentialCard[]) => void;
  setReputationMode: (val: boolean) => void;
  stakeRlo: (amount: number, duration?: 'none' | '7d' | '30d' | '90d', signature?: string) => void;
  unstakeRlo: (amount: number, signature?: string) => void;
  stakeLp: (amount: number, duration?: 'none' | '7d' | '30d' | '90d', signature?: string) => void;
  unstakeLp: (amount: number, signature?: string) => void;
  unstakePosition: (positionId: string, signature?: string) => void;
  addRewards: (rloAmt: number, lpAmt: number) => void;
  claimRewards: (signature?: string) => void;
  /** Clear only the given wallet's entries; omit address to clear everything. */
  clearStakingHistory: (address?: string) => void;
  reset: () => void;
}

export const useTrustStore = create<TrustState>()(
  persist(
    (set, get) => ({
      credentials: DEFAULT_CREDENTIALS,
      isReputationMode: true,
      stakedRlo: 0,
      stakedLp: 0,
      rloRewards: 0,
      lpRewards: 0,
      claimedRlo: 0,
      claimedLp: 0,
      stakingHistory: [],
      stakingPositions: [],
      toggleCredential: (id) =>
        set({
          credentials: get().credentials.map((c) =>
            c.id === id ? { ...c, active: !c.active } : c
          ),
        }),
      setCredentials: (credentials) => set({ credentials }),
      setReputationMode: (val) => set({ isReputationMode: val }),
      stakeRlo: (amount, duration = 'none', signature) => {
        const createdAt = Date.now();
        const apy = RLO_STAKING_APY[duration];
        const lockedUntil = getLockedUntil(duration, createdAt);

        const pos: StakingPosition = {
          id: `sp-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          token: 'RLO',
          amount,
          lockDuration: duration,
          lockedUntil,
          apy,
          createdAt,
        };

        const tx: StakingTransaction = {
          id: `stx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          action: 'STAKE',
          token: 'RLO',
          amount,
          timestamp: createdAt,
          signature,
          onchain: !!signature,
          address: activeAddress(),
        };

        const nextPositions = [...(get().stakingPositions || []), pos];
        const nextStakedRlo = nextPositions
          .filter((p) => p.token === 'RLO')
          .reduce((sum, p) => sum + p.amount, 0);

        set({
          stakingPositions: nextPositions,
          stakedRlo: nextStakedRlo,
          stakingHistory: [tx, ...(get().stakingHistory || [])],
        });
      },
      unstakeRlo: (amount, signature) => {
        const positions = get().stakingPositions || [];
        const index = positions.findIndex(
          (p) => p.token === 'RLO' && (p.lockDuration === 'none' || Date.now() >= p.lockedUntil)
        );
        if (index !== -1) {
          const pos = positions[index];
          get().unstakePosition(pos.id, signature);
        }
      },
      stakeLp: (amount, duration = 'none', signature) => {
        const createdAt = Date.now();
        const apy = LP_STAKING_APY[duration];
        const lockedUntil = getLockedUntil(duration, createdAt);

        const pos: StakingPosition = {
          id: `sp-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          token: 'LP',
          amount,
          lockDuration: duration,
          lockedUntil,
          apy,
          createdAt,
        };

        const tx: StakingTransaction = {
          id: `stx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          action: 'STAKE',
          token: 'LP',
          amount,
          timestamp: createdAt,
          signature,
          onchain: !!signature,
          address: activeAddress(),
        };

        const nextPositions = [...(get().stakingPositions || []), pos];
        const nextStakedLp = nextPositions
          .filter((p) => p.token === 'LP')
          .reduce((sum, p) => sum + p.amount, 0);

        set({
          stakingPositions: nextPositions,
          stakedLp: nextStakedLp,
          stakingHistory: [tx, ...(get().stakingHistory || [])],
        });
      },
      unstakeLp: (amount, signature) => {
        const positions = get().stakingPositions || [];
        const index = positions.findIndex(
          (p) => p.token === 'LP' && (p.lockDuration === 'none' || Date.now() >= p.lockedUntil)
        );
        if (index !== -1) {
          const pos = positions[index];
          get().unstakePosition(pos.id, signature);
        }
      },
      unstakePosition: (positionId, signature) => {
        const positions = get().stakingPositions || [];
        const pos = positions.find((p) => p.id === positionId);
        if (!pos) return;

        if (pos.lockDuration !== 'none' && Date.now() < pos.lockedUntil) {
          toast.error("Position Still Locked", "You cannot unstake this position until the lockup expires.");
          return;
        }

        const tx: StakingTransaction = {
          id: `stx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          action: 'UNSTAKE',
          token: pos.token,
          amount: pos.amount,
          timestamp: Date.now(),
          signature,
          onchain: !!signature,
          address: activeAddress(),
        };

        const nextPositions = positions.filter((p) => p.id !== positionId);
        const nextStakedRlo = nextPositions
          .filter((p) => p.token === 'RLO')
          .reduce((sum, p) => sum + p.amount, 0);
        const nextStakedLp = nextPositions
          .filter((p) => p.token === 'LP')
          .reduce((sum, p) => sum + p.amount, 0);

        set({
          stakingPositions: nextPositions,
          stakedRlo: nextStakedRlo,
          stakedLp: nextStakedLp,
          stakingHistory: [tx, ...(get().stakingHistory || [])],
        });
      },
      addRewards: (rloAmt, lpAmt) =>
        set({
          rloRewards: get().rloRewards + rloAmt,
          lpRewards: get().lpRewards + lpAmt,
        }),
      claimRewards: (signature) => {
        const { rloRewards, lpRewards, claimedRlo, claimedLp } = get();
        if (rloRewards <= 0 && lpRewards <= 0) {
          toast.warning("No rewards", "You have no rewards to claim right now.");
          return;
        }
        const totalAmount = rloRewards + lpRewards;
        const tx: StakingTransaction = {
          id: `stx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          action: 'CLAIM',
          token: 'ALL',
          amount: totalAmount,
          timestamp: Date.now(),
          signature,
          onchain: !!signature,
          address: activeAddress(),
        };
        set({
          claimedRlo: claimedRlo + rloRewards,
          claimedLp: claimedLp + lpRewards,
          rloRewards: 0,
          lpRewards: 0,
          stakingHistory: [tx, ...(get().stakingHistory || [])],
        });
        toast.success(
          "Yield Claimed Successfully",
          `Claim successful: ${rloRewards.toFixed(4)} RLO and ${lpRewards.toFixed(4)} LP added to your balance.`
        );
      },
      clearStakingHistory: (address) =>
        set((s) =>
          address
            ? { stakingHistory: (s.stakingHistory || []).filter((t) => t.address?.toLowerCase() !== address.toLowerCase()) }
            : { stakingHistory: [] }
        ),
      reset: () =>
        set({
          credentials: DEFAULT_CREDENTIALS,
          isReputationMode: true,
          stakedRlo: 0,
          stakedLp: 0,
          rloRewards: 0,
          lpRewards: 0,
          claimedRlo: 0,
          claimedLp: 0,
          stakingHistory: [],
          stakingPositions: [],
        }),
    }),
    {
      name: 'velixir-trust-v2',
      partialize: (state) => ({
        isReputationMode: state.isReputationMode,
        stakedRlo: state.stakedRlo,
        stakedLp: state.stakedLp,
        rloRewards: state.rloRewards,
        lpRewards: state.lpRewards,
        claimedRlo: state.claimedRlo,
        claimedLp: state.claimedLp,
        stakingHistory: state.stakingHistory,
        stakingPositions: state.stakingPositions,
      }),
    }
  )
);

// ---- Pure derivations (kept here so every consumer agrees on the math) ----

export function selectReductionSum(credentials: CredentialCard[], isReputationMode: boolean): number {
  if (!isReputationMode) return 0;
  return credentials.filter((c) => c.active).reduce((s, c) => s + c.reductionValue, 0); // max 0.30
}

export const BASE_TRUST_SCORE = 300; // neutral starting score for new wallets

export function selectTrustScore(credentials: CredentialCard[], stakedRlo: number = 0): number {
  const earned = credentials
    .filter((c) => c.active)
    .reduce((s, c) => s + (TRUST_POINTS[c.id] || 0), 0); // 0 - 700
  // Decoupled: stakedRlo parameter is kept but ignored. Trust Score is purely credentials-based.
  return Math.min(1000, BASE_TRUST_SCORE + earned); // clamp at 1000
}

export function selectCollateralRatio(credentials: CredentialCard[], isReputationMode: boolean, stakedRlo: number = 0): number {
  if (!isReputationMode) return BASE_COLLATERAL_RATIO;
  const score = selectTrustScore(credentials, stakedRlo);
  const scoreClamped = Math.max(300, Math.min(1000, score));
  const reduction = 0.30 * ((scoreClamped - 300) / 700);
  return BASE_COLLATERAL_RATIO * (1 - reduction);
}

export function selectInterestRate(credentials: CredentialCard[], isReputationMode: boolean, stakedRlo: number = 0): number {
  if (!isReputationMode) return BASE_INTEREST_RATE;
  const score = selectTrustScore(credentials, stakedRlo);
  return computeTierAPY(score);
}

export function selectApprovalChance(trustScore: number): number {
  return Math.round((trustScore / 1000) * 100);
}

export function trustScoreLabel(score: number): string {
  if (score >= 900) return 'Elite';
  if (score >= 750) return 'Excellent';
  if (score >= 550) return 'Good';
  if (score >= 350) return 'Fair';
  return 'Poor';
}

// ---- Reputation Credit Line Model ----

// Borrow capacity tiers by Trust Score:
//   0–499  (Traditional): max borrow = 80% of collateral
//   500    (Entry):       max borrow = 80% of collateral
//   700    (Good):        max borrow = 90% of collateral
//   850    (Excellent):   max borrow = 100% of collateral
//   1000   (Elite):       max borrow = 110% of collateral
//
// ELT (Effective Liquidation Threshold) is set 5% above the max borrow LTV,
// giving a safety buffer before a position is flagged for liquidation.
// Anchors: 0→85%, 500→85%, 700→95%, 850→105%, 1000→115%
// Standard (traditional) max borrow = 80% of collateral — no reputation required
export const STANDARD_BORROW_LTV = 0.80;

export function computeMaxBorrowLTV(trustScore: number): number {
  const score = Math.max(300, Math.min(1000, trustScore));
  return 0.80 + 0.30 * ((score - 300) / 700);
}

export function computeELT(trustScore: number): number {
  return computeMaxBorrowLTV(trustScore) + 0.05;
}

// MarketHealth = (Collateral × 0.80) / Debt  — reputation-blind baseline
export function computeMarketHealth(collateral: number, debt: number): number {
  if (debt <= 0) return Infinity;
  return (collateral * STANDARD_BORROW_LTV) / debt;
}

// ReputationHealth = TrustScore / 1000 (as a 0-100 percentage)
export function computeReputationHealth(trustScore: number): number {
  return (trustScore / 1000) * 100;
}

// BorrowHealth = (Collateral × ELT) / Debt  — true position safety
export function computeBorrowHealth(collateral: number, debt: number, trustScore: number): number {
  if (debt <= 0) return Infinity;
  const elt = computeELT(trustScore);
  return (collateral * elt) / debt;
}

// Status from BorrowHealth
export function borrowHealthStatus(borrowHealth: number): 'Healthy' | 'Moderate Risk' | 'High Risk' {
  if (borrowHealth > 1.5) return 'Healthy';
  if (borrowHealth >= 1.0) return 'Moderate Risk';
  return 'High Risk';
}

// Compute accrued interest: simple interest formula
// principal × (annualRatePct / 100) × (days / 365)
export function computeAccruedInterest(
  principal: number,
  annualRatePct: number,
  daysElapsed: number
): number {
  return principal * (annualRatePct / 100) * (daysElapsed / 365);
}

// Compute days elapsed from a timestamp to now
export function daysElapsed(fromTimestamp: number): number {
  return (Date.now() - fromTimestamp) / (1000 * 60 * 60 * 24);
}

// Compute max borrowing capacity for a given collateral value and trust score
export function computeMaxBorrowCapacity(collateralValue: number, trustScore: number): number {
  return collateralValue * computeMaxBorrowLTV(trustScore);
}

