// ---------------------------------------------------------------------------
// Wallet + on-chain transaction layer — Solana Devnet via Phantom.
//
// "Real on-chain interaction": every Velixir action (swap / borrow / repay /
// add-collateral / close) is submitted as an actual Solana Devnet transaction.
// The transaction is a 0-lamport self-transfer carrying an SPL Memo that
// records the action, so it costs only the network fee, keeps the user's
// funds, and is verifiable on Solana Explorer (devnet).
// ---------------------------------------------------------------------------
import {
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getConnection,
  MEMO_PROGRAM_ID,
  explorerTxUrl,
  explorerAddrUrl,
  shortAddress,
  SOLANA_DEVNET_CONFIG,
} from "./solana";

export { explorerTxUrl, explorerAddrUrl, shortAddress, SOLANA_DEVNET_CONFIG };

// Minimal Solana wallet provider shape covering both Phantom and Solflare
// (avoids pulling in @solana/wallet-adapter). Both inject a window provider with
// connect/signTransaction; Solflare's connect() resolves without a payload, so
// the public key is read from provider.publicKey afterwards.
interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toString(): string } | null;
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: PublicKey } | void>;
  disconnect: () => Promise<void>;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string }>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeAllListeners?: (event?: string) => void;
}
// Back-compat alias for existing imports.
type PhantomProvider = SolanaProvider;

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
  }
}

export type WalletName = "Phantom" | "Solflare";

/** Human-readable name for whichever provider is active. */
export function providerName(p: SolanaProvider | null): WalletName | null {
  if (!p) return null;
  if (p.isSolflare) return "Solflare";
  if (p.isPhantom) return "Phantom";
  return null;
}

/**
 * Resolve an injected Solana provider. Prefers a wallet matching `prefer`
 * (the connector the user picked), then any already-connected provider, then
 * Phantom, then Solflare. Works with both Phantom and Solflare extensions.
 */
export function getProvider(prefer?: WalletName): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  const phantom = window.phantom?.solana?.isPhantom
    ? window.phantom.solana
    : window.solana?.isPhantom
    ? window.solana
    : null;
  const solflare = window.solflare?.isSolflare ? window.solflare : null;

  if (prefer === "Phantom" && phantom) return phantom;
  if (prefer === "Solflare" && solflare) return solflare;
  // Prefer one that's already connected (keeps the active session stable).
  if (phantom?.isConnected) return phantom;
  if (solflare?.isConnected) return solflare;
  return phantom ?? solflare ?? null;
}

/** Connect Phantom/Solflare and return the base58 public key. */
export async function connectWallet(prefer?: WalletName): Promise<string> {
  const provider = getProvider(prefer);
  if (!provider) {
    throw new Error("No Solana wallet found. Install Phantom or Solflare to use Solana Devnet.");
  }
  const resp = await provider.connect();
  // Phantom returns { publicKey }; Solflare resolves void and exposes it on the provider.
  const pubkey =
    (resp && "publicKey" in resp ? resp.publicKey?.toString() : undefined) ??
    provider.publicKey?.toString();
  if (!pubkey) throw new Error("No account authorized.");
  return pubkey;
}

/** Devnet SOL balance for an address. */
export async function getBalanceSol(address: string): Promise<number> {
  try {
    const lamports = await getConnection().getBalance(new PublicKey(address));
    return lamports / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

/**
 * Request a devnet airdrop so the user can pay transaction fees. Free devnet
 * faucets are rate-limited; returns the signature on success or null on
 * failure (caller can point the user at a public faucet).
 */
export async function requestDevnetAirdrop(address: string, sol = 1): Promise<string | null> {
  try {
    const conn = getConnection();
    const sig = await conn.requestAirdrop(new PublicKey(address), sol * LAMPORTS_PER_SOL);
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    return sig;
  } catch {
    return null;
  }
}

export type OnChainAction = "SWAP" | "BORROW" | "REPAY" | "ADD_COLLATERAL" | "CLOSE" | "STAKE" | "UNSTAKE" | "CLAIM";

export interface TxAction {
  action: OnChainAction;
  /** Primary token (asset sold / collateral / borrowed). */
  symbol: string;
  /** Counterpart token (swap target). Optional for non-swap actions. */
  toSymbol?: string;
  amount: string;
  /** Connected wallet (base58). */
  from: string;
}

/**
 * Build, sign (Phantom) and submit a real Solana Devnet transaction that
 * records the action via the SPL Memo program. Returns the tx signature.
 *
 * Submission goes through the dApp's devnet RPC (signTransaction +
 * sendRawTransaction) so the action always lands on devnet regardless of the
 * cluster Phantom's UI is pointed at. Falls back to signAndSendTransaction.
 */
export async function sendActionTx({ action, symbol, toSymbol, amount, from }: TxAction): Promise<string> {
  const provider = getProvider();
  if (!provider) throw new Error("No Solana wallet found.");

  const conn = getConnection();
  const fromPubkey = new PublicKey(from);

  const memo = toSymbol
    ? `VELIXIR:${action}:${symbol}->${toSymbol}:${amount}`
    : `VELIXIR:${action}:${symbol}:${amount}`;

  const tx = new Transaction().add(
    // 0-lamport self-transfer — only the network fee is spent.
    SystemProgram.transfer({ fromPubkey, toPubkey: fromPubkey, lamports: 0 }),
    // Memo instruction carrying the readable action record.
    new TransactionInstruction({
      keys: [{ pubkey: fromPubkey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, "utf8"),
    })
  );

  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPubkey;

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

/** Poll the devnet for confirmation so the UI can flip pending → confirmed. */
export async function waitForReceipt(
  signature: string,
  { timeoutMs = 90_000, intervalMs = 2_000 } = {}
): Promise<{ status: "success" | "failed" }> {
  const conn = getConnection();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { value } = await conn.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (value) {
      if (value.err) return { status: "failed" };
      if (value.confirmationStatus === "confirmed" || value.confirmationStatus === "finalized") {
        return { status: "success" };
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for confirmation.");
}
