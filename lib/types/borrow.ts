export interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  icon: string;
  standardLTV: number; // e.g. 0.60
  liquidationThreshold: number; // e.g. 0.85
  apy: number; // e.g. 0.05
}

export interface CredentialCard {
  id: string;
  title: string;
  subtitle: string;
  reductionValue: number; // e.g. 0.15 for 15%
  rateDiscount: number; // e.g. 0.005 for 0.5%
  status: 'Verified' | 'Excellent 785+' | 'Elite history' | 'Granted' | 'Not Verified';
  active: boolean;
}

export interface Position {
  id: string;
  collateralAsset: string; // e.g. "ETH"
  collateralAmount: number;
  borrowAsset: string; // e.g. "USDC"
  borrowAmount: number;        // Principal debt (excluding accrued interest)
  accruedInterest: number;     // Interest accrued since position opened
  ltv: number;                 // Based on totalDebt (borrowAmount + accruedInterest)
  healthFactor: number;        // BorrowHealth factor = (Collateral × ELT) / totalDebt
  rate: number;                // Annual interest rate %
  status: 'Healthy' | 'Moderate Risk' | 'Margin Call' | 'High Risk';
  marginCall?: boolean;        // True when totalDebt > maxCapacity but ELT not yet breached
  marginCallAt?: number;       // Timestamp when Margin Call was first issued (for grace period countdown)
  gracePeriodHours?: number;   // Hours of grace before liquidation can occur (from tier)
  liquidationThreshold?: number; // ELT at time of computation
  collateralRatio?: number;    // % required collateral ratio at borrow time
  trustScore?: number;
  tierName?: 'Bronze' | 'Silver' | 'Gold' | 'Elite'; // Trust tier at position creation
  createdAt?: number;
  lastInterestAt?: number;
}

export interface PerformanceSnapshot {
  timestamp: string;
  approvalChance: number;
}

export type TxAction = 'Borrow' | 'Repay' | 'Add Collateral' | 'Close Position';

export interface Transaction {
  id: string;
  action: TxAction;
  asset: string;
  amount: number;
  positionId: string;
  timestamp: number;
  txHashMock: string;
  /** Real Solana Devnet tx signature (base58) when signed by a real wallet. */
  signature?: string;
  /** True when this action was settled by a real on-chain transaction. */
  onchain?: boolean;
  /** Wallet (base58) that created this entry — history is scoped per wallet. */
  address?: string;
}

export type ConnectorType = 'Phantom' | 'Solflare' | 'WalletConnect' | 'MetaMask';

export interface OraclePrice {
  symbol: string;
  price: number;
  prevPrice: number;
  changePct: number; // since last tick
  /** Real rolling 24h change (%) from the live source, when available. */
  change24h?: number;
}
