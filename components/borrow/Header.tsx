import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, Bell, Loader2, ChevronDown, CheckCircle, LogOut, Menu, X } from 'lucide-react';
import { useWalletStore, BASE_SEPOLIA_CHAIN_ID } from '@/lib/store/walletStore';
import { useHistoryStore } from '@/lib/store/historyStore';
import { useTrustStore, selectTrustScore, getReputationTierName } from '@/lib/store/trustStore';
import { useReputationStore } from '@/lib/store/reputationStore';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const logoUrl = '/favicon.png';

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const {
    connected,
    connecting,
    chainId,
    balance,
    connector,
    isSimulated,
    address,
    setModalOpen,
    disconnect,
    switchToBaseSepolia,
    displayAddress,
    airdrop,
  } = useWalletStore();
  
  const credentials = useTrustStore((s) => s.credentials);
  const trustScore = connected ? selectTrustScore(credentials) : 0;
  const tierName = getReputationTierName(trustScore);

  const wrongNetwork = connected && chainId !== null && chainId !== BASE_SEPOLIA_CHAIN_ID;

  const transactions = useHistoryStore((s) => s.transactions);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const tabs = ['Home', 'Market', 'Liquidity&Staking', 'Lending&Borrow', 'Reputation', 'Portfolio'];
  const navRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeIdx = tabs.indexOf(activeTab);
    const btn = btnRefs.current[activeIdx];
    const nav = navRef.current;
    if (btn && nav) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setSliderStyle({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
      });
    }
  }, [activeTab]);

  const recent = transactions.slice(0, 6);

  return (
    <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1855px] mx-auto px-4 sm:px-10">
        <div className="relative flex items-center justify-between h-20">
          {/* Logo Section */}
          <a href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity shrink-0">
            <div className="flex h-10 w-10 items-center justify-center drop-shadow-[0_0_12px_rgba(139,92,246,0.7)]">
              <img src={logoUrl} alt="VELIXIR Logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white bg-clip-text">
                VELIXIR
              </span>
              <div className="font-mono text-[9px] tracking-widest text-indigo-400 font-bold uppercase leading-none">
                Reputation Finance
              </div>
            </div>
          </a>

          {/* Navigation Links */}
          <div className="hidden lg:flex lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            <nav
              ref={navRef}
              className="flex relative space-x-1 bg-white/5 p-1.5 rounded-xl border border-white/5"
            >
              {/* Sliding purple indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  bottom: 6,
                  left: sliderStyle.left,
                  width: sliderStyle.width,
                  transition: 'left 0.28s cubic-bezier(0.4,0,0.2,1), width 0.28s cubic-bezier(0.4,0,0.2,1)',
                  background: 'linear-gradient(to right, rgba(124,58,237,0.9), rgba(99,102,241,0.9))',
                  borderRadius: 8,
                  boxShadow: '0 4px 14px 0 rgba(99,102,241,0.2)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
              {tabs.map((tab, idx) => {
                if (tab === 'Home') {
                  return (
                    <a
                      key={tab}
                      ref={(el) => { btnRefs.current[idx] = el; }}
                      href="/"
                      className="relative z-10 px-4 py-2 text-xs font-medium rounded-lg transition-colors duration-200 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      {tab}
                    </a>
                  );
                }
                if (tab === 'Market') {
                  return (
                    <a
                      key={tab}
                      ref={(el) => { btnRefs.current[idx] = el; }}
                      href="/market"
                      className="relative z-10 px-4 py-2 text-xs font-medium rounded-lg transition-colors duration-200 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      {tab}
                    </a>
                  );
                }
                if (tab === 'Liquidity&Staking') {
                  return (
                    <a
                      key={tab}
                      ref={(el) => { btnRefs.current[idx] = el; }}
                      href="/liquidity"
                      className="relative z-10 px-4 py-2 text-xs font-medium rounded-lg transition-colors duration-200 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      {tab}
                    </a>
                  );
                }
                return (
                  <button
                    key={tab}
                    ref={(el) => { btnRefs.current[idx] = el; }}
                    onClick={() => setActiveTab(tab)}
                    className={`relative z-10 px-4 py-2 text-xs font-medium rounded-lg transition-colors duration-200 ${
                      activeTab === tab
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Actions Left & Right */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile hamburger — opens the dApp nav on small screens */}
            <button
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Toggle menu"
              className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Notification Center — driven by live transaction ledger */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors relative"
              >
                <Bell className="h-4.5 w-4.5" />
                {recent.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-3 w-80 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-4 z-50 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                      <span className="text-xs font-semibold text-white">Recent Activity</span>
                      <span className="text-[10px] text-slate-500 font-mono">{transactions.length} total</span>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {recent.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No activity yet.</p>
                      ) : (
                        recent.map((tx) => (
                          <div key={tx.id} className="p-2 rounded-xl text-xs bg-white/5 border-l-2 border-violet-500">
                            <div className="text-slate-300 font-medium">
                              {tx.action}: {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tx.asset}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 font-mono">
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Wallet Connect */}
            <div className="relative">
              {connected ? (
                <button 
                  id="wallet-connect-btn"
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  className="group flex items-center gap-2 cursor-pointer bg-slate-900/80 border border-emerald-500/20 px-[20px] py-[8px] rounded-full text-emerald-400 hover:bg-slate-900 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] font-bold text-xs md:text-sm"
                >
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                  <span className="font-mono text-xs md:text-sm">{displayAddress()}</span>
                  <ChevronDown className="w-3 h-3 text-emerald-400/60" />
                </button>
              ) : (
                <button 
                  id="wallet-connect-btn"
                  onClick={() => !connecting && setModalOpen(true)}
                  className="group flex items-center gap-2 cursor-pointer bg-black/30 border border-[#7042f880] px-[20px] py-[8px] rounded-full text-white hover:bg-[#7042f8] transition-all shadow-[0_0_10px_rgba(112,66,248,0.2)] hover:shadow-[0_0_20px_rgba(112,66,248,0.4)] font-bold text-xs md:text-sm"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-white" />
                      <span>CONNECTING...</span>
                    </>
                  ) : (
                    <>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="w-4 h-4 md:w-5 md:h-5 text-white/90 group-hover:text-white transition-colors duration-200"
                      >
                        <path d="M21 12V7H5a2 2 0 0 1-2-2V5" />
                        <path d="M3 10v9a2 2 0 0 0 2 2h16v-9" />
                        <path d="M18 13H22v4h-4z" />
                      </svg>
                      <span>CONNECT WALLET</span>
                    </>
                  )}
                </button>
              )}

              <AnimatePresence>
                {connected && walletMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-3 w-64 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-4 z-50 backdrop-blur-xl space-y-3"
                  >
                    <div className="border-b border-white/5 pb-2 mb-1.5 space-y-0.5 text-left">
                      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Wallet</div>
                      <div className="text-xs font-mono font-bold text-slate-200">{displayAddress()}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Reputation</span>
                      <span className="text-emerald-400 font-mono font-bold">{trustScore} / 1000</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2 mb-1.5">
                      <span className="text-slate-500">Tier</span>
                      <span className="text-indigo-400 font-semibold">{tierName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Connector</span>
                      <span className="text-slate-200 font-semibold flex items-center gap-1">
                        {connector}
                        {isSimulated && (
                          <span className="text-[8px] font-mono bg-amber-500/15 text-amber-400 border border-amber-400/20 px-1 py-0.5 rounded uppercase">
                            Sim
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Network</span>
                      <span className={`font-mono ${wrongNetwork ? 'text-rose-400' : 'text-blue-400'}`}>
                        {wrongNetwork ? `Chain ${chainId}` : 'Solana Devnet'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Balance</span>
                      <span className="font-mono text-emerald-400 font-bold">{balance} SOL</span>
                    </div>
                    {wrongNetwork && (
                      <button
                        onClick={() => {
                          switchToBaseSepolia();
                          setWalletMenuOpen(false);
                        }}
                        className="w-full py-2 rounded-xl text-[11px] font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 cursor-pointer"
                      >
                        Switch to Solana Devnet
                      </button>
                    )}
                    {isSimulated && connector !== 'MetaMask' && (
                      <button
                        onClick={() => { airdrop(); }}
                        className="w-full py-2 rounded-xl text-[11px] font-bold text-emerald-300 bg-emerald-950/40 hover:text-white border border-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        💧 Airdrop 1 Devnet SOL
                      </button>
                    )}
                    <button
                      onClick={() => {
                        disconnect();
                        setWalletMenuOpen(false);
                      }}
                      className="w-full py-2 rounded-xl text-[11px] font-bold text-slate-300 bg-slate-950 hover:text-white border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Disconnect
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile nav panel */}
          {mobileNavOpen && (
            <div className="lg:hidden absolute top-full left-0 right-0 mt-2 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-white/10 shadow-2xl p-2 flex flex-col gap-1 z-50">
              {tabs.map((tab) => {
                const base = "px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left";
                const cls = activeTab === tab
                  ? `${base} bg-[#7042f8]/20 text-white`
                  : `${base} text-slate-300 hover:bg-white/5 hover:text-white`;
                if (tab === 'Home') return <a key={tab} href="/" onClick={() => setMobileNavOpen(false)} className={cls}>{tab}</a>;
                if (tab === 'Market') return <a key={tab} href="/market" onClick={() => setMobileNavOpen(false)} className={cls}>{tab}</a>;
                if (tab === 'Liquidity&Staking') return <a key={tab} href="/liquidity" onClick={() => setMobileNavOpen(false)} className={cls}>{tab}</a>;
                return (
                  <button key={tab} onClick={() => { setActiveTab(tab); setMobileNavOpen(false); }} className={cls}>
                    {tab}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
