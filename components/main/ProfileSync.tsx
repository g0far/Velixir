"use client";

import { useEffect, useState } from "react";
import { useWalletStore } from "@/lib/store/walletStore";
import { useBalanceStore } from "@/lib/store/balanceStore";
import { useTrustStore, DEFAULT_CREDENTIALS } from "@/lib/store/trustStore";
import { useBorrowStore } from "@/lib/store/borrowStore";
import { useHistoryStore } from "@/lib/store/historyStore";
import { useReputationStore } from "@/lib/store/reputationStore";
import { saveWalletProfile, getWalletProfile } from "@/lib/store/profileRegistryStore";
import { toast } from "@/lib/store/toastStore";

export default function ProfileSync() {
  const connectedAddress = useWalletStore((s) => s.connected ? s.address : "");
  const isSimulated = useWalletStore((s) => s.isSimulated);
  const [activeAddress, setActiveAddress] = useState<string>("");
  const [mounted, setMounted] = useState<boolean>(false);

  const credentials = useTrustStore((s) => s.credentials);
  const positions = useBorrowStore((s) => s.positions);
  const closedPositions = useBorrowStore((s) => s.closedPositions);
  const transactions = useHistoryStore((s) => s.transactions);
  const reputationPoints = useReputationStore((s) => s.getAddressReputationPoints(connectedAddress));

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bootstrap wallet balances globally so every page (swap, borrow, liquidity)
  // reads the same figures: real on-chain amounts for a connected wallet, or the
  // shared demo seed for a simulated session.
  useEffect(() => {
    if (!mounted) return;
    const { connected } = useWalletStore.getState();
    if (!connected) return;
    if (isSimulated) {
      useBalanceStore.getState().seedSimulated();
    } else if (connectedAddress) {
      useBalanceStore.getState().refresh();
    }
  }, [mounted, isSimulated, connectedAddress]);

  // Sync / Switch Profile logic
  useEffect(() => {
    if (!mounted) return;

    if (connectedAddress !== activeAddress) {
      // 1. Save previous wallet state if we had one active
      if (activeAddress) {
        const prevCredentials = useTrustStore.getState().credentials;
        const prevPositions = useBorrowStore.getState().positions;
        const prevClosedPositions = useBorrowStore.getState().closedPositions;
        const prevTransactions = useHistoryStore.getState().transactions;
        const prevRepPoints = useReputationStore.getState().getAddressReputationPoints(activeAddress);

        saveWalletProfile(
          activeAddress,
          prevCredentials,
          prevPositions,
          prevClosedPositions,
          prevTransactions,
          prevRepPoints
        );
      }

      // 2. Load or create profile for the new wallet
      if (connectedAddress) {
        const existingProfile = getWalletProfile(connectedAddress);
        if (existingProfile) {
          useTrustStore.getState().setCredentials(existingProfile.credentials);
          useBorrowStore.getState().setPositionsState(existingProfile.positions, existingProfile.closedPositions);
          useHistoryStore.getState().setTransactions(existingProfile.transactions);
          toast.success("Reputation Profile Loaded", `Welcome back! Tier: ${existingProfile.reputationTier}`);
        } else {
          useTrustStore.getState().setCredentials(DEFAULT_CREDENTIALS);
          useBorrowStore.getState().setPositionsState([], []);
          useHistoryStore.getState().setTransactions([]);

          const currentRepPoints = useReputationStore.getState().getAddressReputationPoints(connectedAddress);
          saveWalletProfile(
            connectedAddress,
            DEFAULT_CREDENTIALS,
            [],
            [],
            [],
            currentRepPoints
          );
          toast.success("New Reputation Profile Created", "Your starting score is 300 (Neutral)");
        }
        setActiveAddress(connectedAddress);
      } else {
        // No connected wallet
        useTrustStore.getState().setCredentials(DEFAULT_CREDENTIALS);
        useBorrowStore.getState().setPositionsState([], []);
        useHistoryStore.getState().setTransactions([]);
        setActiveAddress("");
      }
    }
  }, [connectedAddress, activeAddress, mounted]);

  // Keep active profile synced on any state changes
  useEffect(() => {
    if (!mounted || !connectedAddress || connectedAddress !== activeAddress) return;

    const currentRepPoints = useReputationStore.getState().getAddressReputationPoints(connectedAddress);
    saveWalletProfile(
      connectedAddress,
      credentials,
      positions,
      closedPositions,
      transactions,
      currentRepPoints
    );
  }, [credentials, positions, closedPositions, transactions, reputationPoints, connectedAddress, activeAddress, mounted]);

  return null;
}
