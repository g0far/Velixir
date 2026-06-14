import { BASE_SEPOLIA_CONFIG } from "@/constants/market";

// Minimal EIP-1193 provider shape (avoids pulling in a web3 dependency).
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const BASE_SEPOLIA_HEX_CHAIN = "0x" + BASE_SEPOLIA_CONFIG.chainId.toString(16); // 0x14a34

export function getProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

export function explorerTxUrl(hash: string): string {
  return `${BASE_SEPOLIA_CONFIG.explorerUrl}/tx/${hash}`;
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Add or switch the wallet to Base Sepolia. */
async function ensureBaseSepolia(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_HEX_CHAIN }],
    });
  } catch (err) {
    // 4902 = chain not added to the wallet yet → add it, then it's selected.
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BASE_SEPOLIA_HEX_CHAIN,
            chainName: "Base Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [BASE_SEPOLIA_CONFIG.rpcUrl],
            blockExplorerUrls: [BASE_SEPOLIA_CONFIG.explorerUrl],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

/** Connect the wallet and make sure it's on Base Sepolia. Returns the address. */
export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No wallet found. Install MetaMask to interact with Base Sepolia.");
  }
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("No account authorized.");
  await ensureBaseSepolia(provider);
  return accounts[0];
}

function utf8ToHex(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let hex = "0x";
  bytes.forEach((b) => (hex += b.toString(16).padStart(2, "0")));
  return hex;
}

export interface TxAction {
  action: "SWAP";
  /** Token being sold. */
  symbol: string;
  /** Token being bought (swap only). */
  toSymbol: string;
  amount: string;
  from: string;
}

/**
 * Sends a real Base Sepolia transaction: a 0-value self-transfer whose calldata
 * records the swap intent. It costs only gas, keeps the user's funds, and shows
 * up in the Base Sepolia block explorer with a readable input memo.
 */
export async function sendActionTx({ action, symbol, toSymbol, amount, from }: TxAction): Promise<string> {
  const provider = getProvider();
  if (!provider) throw new Error("No wallet found.");

  const memo = `VELIXIR:${action}:${symbol}->${toSymbol}:${amount}`;
  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: from, // self-transfer — only gas is spent
        value: "0x0",
        data: utf8ToHex(memo),
      },
    ],
  })) as string;

  return txHash;
}

/** Poll for the receipt so we can flip the UI from pending → confirmed. */
export async function waitForReceipt(
  hash: string,
  { timeoutMs = 90_000, intervalMs = 3_000 } = {}
): Promise<{ status: "success" | "failed" }> {
  const provider = getProvider();
  if (!provider) throw new Error("No wallet found.");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    })) as { status?: string } | null;

    if (receipt) {
      return { status: receipt.status === "0x1" ? "success" : "failed" };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for confirmation.");
}
