"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Wallet, ExternalLink, Plus, Loader2 } from "lucide-react";
import { TokenLogo } from "@/lib/store/assetMetadata";
import { toast } from "@/lib/store/toastStore";
import { explorerAddrUrl, shortAddress, addTokenToWallet, explorerTxUrl } from "@/lib/wallet";
import { useWalletStore } from "@/lib/store/walletStore";
import { useBalanceStore } from "@/lib/store/balanceStore";
import { RLO_POOL } from "@/lib/raydium";

// Custom devnet token mints to import into Phantom / Solflare.
const IMPORT_TOKENS = [
  { symbol: "RLO", name: "Velixir RLO", mint: RLO_POOL.rloMint },
  { symbol: "USDC", name: "USD Coin", mint: "9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV" },
  { symbol: "USDT", name: "Tether USD", mint: "8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod" },
];

/**
 * Helper card that lets users add the USDC / USDT devnet mints to their wallet.
 * Solana wallets have no programmatic "watch asset", so each button copies the
 * mint address and points the user at the wallet's Manage Token List.
 */
export default function ImportTokens() {
  const [copied, setCopied] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const connected = useWalletStore((s) => s.connected);
  const isSimulated = useWalletStore((s) => s.isSimulated);
  const setModalOpen = useWalletStore((s) => s.setModalOpen);
  const refreshBalancesSoon = useBalanceStore((s) => s.refreshSoon);

  const copy = async (symbol: string, mint: string) => {
    try {
      await navigator.clipboard.writeText(mint);
    } catch {
      /* clipboard may be unavailable; the address is still shown */
    }
    setCopied(symbol);
    toast.success(`${symbol} mint copied`, "Paste it in Phantom / Solflare → Manage Token List to add it.");
    setTimeout(() => setCopied((c) => (c === symbol ? null : c)), 1800);
  };

  // Trigger the wallet's approval popup and register the token (creates its ATA),
  // so it shows up directly in the connected extension.
  const addToWallet = async (symbol: string, mint: string) => {
    if (!connected) {
      toast.error("Wallet not connected", "Connect Phantom / Solflare / MetaMask first.");
      setModalOpen(true);
      return;
    }
    if (isSimulated) {
      toast.error("Simulated session", "Connect a real wallet (Phantom / Solflare / MetaMask) to add tokens.");
      return;
    }
    setAdding(symbol);
    try {
      const sig = await addTokenToWallet(mint);
      if (sig) {
        toast.success(`${symbol} added to wallet`, `Approved on-chain. View: ${explorerTxUrl(sig)}`);
        refreshBalancesSoon();
      } else {
        toast.info(`${symbol} already in wallet`, "This token account already exists in your wallet.");
      }
    } catch (e) {
      const err = e as { code?: number; message?: string };
      toast.error(
        err.code === 4001 ? "Approval rejected" : `Couldn't add ${symbol}`,
        err.code === 4001 ? "You declined the wallet popup." : err.message || "Try again."
      );
    } finally {
      setAdding((s) => (s === symbol ? null : s));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#080820] border border-[#1a1a3e] rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Wallet className="h-3.5 w-3.5 text-cyan-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-tight">Add tokens to your wallet</div>
          <div className="text-[10px] text-gray-500">Tap ＋ to approve the token in your wallet popup, or copy the mint manually</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {IMPORT_TOKENS.map((t) => {
          const isCopied = copied === t.symbol;
          return (
            <div
              key={t.symbol}
              className="flex items-center gap-3 bg-[#0a0a24] border border-[#1a1a3e] rounded-xl px-3 py-2.5"
            >
              <div className="rounded-full overflow-hidden shrink-0" style={{ width: 30, height: 30 }}>
                <TokenLogo symbol={t.symbol} size={30} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white">{t.symbol}</span>
                  <a
                    href={explorerAddrUrl(t.mint)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-cyan-400 transition-colors"
                    title="View on Solana Explorer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="text-[10px] font-mono text-gray-500 truncate">{shortAddress(t.mint)}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => addToWallet(t.symbol, t.mint)}
                  disabled={adding === t.symbol}
                  title="Add to wallet (approve in popup)"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 cursor-pointer bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {adding === t.symbol ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add
                </button>
                <button
                  onClick={() => copy(t.symbol, t.mint)}
                  title="Copy mint address"
                  className={`flex items-center justify-center h-7 w-7 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isCopied
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : "bg-cyan-500/10 border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40"
                  }`}
                >
                  {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
