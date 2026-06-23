import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, Bell, Loader2, ChevronDown, CheckCircle, LogOut, Menu, X } from 'lucide-react';
import { useWalletStore, BASE_SEPOLIA_CHAIN_ID } from '@/lib/store/walletStore';
import { useHistoryStore } from '@/lib/store/historyStore';
import { useTrustStore, selectTrustScore, getReputationTierName } from '@/lib/store/trustStore';
import { useReputationStore } from '@/lib/store/reputationStore';
import ClaimFaucet from '@/components/main/ClaimFaucet';

interface HeaderProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
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
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [mobileProjectDropdownOpen, setMobileProjectDropdownOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mobileHoveredIdx, setMobileHoveredIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tabs = ['Home', 'Market', 'Liquidity&Staking', 'Lending', 'Borrow', 'Reputation', 'Portfolio', 'Project'];
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const recent = transactions.slice(0, 6);

  return (
    <header className="w-screen md:w-full h-[65px] fixed top-0 left-0 right-0 mx-auto shadow-lg shadow-black/20 bg-[#03001490] border-b border-white/10 backdrop-blur-md z-50 px-4 md:px-10 max-w-[1855px] flex items-center rounded-full">
      <div className="relative w-full h-full flex flex-row items-center justify-between m-auto px-[0px] md:px-[10px]">
          {/* Logo Section */}
          <Link
            href="/"
            className="h-auto w-auto flex flex-row items-center cursor-pointer shrink-0"
          >
            <img
              src={logoUrl}
              alt="logo"
              className="cursor-pointer hover:animate-spin w-10 mr-[10px]"
            />
            <div className="flex flex-col justify-center leading-none select-none">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-normal text-lg leading-none">
                VELIXIR
              </span>
              <span className="text-[7.5px] font-semibold text-indigo-300/80 tracking-[0.12em] uppercase mt-[2px] whitespace-nowrap">
                REPUTATION FINANCE
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            <nav
              ref={navRef}
              className="flex relative space-x-1 bg-black/40 p-1.5 rounded-xl border border-white/10"
            >
              {/* Sliding purple indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  bottom: 6,
                  left: 0,
                  width: sliderStyle.width,
                  transform: `translateX(${sliderStyle.left}px)`,
                  transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1), width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
                  willChange: 'transform',
                  background: 'linear-gradient(to right, #7c3aed, #6366f1)',
                  borderRadius: 8,
                  boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.4)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  opacity: sliderStyle.width > 0 ? 1 : 0,
                }}
              />
              {tabs.map((tab, idx) => {
                if (tab === 'Project') {
                  return (
                    <div key={tab} className="relative" ref={dropdownRef}>
                      <button
                        ref={(el) => { btnRefs.current[idx] = el as unknown as HTMLAnchorElement; }}
                        onClick={(e) => {
                          e.preventDefault();
                          setProjectDropdownOpen(!projectDropdownOpen);
                        }}
                        className={`relative z-10 px-4 py-2 text-xs font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                          activeTab === tab
                            ? 'text-white font-extrabold'
                            : 'text-slate-200 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                        }`}
                      >
                        {tab}
                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${projectDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {projectDropdownOpen && (
                        <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-40 rounded-xl bg-slate-950/90 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-1.5 z-[60] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-0.5">
                          {/* Vertical sliding purple spotlight indicator */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 6,
                              right: 6,
                              top: hoveredIdx !== null ? (hoveredIdx * 38 + 6) : 6,
                              height: 36,
                              opacity: hoveredIdx !== null ? 1 : 0,
                              transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), top 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                              transform: hoveredIdx !== null ? 'scale(1)' : 'scale(0.95)',
                              background: 'linear-gradient(to right, #7c3aed, #6366f1)',
                              boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.4)',
                              borderRadius: 8,
                              pointerEvents: 'none',
                              zIndex: 0,
                            }}
                          />
                          <Link
                            href="/project"
                            onMouseEnter={() => setHoveredIdx(0)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            onClick={() => {
                              setProjectDropdownOpen(false);
                            }}
                            className={`relative z-10 w-full h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                              hoveredIdx === 0 ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            Project
                          </Link>
                          <Link
                            href="/docs"
                            onMouseEnter={() => setHoveredIdx(1)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            onClick={() => {
                              setProjectDropdownOpen(false);
                            }}
                            className={`relative z-10 w-full h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                              hoveredIdx === 1 ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            Docs
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }

                const isLocalTab = activeTab !== 'Lending' && ['Borrow', 'Reputation', 'Portfolio'].includes(tab);
                
                let href = '/';
                if (tab === 'Market') href = '/market';
                else if (tab === 'Liquidity&Staking') href = '/liquidity';
                else if (tab === 'Lending') href = '/lending';
                else if (tab === 'Borrow') href = '/borrow';
                else if (tab === 'Reputation') href = '/borrow?tab=Reputation';
                else if (tab === 'Portfolio') href = '/borrow?tab=Portfolio';

                if (tab === 'Home' || tab === 'Market' || tab === 'Liquidity&Staking' || !isLocalTab) {
                  return (
                    <Link
                      key={tab}
                      ref={(el) => { btnRefs.current[idx] = el as unknown as HTMLAnchorElement; }}
                      href={href}
                      className={`relative z-10 px-4 py-2 text-xs font-bold rounded-lg transition-colors duration-200 flex items-center justify-center cursor-pointer ${
                        activeTab === tab
                          ? 'text-white font-extrabold'
                          : 'text-slate-200 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                      }`}
                    >
                      {tab === 'Borrow' && (
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center justify-center animate-pulse">
                          <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        </span>
                      )}
                      {tab === 'Liquidity&Staking' ? 'Liquidity & Staking' : tab}
                    </Link>
                  );
                }

                return (
                  <button
                    key={tab}
                    ref={(el) => { btnRefs.current[idx] = el; }}
                    onClick={() => setActiveTab?.(tab)}
                    className={`relative z-10 px-4 py-2 text-xs font-bold rounded-lg transition-colors duration-200 cursor-pointer ${
                      activeTab === tab
                        ? 'text-white font-extrabold'
                        : 'text-slate-200 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                    }`}
                  >
                    {tab === 'Borrow' && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center justify-center animate-pulse">
                        <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      </span>
                    )}
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

            {/* One-click treasury faucet — sits to the left of the wallet button */}
            <ClaimFaucet />

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
                if (tab === 'Project') {
                  return (
                    <div key={tab} className="flex flex-col">
                      <button
                        onClick={() => setMobileProjectDropdownOpen(!mobileProjectDropdownOpen)}
                        className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between text-left ${
                          activeTab === tab
                            ? 'bg-[#7042f8]/10 text-white'
                            : 'text-slate-200 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{tab}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileProjectDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Mobile Dropdown Items */}
                      {mobileProjectDropdownOpen && (
                        <div className="flex flex-col gap-0.5 pl-4 mt-1 border-l border-[#7042f880] ml-4 py-1.5 animate-in fade-in slide-in-from-top-1 duration-200 relative">
                          <Link
                            href="/project"
                            onMouseEnter={() => setMobileHoveredIdx(0)}
                            onMouseLeave={() => setMobileHoveredIdx(null)}
                            onClick={() => {
                              setMobileNavOpen(false);
                              setMobileProjectDropdownOpen(false);
                            }}
                            className={`relative z-10 w-full h-9 flex items-center justify-start px-4 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
                              mobileHoveredIdx === 0 ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            Project
                          </Link>
                          <Link
                            href="/docs"
                            onMouseEnter={() => setMobileHoveredIdx(1)}
                            onMouseLeave={() => setMobileHoveredIdx(null)}
                            onClick={() => {
                              setMobileNavOpen(false);
                              setMobileProjectDropdownOpen(false);
                            }}
                            className={`relative z-10 w-full h-9 flex items-center justify-start px-4 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
                              mobileHoveredIdx === 1 ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            Docs
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }

                const base = "relative px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left";
                const cls = activeTab === tab
                  ? `${base} bg-[#7042f8]/20 text-white`
                  : `${base} text-slate-300 hover:bg-white/5 hover:text-white`;
                
                const isLocalTab = activeTab !== 'Lending' && ['Borrow', 'Reputation', 'Portfolio'].includes(tab);

                let href = '/';
                if (tab === 'Market') href = '/market';
                else if (tab === 'Liquidity&Staking') href = '/liquidity';
                else if (tab === 'Lending') href = '/lending';
                else if (tab === 'Borrow') href = '/borrow';
                else if (tab === 'Reputation') href = '/borrow?tab=Reputation';
                else if (tab === 'Portfolio') href = '/borrow?tab=Portfolio';

                if (tab === 'Home' || tab === 'Market' || tab === 'Liquidity&Staking' || !isLocalTab) {
                  return (
                    <Link
                      key={tab}
                      href={href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cls}
                    >
                      {tab === 'Borrow' && (
                        <span className="absolute top-2 left-[14px] flex items-center justify-center animate-pulse">
                          <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        </span>
                      )}
                      <span className={tab === 'Borrow' ? "pt-0.5 block" : ""}>
                        {tab === 'Liquidity&Staking' ? 'Liquidity & Staking' : tab}
                      </span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab?.(tab);
                      setMobileNavOpen(false);
                    }}
                    className={cls}
                  >
                    {tab === 'Borrow' && (
                      <span className="absolute top-2 left-[14px] flex items-center justify-center animate-pulse">
                        <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      </span>
                    )}
                    <span className={tab === 'Borrow' ? "pt-0.5 block text-left w-full" : ""}>
                      {tab}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
      </div>
    </header>
  );
}
