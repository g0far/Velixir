import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, TxAction } from '../types/borrow';
import { useWalletStore } from './walletStore';

function randomTxHash(): string {
  const hex = '0123456789abcdef';
  let out = '0x';
  for (let i = 0; i < 64; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

interface HistoryState {
  transactions: Transaction[];
  record: (entry: {
    action: TxAction;
    asset: string;
    amount: number;
    positionId: string;
    signature?: string;
  }) => Transaction;
  setTransactions: (transactions: Transaction[]) => void;
  /** Clear only the given wallet's entries; omit address to clear everything. */
  clear: (address?: string) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      transactions: [],
      record: ({ action, asset, amount, positionId, signature }) => {
        const tx: Transaction = {
          id: `tx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          action,
          asset,
          amount,
          positionId,
          timestamp: Date.now(),
          // Use the real Solana signature when present; otherwise a mock hash
          // (simulated session — not on any explorer).
          txHashMock: signature ?? randomTxHash(),
          signature,
          onchain: !!signature,
          // Stamp the active wallet so history can be shown per wallet.
          address: useWalletStore.getState().address || undefined,
        };
        // newest first
        set({ transactions: [tx, ...get().transactions] });
        return tx;
      },
      setTransactions: (transactions) => set({ transactions }),
      clear: (address) =>
        set((s) =>
          address
            ? { transactions: s.transactions.filter((t) => t.address?.toLowerCase() !== address.toLowerCase()) }
            : { transactions: [] }
        ),
    }),
    { name: 'velixir-history' }
  )
);
