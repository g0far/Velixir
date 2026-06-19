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
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
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

/** Live USD prices for SOL/USDC/USDT (CoinGecko). RLO is pegged to $1. */
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
  // RLO is pegged to $1 protocol-wide so swap output amounts match the UI.
  prices.RLO = 1;
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

  // Priority fee + a tight compute-unit cap so the settlement is picked up in
  // the next block even when devnet is busy — this is what makes the swapped
  // token actually land in the user's wallet quickly. Cost is paid by the user
  // (fee payer) and is negligible (~0.00001 SOL).
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));

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

  // The first two instructions are the compute-budget directives; anything fewer
  // than three means no actual settlement leg was added.
  if (tx.instructions.length <= 2) throw new Error("No settlement legs.");

  const { blockhash } = await c.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = user;
  // The treasury only needs to sign when it actually moves funds out (a treasury
  // -> user "out" leg). For deposit-only flows (supply / repay = user -> treasury)
  // the user is the sole signer, so signing as treasury would throw "unknown
  // signer". Only co-sign when the treasury is a required signer.
  const treasuryMustSign = legs.some((l) => l.direction === "out" && (l.amount ?? 0) > 0);
  if (treasuryMustSign) tx.partialSign(treasury);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return { b64: serialized.toString("base64"), treasury: treasury.publicKey.toBase58() };
}

const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// Small faucet credited when adding a token, so it shows up in the wallet
// (wallets hide zero-balance SPL accounts). Also handy for testing borrow/supply.
const ADD_TOKEN_FAUCET_UI: Record<string, number> = { USDC: 2000, USDT: 2000, RLO: 1000, SOL: 3 };

/**
 * Build a treasury-SPONSORED "add token" transaction: the treasury pays the rent
 * + fee, creates the user's associated token account, and credits a small faucet
 * amount so the token actually shows in the wallet (wallets hide 0-balance
 * accounts). A memo requires the user's signature, so the wallet shows an
 * approval popup. Returns null when the user already holds a balance.
 */
export async function buildAddTokenTx(
  user: PublicKey,
  symbol: string
): Promise<{ b64: string; treasury: string; amount: number } | null> {
  const treasury = loadTreasury();
  if (!treasury) throw new Error("TREASURY_NOT_CONFIGURED");

  const sym = symbol.toUpperCase();
  const cfg = TOKENS[sym];
  if (!cfg) throw new Error(`Unsupported token: ${symbol}`);

  const c = conn();
  const uiAmount = ADD_TOKEN_FAUCET_UI[sym] ?? 50;

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));

  if (cfg.native) {
    // Once per wallet: skip if the wallet already holds SOL.
    if ((await c.getBalance(user)) > 0) return null;
    // Native SOL faucet — transfer lamports treasury -> user (also funds gas).
    tx.add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: user,
        lamports: Number(toBaseUnits(uiAmount, 9)),
      })
    );
  } else {
    const mint = cfg.mint!;
    const userAta = getAssociatedTokenAddressSync(mint, user);
    // Once per wallet: if the token account already exists, it was already added.
    const existing = await c.getAccountInfo(userAta);
    if (existing) return null;
    const base = toBaseUnits(uiAmount, cfg.decimals);
    // payer = treasury → treasury covers rent + fee (user needs no SOL).
    tx.add(createAssociatedTokenAccountIdempotentInstruction(treasury.publicKey, userAta, user, mint));

    // Credit the faucet: mint when the treasury is the mint authority, else transfer.
    let isMintAuthority = false;
    try {
      const mintInfo = await getMint(c, mint);
      isMintAuthority = !!mintInfo.mintAuthority && mintInfo.mintAuthority.equals(treasury.publicKey);
    } catch {
      isMintAuthority = false;
    }
    if (isMintAuthority) {
      tx.add(createMintToInstruction(mint, userAta, treasury.publicKey, base, [], TOKEN_PROGRAM_ID));
    } else {
      const treAta = getAssociatedTokenAddressSync(mint, treasury.publicKey);
      tx.add(createTransferInstruction(treAta, userAta, treasury.publicKey, base, [], TOKEN_PROGRAM_ID));
    }
  }

  // Force the user's signature so the wallet shows an approval popup.
  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: user, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM,
      data: Buffer.from(`VELIXIR:ADD_TOKEN:${sym}`, "utf8"),
    })
  );

  const { blockhash } = await c.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = treasury.publicKey;
  tx.partialSign(treasury);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return { b64: serialized.toString("base64"), treasury: treasury.publicKey.toBase58(), amount: uiAmount };
}

