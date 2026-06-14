import { CredentialCard, Position, Transaction } from '../types/borrow';
import { selectTrustScore, getReputationTierName } from './trustStore';

export interface WalletProfile {
  address: string;
  credentials: CredentialCard[];
  positions: Position[];
  closedPositions: Position[];
  transactions: Transaction[];
  reputationScore: number;
  reputationTier: string;
  collateralReduction: number;
  trustStrength: number;
  lastUpdated: number;
}

export const getProfileKey = (address: string) => `velixir_profile_${address.toLowerCase()}`;

export function saveWalletProfile(
  address: string,
  credentials: CredentialCard[],
  positions: Position[],
  closedPositions: Position[],
  transactions: Transaction[],
  reputationPoints: number
): WalletProfile {
  const normalized = address.toLowerCase();
  const baseScore = selectTrustScore(credentials);
  const score = Math.min(1000, baseScore + reputationPoints);
  const tierName = getReputationTierName(score);

  const scoreClamped = Math.max(300, Math.min(1000, score));
  const reduction = 0.30 * ((scoreClamped - 300) / 700);
  const collateralReduction = Math.round(reduction * 100);

  const activeReductionSum = credentials.filter(c => c.active).reduce((sum, c) => sum + c.reductionValue, 0);
  const trustStrength = Math.min(100, Math.round(60 + (activeReductionSum / 0.30) * 40));

  const profile: WalletProfile = {
    address: normalized,
    credentials,
    positions,
    closedPositions,
    transactions,
    reputationScore: score,
    reputationTier: tierName,
    collateralReduction,
    trustStrength,
    lastUpdated: Date.now()
  };

  localStorage.setItem(getProfileKey(address), JSON.stringify(profile));
  return profile;
}

export function getWalletProfile(address: string): WalletProfile | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(getProfileKey(address));
  if (!data) return null;
  try {
    return JSON.parse(data) as WalletProfile;
  } catch {
    return null;
  }
}
