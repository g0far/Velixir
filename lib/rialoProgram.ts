// Client for the on-chain Rialo-Devnet lending program (Anchor).
// Builds real initialize_pool / deposit / borrow / repay / withdraw instructions
// and submits them through the dApp's devnet RPC + connected wallet.
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { getConnection } from "./solana";
import { getProvider } from "./wallet";

export const RIALO_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5PB3w7dzxaRvc6pYJyhPTzuiwro5F8f4LMLW1dkAK7cU"
);

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");

export type RialoSymbol = "SOL" | "USDC" | "USDT" | "RLO";

export interface RialoPoolCfg {
  symbol: RialoSymbol;
  mint: PublicKey;
  decimals: number;
  ltvBps: number;
  thresholdBps: number;
  isNative: boolean;
}

export const RIALO_POOLS: Record<RialoSymbol, RialoPoolCfg> = {
  SOL:  { symbol: "SOL",  mint: NATIVE_MINT, decimals: 9, ltvBps: 8000, thresholdBps: 8500, isNative: true },
  USDC: { symbol: "USDC", mint: new PublicKey("9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV"), decimals: 6, ltvBps: 9000, thresholdBps: 9500, isNative: false },
  USDT: { symbol: "USDT", mint: new PublicKey("8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod"), decimals: 6, ltvBps: 9000, thresholdBps: 9500, isNative: false },
  RLO:  { symbol: "RLO",  mint: new PublicKey("375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6"), decimals: 9, ltvBps: 7500, thresholdBps: 8000, isNative: false },
};

// Anchor 8-byte instruction discriminators (sha256("global:<ix>")[..8]).
const DISC = {
  deposit:  Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  borrow:   Buffer.from([228, 253, 131, 202, 207, 116, 89, 18]),
  repay:    Buffer.from([234, 103, 67, 82, 208, 234, 219, 166]),
  withdraw: Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]),
};

export type RialoAction = "deposit" | "borrow" | "repay" | "withdraw";

function poolPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("pool"), mint.toBuffer()], RIALO_PROGRAM_ID)[0];
}
function vaultPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), mint.toBuffer()], RIALO_PROGRAM_ID)[0];
}
function positionPda(pool: PublicKey, user: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), pool.toBuffer(), user.toBuffer()],
    RIALO_PROGRAM_ID
  )[0];
}
export function associatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

/** Convert a human amount to base units (u64) as an 8-byte LE buffer. */
function amountLe(amount: string | number, decimals: number): Buffer {
  const [w, f = ""] = String(amount).split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  // base units = whole digits followed by exactly `decimals` fractional digits.
  const digits = (w || "0") + frac;
  const base = BigInt(digits.replace(/^0+(?=d)/, ""));
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(base);
  return b;
}

/** Build one of the four user instructions. */
export function buildActionIx(
  action: RialoAction,
  cfg: RialoPoolCfg,
  user: PublicKey,
  amount: string | number
): TransactionInstruction {
  const pool = poolPda(cfg.mint);
  const vault = vaultPda(cfg.mint);
  const position = positionPda(pool, user);
  const userToken = associatedTokenAddress(cfg.mint, user);
  const data = Buffer.concat([DISC[action], amountLe(amount, cfg.decimals)]);

  const keys = [
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: pool, isSigner: false, isWritable: true },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: position, isSigner: false, isWritable: true },
    { pubkey: userToken, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  // deposit also needs the System program (position is init_if_needed).
  if (action === "deposit") {
    keys.push({ pubkey: SystemProgram.programId, isSigner: false, isWritable: false });
  }
  return new TransactionInstruction({ programId: RIALO_PROGRAM_ID, keys, data });
}

/** Build, sign (wallet) and submit a real program transaction. Returns signature. */
export async function sendRialoAction(
  action: RialoAction,
  symbol: RialoSymbol,
  amount: string | number
): Promise<string> {
  const provider = getProvider();
  if (!provider?.publicKey) throw new Error("No Solana wallet connected.");
  const cfg = RIALO_POOLS[symbol];
  if (!cfg) throw new Error(`No Rialo pool for ${symbol}.`);

  const conn = getConnection();
  const user = new PublicKey(provider.publicKey.toString());
  const ix = buildActionIx(action, cfg, user, amount);

  const tx = new Transaction().add(ix);
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = user;

  if (provider.signTransaction) {
    const signed = await provider.signTransaction(tx);
    return conn.sendRawTransaction(signed.serialize());
  }
  if (provider.signAndSendTransaction) {
    const { signature } = await provider.signAndSendTransaction(tx);
    return signature;
  }
  throw new Error("Wallet cannot sign transactions.");
}

export { SYSVAR_RENT_PUBKEY, poolPda, vaultPda, positionPda };