// One-click faucet amounts (per wallet). Native SOL also funds gas fees.
const CLAIM_FAUCET_UI: Record<string, number> = { SOL: 1, USDC: 2000, USDT: 2000, RLO: 2000 };
// SPL tokens credited by the faucet (SOL is handled natively, separately).
const CLAIM_FAUCET_SPL = ["USDC", "USDT", "RLO"] as const;

/**
 * Build a single treasury-SPONSORED "claim faucet" transaction that funds the
 * user with 1 SOL + 2000 USDC + 2000 USDT + 2000 RLO in ONE wallet approval.
 * The treasury pays all rent + fees and is the fee payer; a memo forces the
 * user's signature so the wallet still shows an approval popup.
 *
 * Strictly ONCE PER WALLET: the first claim creates and credits the user's RLO
 * token account, so the presence of that account is the on-chain "already
 * claimed" marker — any later claim from the same address returns null (blocked).
 */
export async function buildClaimFaucetTx(
  user: PublicKey
): Promise<{ b64: string; treasury: string; claimed: { symbol: string; amount: number }[] } | null> {
  const treasury = loadTreasury();
  if (!treasury) throw new Error("TREASURY_NOT_CONFIGURED");

  const c = conn();

  // Once-per-wallet gate: the RLO token account is created + credited on the
  // first claim, so if it already exists this wallet has already claimed.
  const rloMint = TOKENS.RLO.mint!;
  const rloUserAta = getAssociatedTokenAddressSync(rloMint, user);
  if (await c.getAccountInfo(rloUserAta)) return null; // already claimed — blocked

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));

  const claimed: { symbol: string; amount: number }[] = [];

  // Native SOL — funds gas + balance (also granted on the single claim).
  tx.add(
    SystemProgram.transfer({
      fromPubkey: treasury.publicKey,
      toPubkey: user,
      lamports: Number(toBaseUnits(CLAIM_FAUCET_UI.SOL, 9)),
    })
  );
  claimed.push({ symbol: "SOL", amount: CLAIM_FAUCET_UI.SOL });

  // SPL tokens — created (idempotent) and credited in the same atomic tx.
  for (const sym of CLAIM_FAUCET_SPL) {
    const cfg = TOKENS[sym];
    const mint = cfg.mint!;
    const userAta = getAssociatedTokenAddressSync(mint, user);
    const base = toBaseUnits(CLAIM_FAUCET_UI[sym], cfg.decimals);
    // payer = treasury → treasury covers rent + fee (user needs no SOL).
    tx.add(createAssociatedTokenAccountIdempotentInstruction(treasury.publicKey, userAta, user, mint));

    let isMintAuthority = false;
    try {
      const mintInfo = await getMint(c, mint);
      isMintAuthority = !!mintInfo.mintAuthority && mintInfo.mintAuthority.equals(treasury.publicKey);
    } catch {
      isMintAuthority = false;
    }
    if (isMintAuthority) {
      tx.add(createMintToInstruction(mint, userAta, treasury.publicKey, base, [], TOKEN_PROGRAM_ID));
    } else {
      const treAta = getAssociatedTokenAddressSync(mint, treasury.publicKey);
      tx.add(createTransferInstruction(treAta, userAta, treasury.publicKey, base, [], TOKEN_PROGRAM_ID));
    }
    claimed.push({ symbol: sym, amount: CLAIM_FAUCET_UI[sym] });
  }

  // Force the user's signature so the wallet shows an approval popup.
  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: user, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM,
      data: Buffer.from("VELIXIR:CLAIM_FAUCET", "utf8"),
    })
  );

  const { blockhash } = await c.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = treasury.publicKey;
  tx.partialSign(treasury);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return { b64: serialized.toString("base64"), treasury: treasury.publicKey.toBase58(), claimed };
}
