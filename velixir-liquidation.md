# Velixir — Liquidation System Redesign Prompt

Redesign the liquidation system in Velixir around the core principle: **"Your Reputation Is Your Collateral."**

Currently the liquidation logic only uses collateral value and LTV, like a traditional over-collateralized DeFi protocol. Replace it with a reputation-powered model where a user's Trust Score increases borrowing power and capital efficiency. Reputation must **never** trigger liquidation by itself — liquidation occurs **only** when Current LTV exceeds the Effective Liquidation Threshold.

## Core model

Let `Collateral` = collateral value (USD), `Debt` = borrowed value (USD), `TrustScore` = 0–1000.

**1. Reputation Factor**
`R = TrustScore / 1000`

**2. Effective Liquidation Threshold (ELT)** — piecewise-linear interpolation between these anchor points, with TrustScore clamped to [300, 1000]:

| Trust Score | Max Borrow LTV | Effective LT (ELT) |
|---|---|---|
| ≤ 300 | 80.0% | 85.0% |
| 500 | 88.6% | 93.6% |
| 700 | 97.1% | 102.1% |
| 850 | 103.6% | 108.6% |
| 1000 | 110.0% | 115.0% |

Interpolate linearly based on: `MaxBorrowLTV = 0.80 + 0.30 × (TrustScore − 300) / 700` (clamped to [300, 1000]) and `ELT = MaxBorrowLTV + 0.05`.

**3. Current LTV**
`LTV = Debt / Collateral`

**4. Max Borrow LTV (borrow power)**
`MaxBorrowLTV = ELT − 0.05`  (5% safety buffer below the liquidation line; tunable parameter)
`MaxBorrow = Collateral × MaxBorrowLTV`
Higher Trust Score → higher ELT → higher borrow limit → more capital efficiency. Lower Trust Score → lower limit, so the same loan requires more collateral.

**5. Market Health** (reputation-blind baseline health factor)
`MarketHealth = (Collateral × 0.80) / Debt`

**6. Reputation Health** (display only, as a percentage)
`ReputationHealth = R`

**7. Borrow Health** (headline metric — true position safety)
`BorrowHealth = (Collateral × ELT) / Debt`  =  `MarketHealth × (ELT / 0.80)`  (always ≥ MarketHealth)

**Unit rules:** `MarketHealth` and `BorrowHealth` are health factors (ratios); the liquidation line is `1.0`; display them as a factor like `1.80×`, never as a percentage and never compared against 100%. `ReputationHealth` is the only value shown as a percentage (0–100%).

## Liquidation rule

Trigger liquidation **if and only if**:
`LTV > ELT`  (equivalently `BorrowHealth < 1.0`)

No other trigger exists. Trust Score never causes liquidation directly.

## Status system (based on Borrow Health)

| Borrow Health | Status |
|---|---|
| > 1.5 | 🟢 Healthy |
| 1.0 – 1.5 | 🟡 Warning |
| < 1.0 | 🔴 Liquidation Risk |

## UI — replace existing components

Remove: "Liquidation Risk", "Liquidation Simulator", and the simple LTV warnings.
Add a new section titled **"Borrow Health Monitor"** containing three cards plus a Borrow Power readout.

**Reference worked example** (use these for consistent mock values): Collateral = $10,000, Debt = $5,000, TrustScore = 850 → R = 0.85, ELT = 108.57%, LTV = 50%, MaxBorrowLTV = 103.57% (MaxBorrow = $10,357) → MarketHealth = 1.60, ReputationHealth = 85%, BorrowHealth = 2.17 → 🟢 Healthy.

Cards:
- **Market Health** — value `1.60×`; subtitle: "Baseline financial safety from collateral vs. debt. Liquidates at 1.0."
- **Reputation Health** — value `85%`; subtitle: "Your borrowing strength from Trust Score and verified credentials."
- **Borrow Health** (primary / highlighted) — value `2.17×`; badge `🟢 Healthy Position`; subtitle: "Your true safety — collateral strengthened by reputation."

Borrow Power readout (placed near the cards): show current Debt vs Max Borrow and available headroom, plus the active Effective LT. Example: "$5,000 / $10,357 borrowed · $5,357 available · Effective LT 108.57%".

## Borrow Health breakdown (visual flow)

```
Collateral Value + Debt ──► Market Health (base 80% LT)
                                                  │
Trust Score ─► Reputation Health ─► Effective LT ─┘
                                                  ▼
                                            Borrow Health
```

Caption: a higher Trust Score raises the Effective Liquidation Threshold, which lifts both borrow power and Borrow Health above the raw Market Health baseline.

## Info box — "How liquidation works"

A Velixir position is protected by collateral, and your reputation acts as additional collateral. A higher Trust Score raises your effective liquidation threshold, increasing your borrowing power and capital efficiency. A lower Trust Score reduces borrowing capacity, so the same loan needs more collateral. Liquidation happens only when your Current LTV rises above your Effective Liquidation Threshold — reputation alone never triggers it. Maintaining a strong reputation gives you more borrowing room and a larger safety margin before liquidation.

## Design direction

Premium institutional risk-dashboard aesthetic. Emphasize: trust-driven lending, reputation as borrowing power and capital efficiency, modern DeFi analytics, clear health-factor gauges (rings or bars referenced against the 1.0 and 1.5 lines), and a visual explanation of how a higher Trust Score lifts the liquidation threshold. The interface must immediately communicate that Velixir is a reputation-powered lending system where digital trust is treated as real collateral — not a flat over-collateralized protocol.
