"use client";

import React, { useState } from "react";
import { Droplets, Loader2 } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { claimFaucet, explorerTxUrl } from "@/lib/wallet";
import { useWalletStore } from "@/lib/store/walletStore";
import { useBalanceStore } from "@/lib/store/balanceStore";

/**
 * Navbar "Claim Faucet" button. One click funds the connected wallet with
 * 1 SOL + 2000 USDC + 2000 USDT + 2000 RLO from the treasury in a single wallet
 * approval — replaces the per-token "Add tokens to your wallet" card.
 */
export default function ClaimFaucet() {
  const [claiming, setClaiming] = useState(false);

  const connected = useWalletStore((s) => s.connected);
  const isSimulated = useWalletStore((s) => s.isSimulated);
  const setModalOpen = useWalletStore((s) => s.setModalOpen);
  const refreshBalancesSoon = useBalanceStore((s) => s.refreshSoon);

  const handleClaim = async () => {
    if (!connected) {
      toast.error("Wallet not connected", "Connect Phantom / Solflare / MetaMask first.");
      setModalOpen(true);
      return;
    }
    if (isSimulated) {
      toast.error("Simulated session", "Connect a real wallet (Phantom / Solflare / MetaMask) to claim the faucet.");
      return;
    }
    setClaiming(true);
    try {
      const res = await claimFaucet();
      if (res) {
        const summary = res.claimed.map((c) => `${c.amount} ${c.symbol}`).join(", ");
        toast.success(
          "Faucet claimed",
          `${summary} credited to your wallet. View: ${explorerTxUrl(res.signature)}`
        );
        refreshBalancesSoon();
      } else {
        toast.info("Already claimed", "Your wallet already holds every faucet asset.");
      }
    } catch (e) {
      const err = e as { code?: number; message?: string };
      toast.error(
        err.code === 4001 ? "Approval rejected" : "Couldn't claim faucet",
        err.code === 4001 ? "You declined the wallet popup." : err.message || "Try again."
      );
    } finally {
      setClaiming(false);
    }
  };

  return (
    <button
      onClick={handleClaim}
      disabled={claiming}
      title="Claim 1 SOL + 2000 USDC + 2000 USDT + 2000 RLO from the treasury"
      className="group flex items-center gap-2 cursor-pointer bg-black/30 border border-cyan-500/40 px-[16px] md:px-[20px] py-[8px] rounded-full text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] font-bold text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {claiming ? (
        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
      ) : (
        <Droplets className="w-4 h-4 md:w-5 md:h-5" />
      )}
      <span className="hidden sm:inline">{claiming ? "CLAIMING..." : "CLAIM FAUCET"}</span>
    </button>
  );
}
