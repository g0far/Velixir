// One-click treasury faucet — funds the user with 1 SOL + 2000 USDC + 2000 USDT
// + 2000 RLO in a single treasury-sponsored transaction. The treasury pays all
// rent + fees (user needs no SOL); a memo forces the user's signature so the
// wallet still shows an approval popup. Returns { alreadyClaimed: true } when the
// wallet already holds every faucet asset.
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildClaimFaucetTx } from "@/lib/server/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  let body: { user?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let user: PublicKey;
  try {
    user = new PublicKey(String(body.user));
  } catch {
    return NextResponse.json({ error: "Invalid user address." }, { status: 400 });
  }

  try {
    const built = await buildClaimFaucetTx(user);
    if (!built) return NextResponse.json({ alreadyClaimed: true });
    return NextResponse.json({ tx: built.b64, treasury: built.treasury, claimed: built.claimed });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "TREASURY_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Treasury not configured. Set TREASURY_SECRET_KEY to fund the faucet." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg || "Claim-faucet build failed." }, { status: 500 });
  }
}
