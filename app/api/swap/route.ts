// Treasury co-signer swap — makes every swap a REAL token move on Devnet.
// See lib/server/treasury.ts for how the atomic, treasury-cosigned transfer is
// built. Pricing is computed server-side so the client can't forge the output.
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { TOKENS, getPrices, buildSettlementTx } from "@/lib/server/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LP_FEE = 0.003; // 0.3% pool fee, mirrors the UI quote

export async function POST(req: NextRequest) {
  let body: { user?: string; fromSymbol?: string; toSymbol?: string; amountIn?: number | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fromSym = String(body.fromSymbol || "").toUpperCase();
  const toSym = String(body.toSymbol || "").toUpperCase();
  const amountIn = Number(body.amountIn);
  if (!TOKENS[fromSym] || !TOKENS[toSym])
    return NextResponse.json({ error: "Unsupported token." }, { status: 400 });
  if (fromSym === toSym) return NextResponse.json({ error: "Tokens must differ." }, { status: 400 });
  if (!Number.isFinite(amountIn) || amountIn <= 0)
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });

  let user: PublicKey;
  try {
    user = new PublicKey(String(body.user));
  } catch {
    return NextResponse.json({ error: "Invalid user address." }, { status: 400 });
  }

  const prices = await getPrices();
  const priceIn = prices[fromSym];
  const priceOut = prices[toSym];
  if (!priceIn || !priceOut)
    return NextResponse.json({ error: "Price unavailable for pair." }, { status: 503 });

  const amountOut = ((amountIn * priceIn) / priceOut) * (1 - LP_FEE);
  if (!Number.isFinite(amountOut) || amountOut <= 0)
    return NextResponse.json({ error: "Computed output is zero." }, { status: 400 });

  try {
    const { b64, treasury } = await buildSettlementTx(user, [
      { direction: "in", symbol: fromSym, amount: amountIn },
      { direction: "out", symbol: toSym, amount: amountOut },
    ]);
    return NextResponse.json({ tx: b64, amountOut, priceIn, priceOut, treasury });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "TREASURY_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Treasury not configured. Set TREASURY_SECRET_KEY in .env.local to enable real swaps." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg || "Swap build failed." }, { status: 500 });
  }
}
