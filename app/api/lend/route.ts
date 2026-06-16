// Treasury-settled lending supply / withdraw — makes the Lending Pools real.
//
//   action "supply":   asset moves user -> treasury (deposited into the pool)
//   action "withdraw": principal moves treasury -> user (returned to wallet)
//
// Same treasury co-signer pattern as /api/swap and /api/borrow: the treasury
// partially signs, the wallet adds the user signature and submits, so the
// supplied/withdrawn tokens actually move on-chain (visible in Phantom/Solflare).
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { TOKENS, buildSettlementTx, type SettlementLeg } from "@/lib/server/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  let body: {
    user?: string;
    action?: string;
    symbol?: string;
    amount?: number | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body.action || "");
  if (action !== "supply" && action !== "withdraw")
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });

  let user: PublicKey;
  try {
    user = new PublicKey(String(body.user));
  } catch {
    return NextResponse.json({ error: "Invalid user address." }, { status: 400 });
  }

  const symbol = String(body.symbol || "").toUpperCase();
  const amount = Number(body.amount);
  if (!TOKENS[symbol])
    return NextResponse.json({ error: `${symbol || "Token"} lending isn't available on devnet.` }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });

  const legs: SettlementLeg[] = [
    { direction: action === "supply" ? "in" : "out", symbol, amount },
  ];

  try {
    const { b64, treasury } = await buildSettlementTx(user, legs);
    return NextResponse.json({ tx: b64, treasury });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "TREASURY_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Treasury not configured. Set TREASURY_SECRET_KEY to enable real lending." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg || "Lend build failed." }, { status: 500 });
  }
}
