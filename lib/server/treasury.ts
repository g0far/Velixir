// ---------------------------------------------------------------------------
// Server-only treasury settlement builder (Solana Devnet).
//
// Shared by /api/swap and /api/borrow. Builds ONE atomic transaction made of
// "legs" — tokens moving user->treasury ("in") and treasury->user ("out") —
// fee payer = user, partially signed by the treasury. The client adds the user
// signature and submits, so the user's real wallet balances change on-chain.
//
// The treasury secret lives only in TREASURY_SECRET_KEY (never NEXT_PUBLIC).
// ---------------------------------------------------------------------------
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  createMintToInstruction,
  getMint,
} from "@solana/spl-token";

export const RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  ? `https://solana-devnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
  : "https://api.devnet.solana.com";

export interface TokenCfg {
  symbol: string;
  mint: PublicKey | null; // null = native SOL
  decimals: number;
  native: boolean;
  coingeckoId: string | null;
}

export const TOKENS: Record<string, TokenCfg> = {
  SOL: { symbol: "SOL", mint: null, decimals: 9, native: true, coingeckoId: "solana" },
  USDC: { symbol: "USDC", mint: new PublicKey("9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV"), decimals: 6, native: false, coingeckoId: "usd-coin" },
  USDT: { symbol: "USDT", mint: new PublicKey("8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod"), decimals: 6, native: false, coingeckoId: "tether" },
  RLO: { symbol: "RLO", mint: new PublicKey("375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6"), decimals: 9, native: false, coingeckoId: null },
};

// RLO live price source: Raydium USDC/RLO pool vault reserves.
const RLO_USDC_VAULT = "7NkRCLvggVvTXvRpfJuRVJEY1zV1V9J7g3rLamLMdUhW";
const RLO_RLO_VAULT = "4gYx6tTudiEw7Wvf4CtvGuF3iaZ8uAJVYhcXyGWBTD99";

let _conn: Connection | null = null;
export function conn(): Connection {
  if (!_conn) _conn = new Connection(RPC_URL, "confirmed");
  return _conn;
}

export function loadTreasury(): Keypair | null {
  const raw = process.env.TREASURY_SECRET_KEY?.trim();
  if (!raw) return null;
  try {
    if (raw.startsWith("[")) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bs58 = require("bs58");
    const decoded = bs58.default ? bs58.default.decode(raw) : bs58.decode(raw);
    return Keypair.fromSecretKey(Uint8Array.from(decoded));
  } catch {
    return null;
  }
}

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  return json?.result;
}

/** Live USD prices for SOL/USDC/USDT (CoinGecko) and RLO (Raydium reserves). */
export async function getPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = { USDC: 1, USDT: 1 };
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,tether&vs_currencies=usd",
      { cache: "no-store" }
    );
    if (r.ok) {
      const j = await r.json();
      if (j?.solana?.usd) prices.SOL = j.solana.usd;
      if (j?.["usd-coin"]?.usd) prices.USDC = j["usd-coin"].usd;
      if (j?.tether?.usd) prices.USDT = j.tether.usd;
    }
  } catch {
    /* defaults below */
  }
  if (!prices.SOL) prices.SOL = 150;
  try {
    const result = (await rpc("getMultipleAccounts", [
      [RLO_USDC_VAULT, RLO_RLO_VAULT],
      { encoding: "jsonParsed" },
    ])) as { value?: Array<{ data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number } } } } }> } | null;
    const accts = result?.value;
    const usdc = accts?.[0]?.data?.parsed?.info?.tokenAmount?.uiAmount;
    const rlo = accts?.[1]?.data?.parsed?.info?.tokenAmount?.uiAmount;
    if (typeof usdc === "number" && typeof rlo === "number" && rlo > 0) {
      prices.RLO = (usdc / rlo) * (prices.USDC || 1);
    }
  } catch {
    /* leave RLO undefined */
  }
  if (!prices.RLO) prices.RLO = 0.968;
  return prices;
}

export function toBaseUnits(amountUi: number, decimals: number): bigint {
  const fixed = amountUi.toFixed(decimals);
  const [w, f = ""] = fixed.split(".");
  const digits = (w === "0" ? "" : w) + f.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(digits || "0");
}

export interface SettlementLeg {
  /** "in" = user -> treasury; "out" = treasury -> user. */
  direction: "in" | "out";
  symbol: string;
  amount: number; // human units
}

/**
 * Build the atomic, treasury-cosigned settlement transaction for the given legs.
 * Returns the base64 tx (fee payer = user, treasury signature attached) ready
 * for the wallet to add the user signature and submit.
 */
export async function buildSettlementTx(
  user: PublicKey,
  legs: SettlementLeg[]
): Promise<{ b64: string; treasury: string }> {
  const treasury = loadTreasury();
  if (!treasury) throw new Error("TREASURY_NOT_CONFIGURED");

  const c = conn();
  const tx = new Transaction();

  for (const leg of legs) {
    const cfg = TOKENS[leg.symbol.toUpperCase()];
    if (!cfg) throw new Error(`Unsupported token: ${leg.symbol}`);
    if (!Number.isFinite(leg.amount) || leg.amount <= 0) continue;

    if (leg.direction === "in") {
      // user -> treasury
      if (cfg.native) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: user,
            toPubkey: treasury.publicKey,
            lamports: Number(toBaseUnits(leg.amount, 9)),
          })
        );
      } else {
        const mint = cfg.mint!;
        const userAta = getAssociatedTokenAddressSync(mint, user);
        const treAta = getAssociatedTokenAddressSync(mint, treasury.publicKey);
        tx.add(createAssociatedTokenAccountIdempotentInstruction(user, treAta, treasury.publicKey, mint));
        tx.add(
          createTransferInstruction(userAta, treAta, user, toBaseUnits(leg.amount, cfg.decimals), [], TOKEN_PROGRAM_ID)
        );
      }
    } else {
      // treasury -> user
      if (cfg.native) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: treasury.publicKey,
            toPubkey: user,
            lamports: Number(toBaseUnits(leg.amount, 9)),
          })
        );
      } else {
        const mint = cfg.mint!;
        const userAta = getAssociatedTokenAddressSync(mint, user);
        tx.add(createAssociatedTokenAccountIdempotentInstruction(user, userAta, user, mint));

        let isMintAuthority = false;
        try {
          const mintInfo = await getMint(c, mint);
          isMintAuthority = !!mintInfo.mintAuthority && mintInfo.mintAuthority.equals(treasury.publicKey);
        } catch {
          isMintAuthority = false;
        }

        const outBase = toBaseUnits(leg.amount, cfg.decimals);
        if (isMintAuthority) {
          tx.add(createMintToInstruction(mint, userAta, treasury.publicKey, outBase, [], TOKEN_PROGRAM_ID));
        } else {
          const treAta = getAssociatedTokenAddressSync(mint, treasury.publicKey);
          tx.add(createTransferInstruction(treAta, userAta, treasury.publicKey, outBase, [], TOKEN_PROGRAM_ID));
        }
      }
    }
  }

  if (tx.instructions.length === 0) throw new Error("No settlement legs.");

  const { blockhash } = await c.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = user;
  tx.partialSign(treasury);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return { b64: serialized.toString("base64"), treasury: treasury.publicKey.toBase58() };
}
