// Treasury-sponsored "add token to wallet" — creates the user's associated token
// account so the SPL token shows up in their wallet. The treasury pays rent+fee
// (user needs no SOL); a memo forces the user's signature so the wallet still
// shows an approval popup. Returns { alreadyExists: true } when nothing to do.
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildAddTokenTx } from "@/lib/server/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  let body: { user?: string; symbol?: string };
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
  const symbol = String(body.symbol || "");
  if (!symbol) return NextResponse.json({ error: "Missing token symbol." }, { status: 400 });

  try {
    const built = await buildAddTokenTx(user, symbol);
    if (!built) return NextResponse.json({ alreadyExists: true });
    return NextResponse.json({ tx: built.b64, treasury: built.treasury, amount: built.amount });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "TREASURY_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Treasury not configured. Set TREASURY_SECRET_KEY to sponsor token accounts." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg || "Add-token build failed." }, { status: 500 });
  }
}
