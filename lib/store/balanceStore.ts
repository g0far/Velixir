import { create } from 'zustand';
import { getWalletBalances, type BalanceMap } from '../balances';
import { useWalletStore } from './walletStore';

interface BalanceState {
  balances: BalanceMap;
  loading: boolean;
  lastUpdate: number;
  /** Re-read real on-chain balances for the connected wallet. No-op when simulated. */
  refresh: () => Promise<void>;
  /** Refresh shortly after a tx so the wallet's settled balance is reflected. */
  refreshSoon: (delayMs?: number) => void;
  get: (symbol: string) => number;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balances: { SOL: 0, USDC: 0, USDT: 0, RLO: 0 },
  loading: false,
  lastUpdate: 0,

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

  refreshSoon: (delayMs = 2500) => {
    setTimeout(() => {
      get().refresh();
    }, delayMs);
  },

  get: (symbol: string) => get().balances[symbol.toUpperCase()] ?? 0,
}));
