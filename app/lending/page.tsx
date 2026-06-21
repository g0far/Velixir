"use client";

import React, { useState, useEffect } from 'react';
import LendingSupplySection from '@/components/borrow/LendingSupplySection';
import VelixirFooter from '@/components/main/VelixirFooter';

export default function LendingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-white relative">
      <div className="absolute inset-0 z-[0] pointer-events-none overflow-hidden h-[800px]">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute md:top-[-240px] lg:top-[-335px] top-[-400px] left-0 w-full h-auto object-cover opacity-40 mix-blend-screen"
        >
          <source src="/blackhole.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030014]/60 to-[#030014] z-10" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 w-full pt-[65px]">

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
          {/* Hero Banner Section */}
          <div className="relative rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-950/40 via-slate-900 to-slate-950 border border-white/5 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
            <div className="absolute top-0 right-1/4 h-[300px] w-[300px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-10 h-[150px] w-[200px] bg-violet-600/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm animate-pulse">
                Velixir Lending Protocol
              </span>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Lend Assets, Earn Yield
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                Supply your crypto assets to Velixir liquidity pools and earn competitive on-chain yield. Your funds fuel under-collateralized loans issued to reputation-verified borrowers — fully non-custodial, transparent, and secured by Solana smart contracts.
              </p>
            </div>
          </div>

          <div className="space-y-6 py-4">
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.942" />
                    </svg>
                  ),
                  title: 'Earn Passive Yield',
                  desc: 'Supply USDC, SOL or BTC into live pools and watch your balance compound — real yield, paid by protocol borrowers, every single block.',
                  tag: 'Up to 14% APY',
                  iconGrad: 'from-emerald-400 to-teal-600',
                  glow: 'shadow-emerald-500/40',
                  tagCls: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
                  hoverBorder: 'hover:border-emerald-500/40',
                  blob: 'bg-emerald-500/25',
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  ),
                  title: 'Non-Custodial & Secure',
                  desc: 'Funds stay locked in audited Solana smart contracts. No middleman ever touches your assets — you alone hold the keys to every withdrawal.',
                  tag: 'On-Chain Vault',
                  iconGrad: 'from-sky-400 to-blue-600',
                  glow: 'shadow-blue-500/40',
                  tagCls: 'text-sky-300 bg-sky-500/10 border-sky-400/30',
                  hoverBorder: 'hover:border-sky-500/40',
                  blob: 'bg-sky-500/25',
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 0 0 2.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                    </svg>
                  ),
                  title: 'Reputation-Boosted Rates',
                  desc: 'Trust is alpha. Supplying to reputation-verified borrowers unlocks a yield premium — the higher their score, the better the rate for both sides.',
                  tag: 'Trust Premium',
                  iconGrad: 'from-violet-500 to-fuchsia-600',
                  glow: 'shadow-violet-500/40',
                  tagCls: 'text-violet-300 bg-violet-500/10 border-violet-400/30',
                  hoverBorder: 'hover:border-violet-500/40',
                  blob: 'bg-violet-500/25',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900/80 to-slate-900/30 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${f.hoverBorder}`}
                >
                  <div className={`pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full ${f.blob} blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${f.iconGrad} opacity-0 transition-opacity duration-300 group-hover:opacity-60`} />

                  <div className="relative z-10 space-y-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.iconGrad} flex items-center justify-center text-white shadow-lg ${f.glow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                      {f.icon}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white tracking-tight font-display">{f.title}</h3>
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${f.tagCls}`}>{f.tag}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Lending Pools — supply assets & earn yield */}
            <LendingSupplySection />
          </div>
        </main>

        <VelixirFooter />
      </div>
    </div>
  );
}
