import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SwapTx } from '../../constants/market';

// Per-wallet swap history for the Market page. Persisted to localStorage so a
// wallet that has traded keeps its "Recent Swaps" after disconnect/reconnect
// (and across full page reloads). Keyed by lowercased address.
interface SwapHistoryState {
  byAddress: Record<string, SwapTx[]>;
  record: (address: string, tx: SwapTx) => void;
  getSwaps: (address: string) => SwapTx[];
  clear: (address: string) => void;
}

const MAX_PER_WALLET = 100;

export const useSwapHistoryStore = create<SwapHistoryState>()(
  persist(
    (set, get) => ({
      byAddress: {},
      record: (address, tx) => {
        if (!address) return;
        const key = address.toLowerCase();
        set((state) => {
          const next = [tx, ...(state.byAddress[key] || [])].slice(0, MAX_PER_WALLET);
          return { byAddress: { ...state.byAddress, [key]: next } };
        });
      },
      getSwaps: (address) => {
        if (!address) return [];
        return get().byAddress[address.toLowerCase()] || [];
      },
      clear: (address) => {
        if (!address) return;
        const key = address.toLowerCase();
        set((state) => {
          const next = { ...state.byAddress };
          delete next[key];
          return { byAddress: next };
        });
      },
    }),
    { name: 'velixir-swap-history' }
  )
);
