import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ReputationState {
  getAddressReputationPoints: (address: string) => number;
}

export const useReputationStore = create<ReputationState>()(
  persist(
    () => ({
      getAddressReputationPoints: (_address: string) => 0,
    }),
    {
      name: 'velixir-reputation-store-v2',
    }
  )
);
