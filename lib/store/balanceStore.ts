import { create } from 'zustand';
import { getWalletBalances, type BalanceMap } from '../balances';
import { useWalletStore } from './walletStore';

// Demo balances shown for the simulated (no real wallet) session so the swap UI
// has realistic figures and reacts to swaps. SOL is sourced live from the wallet
// store so the navbar and the panel always agree.
const SIMULATED_SEED: BalanceMap = { USDC: 250, USDT: 250, RLO: 1500, BTC: 0.45, LP: 500 };

interface BalanceState {
  balances: BalanceMap;
  loading: boolean;
  lastUpdate: number;
  seeded: boolean;
  /** Re-read real on-chain balances for the connected wallet. No-op when simulated. */
  refresh: () => Promise<void>;
  /** Poll a few times after a tx so the wallet's settled balance is reflected. */
  refreshSoon: (delayMs?: number) => void;
  /** Seed the demo balances once for a simulated session. */
  seedSimulated: () => void;
  /**
   * Optimistically nudge balances so the UI reflects a swap the instant it
   * confirms — before the on-chain refresh lands. SOL is mirrored to the wallet
   * store so the navbar and swap panel stay in lock-step.
   */
  applyDelta: (deltas: Record<string, number>) => void;
  get: (symbol: string) => number;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balances: { SOL: 0, USDC: 0, USDT: 0, RLO: 0 },
  loading: false,
  lastUpdate: 0,
  seeded: false,

  refresh: async () => {
    const { connected, address, isSimulated } = useWalletStore.getState();
    if (!connected || !address || isSimulated) return;
    set({ loading: true });
    try {
      const balances = await getWalletBalances(address);
      set({ balances, loading: false, lastUpdate: Date.now() });
      // Keep the wallet store's SOL display in sync with the real balance.
      useWalletStore.setState({ balance: (balances.SOL ?? 0).toFixed(4) });
    } catch {
      set({ loading: false });
    }
  },

  // Devnet confirmation + RPC propagation can lag several seconds (and the public
  // RPC is frequently rate-limited), so a single refresh often reads the pre-swap
  // balance. Poll a few times so the displayed balance converges to the settled
  // on-chain value without the user having to reload.
  refreshSoon: (delayMs = 1200) => {
    [delayMs, delayMs + 2500, delayMs + 6000].forEach((ms) =>
      setTimeout(() => get().refresh(), ms)
    );
  },

  seedSimulated: () => {
    if (get().seeded) return;
    const sol = parseFloat(useWalletStore.getState().balance) || 0;
    set({
      balances: { SOL: sol, ...SIMULATED_SEED },
      seeded: true,
      lastUpdate: Date.now(),
    });
  },

  applyDelta: (deltas) => {
    const next = { ...get().balances };
    for (const [sym, d] of Object.entries(deltas)) {
      const key = sym.toUpperCase();
      next[key] = Math.max(0, (next[key] ?? 0) + d);
    }
    set({ balances: next });
    if (typeof next.SOL === 'number') {
      useWalletStore.setState({ balance: next.SOL.toFixed(4) });
    }
  },

  get: (symbol: string) => get().balances[symbol.toUpperCase()] ?? 0,
}));
