// Treasury-settled borrow / repay — makes the borrow flow move REAL tokens.
//
//   action "borrow":  collateral (user -> treasury) + loan (treasury -> user)
//   action "repay":   repayment (user -> treasury)
//   action "withdraw": collateral returned (treasury -> user)
//
// The borrow concept/UX is unchanged — only the on-chain settlement is real, so
// the borrowed funds land in the wallet and collateral leaves it (visible in
// Phantom/Solflare). Treasury co-signs; the wallet adds the user signature.
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { TOKENS, buildSettlementTx, type SettlementLeg } from "@/lib/server/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BorrowAction = "borrow" | "repay" | "withdraw";

export async function POST(req: NextRequest) {
  let body: {
    user?: string;
    action?: string;
    collateralSymbol?: string;
    collateralAmount?: number | string;
    borrowSymbol?: string;
    borrowAmount?: number | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body.action || "") as BorrowAction;
  if (!["borrow", "repay", "withdraw"].includes(action))
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });

  let user: PublicKey;
  try {
    user = new PublicKey(String(body.user));
  } catch {
    return NextResponse.json({ error: "Invalid user address." }, { status: 400 });
  }

  const colSym = String(body.collateralSymbol || "").toUpperCase();
  const borSym = String(body.borrowSymbol || "").toUpperCase();
  const colAmt = Number(body.collateralAmount);
  const borAmt = Number(body.borrowAmount);

  const legs: SettlementLeg[] = [];
  if (action === "borrow") {
    if (!TOKENS[colSym] || !TOKENS[borSym])
      return NextResponse.json({ error: "Unsupported token." }, { status: 400 });
    if (Number.isFinite(colAmt) && colAmt > 0) legs.push({ direction: "in", symbol: colSym, amount: colAmt });
    if (!Number.isFinite(borAmt) || borAmt <= 0)
      return NextResponse.json({ error: "Invalid borrow amount." }, { status: 400 });
    legs.push({ direction: "out", symbol: borSym, amount: borAmt });
  } else if (action === "repay") {
    if (!TOKENS[borSym]) return NextResponse.json({ error: "Unsupported token." }, { status: 400 });
    if (!Number.isFinite(borAmt) || borAmt <= 0)
      return NextResponse.json({ error: "Invalid repay amount." }, { status: 400 });
    legs.push({ direction: "in", symbol: borSym, amount: borAmt });
  } else {
    // withdraw collateral back to user
    if (!TOKENS[colSym]) return NextResponse.json({ error: "Unsupported token." }, { status: 400 });
    if (!Number.isFinite(colAmt) || colAmt <= 0)
      return NextResponse.json({ error: "Invalid collateral amount." }, { status: 400 });
    legs.push({ direction: "out", symbol: colSym, amount: colAmt });
  }

  try {
    const { b64, treasury } = await buildSettlementTx(user, legs);
    return NextResponse.json({ tx: b64, treasury });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "TREASURY_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Treasury not configured. Set TREASURY_SECRET_KEY in .env.local to enable real borrow." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg || "Borrow build failed." }, { status: 500 });
  }
}
