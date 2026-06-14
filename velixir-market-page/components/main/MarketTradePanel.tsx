"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MarketToken } from "@/constants/market";
import { TokenIcon } from "@/components/main/MarketTokenCards";
import {
  connectWallet,
  sendActionTx,
  waitForReceipt,
  explorerTxUrl,
  shortAddress,
} from "@/lib/wallet";

type TxStage = "idle" | "connecting" | "signing" | "pending" | "success" | "failed";

interface MarketTradePanelProps {
  /** Live token list (prices kept up to date by the page). */
  tokens: MarketToken[];
  /** The "pay" token — kept in sync with the chart selection. */
  selectedToken: MarketToken;
  onTokenChange: (token: MarketToken) => void;
}

const LP_FEE = 0.003; // 0.3% pool fee
const SLIPPAGE = 0.005; // 0.5% slippage tolerance

const fmtAmount = (value: number, token: MarketToken): string => {
  if (!value) return "0.0";
  const decimals = token.price >= 1000 ? 6 : token.price >= 1 ? 4 : 2;
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
};

const fmtUsd = (value: number): string =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Inline token picker used by both the pay/receive rows. */
const TokenSelect = ({
  token,
  tokens,
  exclude,
  onSelect,
}: {
  token: MarketToken;
  tokens: MarketToken[];
  exclude: string;
  onSelect: (t: MarketToken) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-[#12123a] border border-[#1a1a3e] rounded-full pl-1.5 pr-2.5 py-1.5 hover:border-cyan-500/40 transition-all"
      >
        <TokenIcon token={token} size={22} />
        <span className="text-white text-sm font-semibold">{token.symbol}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#0d0d2b] border border-[#1a1a3e] rounded-xl shadow-2xl shadow-black/50 z-50 py-1">
            {tokens.filter((t) => t.id !== exclude).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onSelect(t);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#1a1a3e] transition-colors ${
                  t.id === token.id ? "bg-cyan-500/10" : ""
                }`}
              >
                <TokenIcon token={t} size={22} />
                <span className="text-sm text-gray-200">{t.symbol}</span>
                <span className="text-[10px] text-gray-600 ml-auto">{t.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const MarketTradePanel = ({ tokens, selectedToken, onTokenChange }: MarketTradePanelProps) => {
  const fromToken = selectedToken;
  const [toId, setToId] = useState<string>(
    () => (tokens.find((t) => t.id !== selectedToken.id) ?? tokens[1]).id
  );
  const [amount, setAmount] = useState("");

  const [account, setAccount] = useState<string | null>(null);
  const [stage, setStage] = useState<TxStage>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Resolve the receive token from the live list; never equal to the pay token.
  const toToken =
    tokens.find((t) => t.id === toId && t.id !== fromToken.id) ??
    tokens.find((t) => t.id !== fromToken.id) ??
    tokens[0];

  // Keep the stored id in sync if a collision forced a different receive token.
  useEffect(() => {
    if (toToken.id !== toId) setToId(toToken.id);
  }, [toToken.id, toId]);

  const numAmount = parseFloat(amount) || 0;

  const { receiveAmount, rate, minReceived, priceImpact, fromUsd } = useMemo(() => {
    const rate = fromToken.price / toToken.price;
    const gross = numAmount * rate;
    const receiveAmount = gross * (1 - LP_FEE);
    const minReceived = receiveAmount * (1 - SLIPPAGE);
    const fromUsd = numAmount * fromToken.price;
    // Tiny synthetic impact that grows with trade size vs. pool liquidity.
    const priceImpact = Math.min((fromUsd / toToken.liquidity) * 100, 12);
    return { receiveAmount, rate, minReceived, priceImpact, fromUsd };
  }, [numAmount, fromToken, toToken]);

  const busy = stage === "connecting" || stage === "signing" || stage === "pending";

  const handleFlip = () => {
    const newToId = fromToken.id;
    onTokenChange(toToken);
    setToId(newToId);
  };

  const handleSwap = async () => {
    setWalletError(null);
    try {
      if (!account) {
        setStage("connecting");
        const addr = await connectWallet();
        setAccount(addr);
        setStage("idle");
        return;
      }
      if (numAmount <= 0) {
        setWalletError("Enter an amount first.");
        return;
      }
      setTxHash(null);
      setStage("signing");
      const hash = await sendActionTx({
        action: "SWAP",
        symbol: fromToken.symbol,
        toSymbol: toToken.symbol,
        amount,
        from: account,
      });
      setTxHash(hash);
      setStage("pending");
      const { status } = await waitForReceipt(hash);
      setStage(status === "success" ? "success" : "failed");
    } catch (err) {
      const e = err as { code?: number; message?: string };
      setWalletError(e.code === 4001 ? "Request rejected in wallet." : e.message || "Swap failed.");
      setStage("idle");
    }
  };

  const buttonLabel = (() => {
    if (stage === "connecting") return "Connecting…";
    if (stage === "signing") return "Confirm in wallet…";
    if (stage === "pending") return "Swapping…";
    if (!account) return "CONNECT WALLET";
    if (numAmount <= 0) return "Enter an amount";
    return `Swap ${fromToken.symbol} for ${toToken.symbol}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a3e]">
        <span className="text-sm font-semibold text-white">Swap</span>
        {account ? (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-gray-400 font-mono">{shortAddress(account)}</span>
          </span>
        ) : (
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Base Sepolia</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto">
        {/* Pay */}
        <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-xl p-3 focus-within:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">You pay</span>
            <span className="text-[10px] text-gray-600">Balance: 0.0</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-white text-2xl font-medium outline-none placeholder-gray-600 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <TokenSelect token={fromToken} tokens={tokens} exclude={toToken.id} onSelect={onTokenChange} />
          </div>
          <div className="text-xs text-gray-600 mt-1">≈ ${fmtUsd(fromUsd)}</div>
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-2.5 z-10">
          <button
            onClick={handleFlip}
            className="w-9 h-9 rounded-xl bg-[#12123a] border-4 border-[#080820] flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:rotate-180 transition-all duration-300"
            aria-label="Swap direction"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
            </svg>
          </button>
        </div>

        {/* Receive */}
        <div className="bg-[#0a0a24] border border-[#1a1a3e] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">You receive</span>
            <span className="text-[10px] text-gray-600">Balance: 0.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-2xl font-medium text-white min-w-0 truncate">
              {fmtAmount(receiveAmount, toToken)}
            </span>
            <TokenSelect token={toToken} tokens={tokens} exclude={fromToken.id} onSelect={(t) => setToId(t.id)} />
          </div>
          <div className="text-xs text-gray-600 mt-1">≈ ${fmtUsd(receiveAmount * toToken.price)}</div>
        </div>

        {/* Details */}
        <div className="mt-2 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Rate</span>
            <span className="text-gray-300">
              1 {fromToken.symbol} = {fmtAmount(rate, toToken)} {toToken.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Price impact</span>
            <span className={priceImpact > 3 ? "text-amber-400" : "text-emerald-400"}>
              {priceImpact < 0.01 ? "<0.01" : priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Min. received</span>
            <span className="text-gray-300">
              {fmtAmount(minReceived, toToken)} {toToken.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Slippage tolerance</span>
            <span className="text-gray-300">{(SLIPPAGE * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Liquidity fee (0.3%)</span>
            <span className="text-gray-300">${fmtUsd(fromUsd * LP_FEE)}</span>
          </div>
        </div>
      </div>

      {/* Action + on-chain status */}
      <div className="p-4 border-t border-[#1a1a3e] space-y-3">
        {(txHash || walletError) && (
          <div
            className="rounded-lg border px-3 py-2.5 text-xs space-y-1.5"
            style={{
              borderColor: stage === "failed" || walletError ? "rgba(239,68,68,0.3)" : stage === "success" ? "rgba(34,197,94,0.3)" : "rgba(6,182,212,0.3)",
              background: stage === "failed" || walletError ? "rgba(239,68,68,0.06)" : stage === "success" ? "rgba(34,197,94,0.06)" : "rgba(6,182,212,0.06)",
            }}
          >
            {walletError ? (
              <span className="text-red-400">{walletError}</span>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {stage === "pending" && <span className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />}
                  <span className={stage === "success" ? "text-emerald-400" : stage === "failed" ? "text-red-400" : "text-cyan-400"}>
                    {stage === "pending" ? "Swap pending…" : stage === "success" ? "Swap confirmed ✓" : stage === "failed" ? "Swap failed" : "Submitted"}
                  </span>
                </div>
                {txHash && (
                  <a
                    href={explorerTxUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-gray-400 hover:text-cyan-400 transition-colors font-mono break-all"
                  >
                    <span>{txHash.slice(0, 10)}…{txHash.slice(-8)}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
              </>
            )}
          </div>
        )}

        <button
          onClick={handleSwap}
          disabled={busy || (!!account && numAmount <= 0)}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.45)]"
        >
          {buttonLabel}
        </button>
      </div>
    </motion.div>
  );
};

export default MarketTradePanel;
