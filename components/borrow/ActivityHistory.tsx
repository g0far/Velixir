import React from 'react';
import {
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
  XCircle,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useHistoryStore } from '@/lib/store/historyStore';
import { useTrustStore } from '@/lib/store/trustStore';
import { useSwapHistoryStore } from '@/lib/store/swapHistoryStore';
import { useLendingStore } from '@/lib/store/lendingStore';
import { useWalletStore } from '@/lib/store/walletStore';
import { TokenLogo } from '@/lib/store/assetMetadata';

interface UnifiedTx {
  id: string;
  action: 'Borrow' | 'Repay' | 'Add Collateral' | 'Close Position' | 'Stake' | 'Unstake' | 'Claim Yield' | 'Swap' | 'Supply' | 'Withdraw';
  asset: string;
  logoSymbol: string;
  amount: number;
  timestamp: number;
  signature?: string;
  onchain?: boolean;
}

const actionMeta: Record<
  UnifiedTx['action'],
  { icon: React.ReactNode; color: string }
> = {
  Borrow: {
    icon: <ArrowDownToLine className="h-3.5 w-3.5" />,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  Repay: {
    icon: <ArrowUpFromLine className="h-3.5 w-3.5" />,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  'Add Collateral': {
    icon: <PlusCircle className="h-3.5 w-3.5" />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  'Close Position': {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  Stake: {
    icon: <Lock className="h-3.5 w-3.5" />,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  Unstake: {
    icon: <Unlock className="h-3.5 w-3.5" />,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  'Claim Yield': {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  Swap: {
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  Supply: {
    icon: <PlusCircle className="h-3.5 w-3.5" />,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  },
  Withdraw: {
    icon: <ArrowUpFromLine className="h-3.5 w-3.5" />,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
};

function timeAgo(ts: number): string {
  if (!ts) return 'just now';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (isNaN(m) || m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActivityHistory() {
  const transactions = useHistoryStore((s) => s.transactions || []);
  const stakingHistory = useTrustStore((s) => s.stakingHistory || []);
  const lendingHistory = useLendingStore((s) => s.lendingHistory || []);
  const byAddress = useSwapHistoryStore((s) => s.byAddress || {});
  const connected = useWalletStore((s) => s.connected);
  const address = useWalletStore((s) => s.address);

  const clearCreditHistory = useHistoryStore((s) => s.clear);
  const clearStakingHistory = useTrustStore((s) => s.clearStakingHistory);
  const clearLendingHistory = useLendingStore((s) => s.clearLendingHistory);
  const clearSwaps = useSwapHistoryStore((s) => s.clear);

  // Active wallet key — every history source is scoped to this wallet.
  const addrKey = connected && address ? address.toLowerCase() : null;
  const mine = React.useCallback(
    (a?: string) => !!addrKey && a?.toLowerCase() === addrKey,
    [addrKey]
  );

  // Retrieve wallet swaps safely
  const walletSwaps = React.useMemo(() => {
    if (!addrKey) return [];
    return byAddress[addrKey] || [];
  }, [addrKey, byAddress]);

  // Merge and sort credit, staking, lending, and swap histories
  const combinedHistory: UnifiedTx[] = React.useMemo(() => {
    const creditTxs: UnifiedTx[] = transactions.filter((tx) => mine(tx.address)).map((tx) => ({
      id: tx.id,
      action: tx.action,
      asset: tx.asset,
      logoSymbol: tx.asset,
      amount: tx.amount,
      timestamp: tx.timestamp,
      signature: tx.signature,
      onchain: tx.onchain,
    }));

    const stakingTxs: UnifiedTx[] = stakingHistory.filter((tx) => mine(tx.address)).map((tx) => {
      let actionMapped: 'Stake' | 'Unstake' | 'Claim Yield' = 'Stake';
      if (tx.action === 'UNSTAKE') actionMapped = 'Unstake';
      else if (tx.action === 'CLAIM') actionMapped = 'Claim Yield';

      return {
        id: tx.id,
        action: actionMapped,
        asset: tx.token === 'ALL' ? 'Rewards' : tx.token,
        logoSymbol: tx.token === 'ALL' ? 'Rewards' : tx.token,
        amount: tx.amount,
        timestamp: tx.timestamp,
        signature: tx.signature,
        onchain: tx.onchain,
      };
    });

    const swapTxs: UnifiedTx[] = walletSwaps.map((s) => ({
      id: s.id,
      action: 'Swap',
      asset: `${s.fromSymbol} → ${s.toSymbol}`,
      logoSymbol: s.toSymbol,
      amount: s.toAmount,
      timestamp: s.timestamp || Date.now(),
      signature: s.txHash,
      onchain: s.status === 'success',
    }));

    const lendingTxs: UnifiedTx[] = lendingHistory.filter((tx) => mine(tx.address)).map((tx) => {
      let actionMapped: 'Supply' | 'Withdraw' = 'Supply';
      if (tx.action === 'WITHDRAW') actionMapped = 'Withdraw';

      return {
        id: tx.id,
        action: actionMapped,
        asset: tx.symbol,
        logoSymbol: tx.symbol,
        amount: tx.amount,
        timestamp: tx.timestamp,
        signature: tx.signature,
        onchain: tx.onchain,
      };
    });

    return [...creditTxs, ...stakingTxs, ...swapTxs, ...lendingTxs].sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, stakingHistory, walletSwaps, lendingHistory, mine]);

  const handleClearAll = () => {
    // Scoped to the active wallet — other wallets keep their own history.
    clearCreditHistory(address || undefined);
    clearStakingHistory(address || undefined);
    clearLendingHistory(address || undefined);
    if (address) {
      clearSwaps(address);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-violet-400" />
            Activity History
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Unified activity ledger — borrows, repayments, collateral, staking, swaps, lending pools, and yield claims.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {combinedHistory.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear History
            </button>
          )}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-white/5 font-semibold">
            {combinedHistory.length} events
          </span>
        </div>
      </div>

      {combinedHistory.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-white/5 rounded-xl bg-slate-950/20">
          <History className="h-10 w-10 text-slate-600 mb-3 animate-pulse" />
          <p className="text-sm font-semibold text-slate-300">No activities recorded yet</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Interact with the liquidity board, supply to lending pools, swap tokens, or stake assets to build your reputation activity ledger.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {combinedHistory.map((tx) => {
            const fallbackMeta = {
              icon: <History className="h-3.5 w-3.5" />,
              color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
            };
            const meta = actionMeta[tx.action] || fallbackMeta;
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${meta.color}`}
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{tx.action}</p>
                    {tx.signature ? (
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-emerald-400/80 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      >
                        {tx.signature.slice(0, 8)}…{tx.signature.slice(-6)}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span
                        className="text-[10px] font-mono text-slate-600 flex items-center gap-1"
                        title="Simulated session — connect Phantom/Solflare to record on-chain"
                      >
                        Simulated · no on-chain tx
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-slate-200 flex items-center justify-end gap-1.5">
                    {(tx.amount ?? 0).toLocaleString(undefined, {
                      minimumFractionDigits: (tx.amount ?? 0) < 0.01 ? 4 : 2,
                      maximumFractionDigits: 4,
                    })}{' '}
                    <TokenLogo symbol={tx.logoSymbol || 'USDC'} size={14} />
                    <span className="text-slate-500">{tx.asset || 'Unknown'}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{timeAgo(tx.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
