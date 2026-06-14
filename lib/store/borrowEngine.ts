import { computeELT, computeMaxBorrowCapacity, STANDARD_BORROW_LTV } from './trustStore';

// ---- Standard DeFi collateral ratio constant ----
export const STANDARD_COLLATERAL_RATIO_FACTOR = 1.25; // 125%

export interface LendingEngine {
  // Core reduction
  reduction: number;
  collateralRatioPercent: number;

  // Collateral valuation
  currentCollateralValue: number;

  // Required collateral (for comparison display — uses comparisonBorrowAmount)
  standardCollateral: number;
  velixirCollateral: number;
  capitalSaved: number;

  // Capacity
  standardCapacity: number;
  reputationCapacity: number;
  maxBorrowCapacity: number;

  // Validation
  collateralCoverage: number;
  isValid: boolean;
  isOverCapacity: boolean;
  additionalNeeded: number;

  // LTV & health
  ltv: number;
  elt: number;
  borrowHealth: number;
  status: 'Healthy' | 'Moderate Risk' | 'High Risk' | 'Insufficient Collateral' | 'Collateral Requirement Not Met';
  validationWarning: string | null;
  borrowHealthText: string;
}export function computeLendingEngine(
  collateralAmount: number,
  borrowAmount: number,
  trustScore: number,
  isReputationMode: boolean,
  collateralPrice: number,
  reductionSum: number
): LendingEngine {
  // Collateral-ratio reduction is driven by the active credentials' reductionValue
  // sum (NOT the trust score), so tier/score and capital-efficiency stay independent
  // and the displayed total always equals the sum of the per-credential badges.
  const reduction = isReputationMode ? Math.max(0, Math.min(0.30, reductionSum)) : 0;

  // Collateral ratio: 137.5% standard, reduced by reputation
  const collateralRatioPercent = STANDARD_COLLATERAL_RATIO_FACTOR * 100 * (1 - reduction);

  // Step 1: Calculate actual deposited collateral value
  const currentCollateralValue = collateralAmount * collateralPrice;

  // Borrow capacities — single source of truth shared with the active-position
  // store (computeMaxBorrowCapacity / STANDARD_BORROW_LTV), so the borrow preview
  // and the live position panel always report the same max-borrow numbers.
  const standardCapacity = currentCollateralValue * STANDARD_BORROW_LTV;
  const reputationCapacity = computeMaxBorrowCapacity(currentCollateralValue, trustScore);

  // Max Borrow Capacity based on current mode
  const maxBorrowCapacity = isReputationMode ? reputationCapacity : standardCapacity;

  const actualBorrow = borrowAmount;

  // Comparison amount for display panels (when user hasn't entered a borrow yet)
  const comparisonBorrowAmount = actualBorrow > 0
    ? actualBorrow
    : (maxBorrowCapacity > 0 ? maxBorrowCapacity : 1000);

  // Step 2: Standard Required Collateral (using comparison amount for display)
  const standardCollateral = comparisonBorrowAmount * STANDARD_COLLATERAL_RATIO_FACTOR;

  // Step 3: Apply Reputation Reduction (using comparison amount for display)
  const velixirCollateral = standardCollateral * (1 - reduction);

  // Step 4: Capital Saved
  const capitalSaved = standardCollateral - velixirCollateral;

  // Step 5: Validate Position (using ACTUAL borrow amount)
  const actualVelixirCollateral = actualBorrow * STANDARD_COLLATERAL_RATIO_FACTOR * (1 - reduction);
  const collateralCoverage = actualVelixirCollateral > 0
    ? (currentCollateralValue / actualVelixirCollateral)
    : 0;

  // Hard Validation
  const isOverCapacity = actualBorrow > 0 && actualBorrow > maxBorrowCapacity;
  const isUnderCollateralized = actualBorrow > 0 && currentCollateralValue < actualVelixirCollateral;
  const isValid = actualBorrow <= 0 || (!isOverCapacity && !isUnderCollateralized);
  const additionalNeeded = isValid ? 0 : Math.max(0, actualVelixirCollateral - currentCollateralValue);

  // LTV: single formula, one source
  const ltv = currentCollateralValue > 0 ? (actualBorrow / currentCollateralValue) * 100 : 0;

  // Safe Liquidation Threshold
  const elt = computeELT(trustScore);

  // Borrow Health (only valid when position passes collateral check)
  const borrowHealth = (isValid && actualBorrow > 0)
    ? (currentCollateralValue * elt) / actualBorrow
    : Infinity;

  // Status determination
  let status: LendingEngine['status'];
  let validationWarning: string | null = null;
  let borrowHealthText: string;
  if (isOverCapacity) {
    status = 'Collateral Requirement Not Met';
    validationWarning = 'Borrow Amount exceeds maximum borrowing capacity.';
    borrowHealthText = 'Invalid Position';
  } else if (isUnderCollateralized) {
    status = 'Insufficient Collateral';
    validationWarning = 'Additional Collateral Required';
    borrowHealthText = 'Collateral Requirement Not Met';
  } else if (actualBorrow <= 0) {
    status = 'Healthy';
    borrowHealthText = 'Healthy';
  } else if (borrowHealth > 1.5) {
    status = 'Healthy';
    borrowHealthText = 'Healthy';
  } else if (borrowHealth >= 1.0) {
    status = 'Moderate Risk';
    borrowHealthText = 'Moderate Risk';
  } else {
    status = 'High Risk';
    borrowHealthText = 'High Risk';
  }

  return {
    reduction,
    collateralRatioPercent,
    currentCollateralValue,
    standardCollateral,
    velixirCollateral,
    capitalSaved,
    standardCapacity,
    reputationCapacity,
    maxBorrowCapacity,
    collateralCoverage,
    isValid,
    isOverCapacity,
    additionalNeeded,
    ltv,
    elt,
    borrowHealth,
    status,
    validationWarning,
    borrowHealthText,
  };
}
