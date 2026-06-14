"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Wallet, ExternalLink } from "lucide-react";
import { TokenLogo } from "@/lib/store/assetMetadata";
import { toast } from "@/lib/store/toastStore";
import { explorerAddrUrl, shortAddress } from "@/lib/wallet";
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
          <div className="text-[10px] text-gray-500">Copy a mint, then paste it in Phantom / Solflare → Manage Token List</div>
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
              <button
                onClick={() => copy(t.symbol, t.mint)}
                className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 cursor-pointer ${
                  isCopied
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-cyan-500/10 border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40"
                }`}
              >
                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {isCopied ? "Copied" : "Copy mint"}
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
