"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Wallet, ChevronRight, ShieldCheck } from 'lucide-react';
import { useWalletStore } from '@/lib/store/walletStore';
import { ConnectorType } from '@/lib/types/borrow';

const CONNECTORS: { id: ConnectorType; tag: string }[] = [
  { id: 'MetaMask', tag: 'EVM + SVM Real on-chain' },
  { id: 'Phantom', tag: 'Solana • Real on-chain' },
  { id: 'Solflare', tag: 'Solana • Real on-chain' },
  { id: 'WalletConnect', tag: 'Dummy • 1000 Devnet SOL' },
];

const CONNECTOR_IMG: Record<ConnectorType, string> = {
  Phantom: '/wallets/phantom.png',
  Solflare: '/wallets/solflare.png',
  WalletConnect: '/wallets/walletconnect.png',
  MetaMask: '/wallets/metamask.svg',
};

export default function WalletModal() {
  const open = useWalletStore((s) => s.modalOpen);
  const setOpen = useWalletStore((s) => s.setModalOpen);
  const connect = useWalletStore((s) => s.connect);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-[#030014]/80 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm rounded-2xl border border-[#7042f880] bg-[#03001490] backdrop-blur-md shadow-[0_0_40px_rgba(112,66,248,0.25)] overflow-hidden"
          >
            <div className="absolute top-0 right-1/4 h-[160px] w-[160px] bg-[#7042f8]/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#7042f8] flex items-center justify-center shadow-[0_0_12px_rgba(112,66,248,0.5)]">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-sm font-bold text-white">Connect a Wallet</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {CONNECTORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => connect(c.id)}
                  className="group w-full flex items-center justify-between gap-3 rounded-full border border-[#7042f880] bg-black/30 px-4 py-3 text-left transition-all hover:bg-[#7042f8]/15 hover:border-[#7042f8] shadow-[0_0_10px_rgba(112,66,248,0.15)] hover:shadow-[0_0_20px_rgba(112,66,248,0.4)] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-black/40 border border-[#7042f880] flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={CONNECTOR_IMG[c.id]} alt={`${c.id} logo`} className="h-6 w-6 object-contain" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{c.id}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.tag}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-[#b49bff] transition-colors" />
                </button>
              ))}
            </div>

            <div className="px-6 pb-5 pt-1 flex items-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
              <span>
                Velixir runs on <span className="text-slate-300">Solana Devnet</span>. Connect with your Solana Wallet to sign real on-chain transactions.
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
