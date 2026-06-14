"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";

import { usePathname } from "next/navigation";
import { useWalletStore } from "@/lib/store/walletStore";
import WalletModal from "@/components/borrow/WalletModal";
import Toaster from "@/components/borrow/Toaster";
import { Loader2, CheckCircle, ChevronDown, LogOut, Menu, X } from "lucide-react";

const TABS = [
    { name: "Home", href: "#home" },
    { name: "Market", href: "/market" },
    { name: "Liquidity&Staking", href: "/liquidity" },
    { name: "Lending&Borrow", href: "/borrow" },
    { name: "Portfolio", href: "/borrow?tab=Portfolio" },
    { name: "Project", href: "/project", isDropdown: true }
];

const Navbar = () => {
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState("Home");

    const {
        connected,
        connecting,
        balance,
        connector,
        isSimulated,
        setModalOpen,
        disconnect,
        displayAddress,
        airdrop,
    } = useWalletStore();

    const [walletMenuOpen, setWalletMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [mobileProjectDropdownOpen, setMobileProjectDropdownOpen] = useState(false);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [mobileHoveredIdx, setMobileHoveredIdx] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeHoverIdx = hoveredIdx;
    const activeMobileHoverIdx = mobileHoveredIdx;

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

    useEffect(() => {
        setMounted(true);
        if (pathname === "/market") {
            setActiveTab("Market");
        } else if (pathname === "/liquidity") {
            setActiveTab("Liquidity&Staking");
        } else if (pathname === "/docs") {
            setActiveTab("Project");
        } else if (pathname === "/project") {
            setActiveTab("Project");
        } else if (pathname === "/") {
            if (typeof window !== "undefined") {
                const hash = window.location.hash;
                if (hash === "#project") {
                    setActiveTab("Project");
                } else {
                    setActiveTab("Home");
                }
            }
        }
    }, [pathname]);

    const navRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeIdx = TABS.findIndex(t => t.name === activeTab);
        const btn = btnRefs.current[activeIdx];
        const nav = navRef.current;
        if (btn && nav && activeTab !== "Project") {
            const navRect = nav.getBoundingClientRect();
            const btnRect = btn.getBoundingClientRect();
            setSliderStyle({
                left: btnRect.left - navRect.left,
                width: btnRect.width,
            });
        } else {
            setSliderStyle({
                left: 0,
                width: 0,
            });
        }
    }, [activeTab]);

    if (pathname && pathname.startsWith("/borrow")) {
        return null;
    }

    return (
        <div className="w-screen md:w-full h-[65px] fixed top-0 left-0 right-0 mx-auto shadow-lg shadow-black/20 bg-[#03001490] border-b border-white/10 backdrop-blur-md z-50 px-4 md:px-10 max-w-[1855px] items-center rounded-full">
            <div className="relative w-full h-full flex flex-row items-center justify-between m-auto px-[0px] md:px-[10px]">
                <a
                    href={pathname === "/" ? "#home" : "/"}
                    className="h-auto w-auto flex flex-row items-center cursor-pointer"
                    onClick={() => setActiveTab("Home")}
                >
                    <Image
                        src="/favicon.png"
                        alt="logo"
                        width={40}
                        height={40}
                        className="cursor-pointer hover:animate-spin w-10 mr-[10px]"
                    />
                    
                    <span className="font-bold block text-white z-50 md:text-lg text-xl">
                        VELIXIR
                    </span>
                </a>

                {/* Sliding indicator navigation matching Borrow page design */}
                <div className="hidden md:flex relative items-center justify-center md:absolute md:left-1/2 md:-translate-x-1/2">
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
                        {TABS.map((tab, idx) => {
                            if (tab.isDropdown) {
                                return (
                                    <div key={tab.name} className="relative" ref={dropdownRef}>
                                        <button
                                            ref={(el) => { btnRefs.current[idx] = el as unknown as HTMLAnchorElement; }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setProjectDropdownOpen(!projectDropdownOpen);
                                            }}
                                            className={`relative z-10 px-4 py-2 text-xs font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                                                activeTab === tab.name
                                                    ? 'text-white font-extrabold'
                                                    : 'text-slate-200 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                                            }`}
                                        >
                                            {tab.name}
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
                                                        top: activeHoverIdx !== null ? (activeHoverIdx * 38 + 6) : 6,
                                                        height: 36,
                                                        opacity: activeHoverIdx !== null ? 1 : 0,
                                                        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), top 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                                                        transform: activeHoverIdx !== null ? 'scale(1)' : 'scale(0.95)',
                                                        background: 'linear-gradient(to right, #7c3aed, #6366f1)',
                                                        boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.4)',
                                                        borderRadius: 8,
                                                        pointerEvents: 'none',
                                                        zIndex: 0,
                                                    }}
                                                />
                                                <a
                                                    href="/project"
                                                    onMouseEnter={() => setHoveredIdx(0)}
                                                    onMouseLeave={() => setHoveredIdx(null)}
                                                    onClick={() => {
                                                        setActiveTab("Project");
                                                        setProjectDropdownOpen(false);
                                                    }}
                                                    className={`relative z-10 w-full h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                                                        activeHoverIdx === 0 ? 'text-white' : 'text-slate-300'
                                                    }`}
                                                >
                                                    Project
                                                </a>
                                                <a
                                                    href="/docs"
                                                    onMouseEnter={() => setHoveredIdx(1)}
                                                    onMouseLeave={() => setHoveredIdx(null)}
                                                    onClick={() => {
                                                        setActiveTab("Project");
                                                        setProjectDropdownOpen(false);
                                                    }}
                                                    className={`relative z-10 w-full h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                                                        activeHoverIdx === 1 ? 'text-white' : 'text-slate-300'
                                                    }`}
                                                >
                                                    Docs
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <a
                                    key={tab.name}
                                    ref={(el) => { btnRefs.current[idx] = el; }}
                                    href={pathname === "/" ? tab.href : (tab.href.startsWith("#") ? `/${tab.href}` : tab.href)}
                                    onClick={() => setActiveTab(tab.name)}
                                    className={`relative z-10 px-4 py-2 text-xs font-bold rounded-lg transition-colors duration-200 cursor-pointer ${
                                        activeTab === tab.name
                                            ? 'text-white font-extrabold'
                                            : 'text-slate-200 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                                    }`}
                                >
                                    {tab.name}
                                </a>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex flex-row items-center gap-3 md:gap-5 text-white">
                    {/* Mobile hamburger — opens the nav menu on small screens */}
                    <button
                        onClick={() => setMobileMenuOpen((o) => !o)}
                        aria-label="Toggle menu"
                        className="md:hidden flex items-center justify-center h-9 w-9 rounded-full bg-black/30 border border-[#7042f880] text-white hover:bg-[#7042f8] transition-all"
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>

                    {!mounted ? (
                        <button 
                            className="group flex items-center gap-2 cursor-pointer bg-black/30 border border-[#7042f880] px-[20px] py-[8px] rounded-full text-white hover:bg-[#7042f8] transition-all shadow-[0_0_10px_rgba(112,66,248,0.2)] hover:shadow-[0_0_20px_rgba(112,66,248,0.4)] font-bold text-sm md:text-base"
                        >
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
                        </button>
                    ) : connected ? (
                        <div className="relative">
                            <button 
                                onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                                className="group flex items-center gap-2 cursor-pointer bg-slate-900/80 border border-emerald-500/20 px-[20px] py-[8px] rounded-full text-emerald-400 hover:bg-slate-900 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] font-bold text-sm md:text-base"
                            >
                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                                <span className="font-mono text-xs md:text-sm">{displayAddress()}</span>
                                <ChevronDown className="w-3 h-3 text-emerald-400/60" />
                            </button>
                            
                            {walletMenuOpen && (
                                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-4 z-[60] backdrop-blur-xl space-y-3 text-left">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>Connector</span>
                                        <span className="text-slate-200 font-semibold flex items-center gap-1">
                                            {connector}
                                            {isSimulated && (
                                                <span className="text-[8px] font-mono bg-amber-500/15 text-amber-400 border border-amber-400/20 px-1 py-0.5 rounded uppercase">
                                                    Sim
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>Balance</span>
                                        <span className="font-mono text-emerald-400 font-bold">{balance} SOL</span>
                                    </div>
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
                                </div>
                            )}
                        </div>
                    ) : (
                        <button 
                            onClick={() => setModalOpen(true)}
                            className="group flex items-center gap-2 cursor-pointer bg-black/30 border border-[#7042f880] px-[20px] py-[8px] rounded-full text-white hover:bg-[#7042f8] transition-all shadow-[0_0_10px_rgba(112,66,248,0.2)] hover:shadow-[0_0_20px_rgba(112,66,248,0.4)] font-bold text-sm md:text-base"
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
                </div>
            </div>

            {/* Mobile nav menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-[68px] left-2 right-2 rounded-2xl bg-[#03001490] backdrop-blur-md border border-[#7042f880] shadow-[0_0_40px_rgba(112,66,248,0.25)] p-2 flex flex-col gap-1">
                    {TABS.map((tab) => {
                        if (tab.isDropdown) {
                            return (
                                <div key={tab.name} className="flex flex-col">
                                    <button
                                        onClick={() => setMobileProjectDropdownOpen(!mobileProjectDropdownOpen)}
                                        className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between text-left ${
                                            activeTab === tab.name
                                                ? 'bg-[#7042f8]/10 text-white'
                                                : 'text-slate-200 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        <span>{tab.name}</span>
                                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileProjectDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {/* Mobile Dropdown Items */}
                                    {mobileProjectDropdownOpen && (
                                        <div className="flex flex-col gap-0.5 pl-4 mt-1 border-l border-[#7042f880] ml-4 py-1.5 animate-in fade-in slide-in-from-top-1 duration-200 relative">
                                            {/* Mobile vertical sliding purple spotlight indicator */}
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: 16,
                                                    right: 0,
                                                    top: activeMobileHoverIdx !== null ? (activeMobileHoverIdx * 38 + 6) : 6,
                                                    height: 36,
                                                    opacity: activeMobileHoverIdx !== null ? 1 : 0,
                                                    transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), top 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                                                    transform: activeMobileHoverIdx !== null ? 'scale(1)' : 'scale(0.95)',
                                                    background: 'linear-gradient(to right, #7c3aed, #6366f1)',
                                                    boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.4)',
                                                    borderRadius: 8,
                                                    pointerEvents: 'none',
                                                    zIndex: 0,
                                                }}
                                            />
                                            <a
                                                href="/project"
                                                onMouseEnter={() => setMobileHoveredIdx(0)}
                                                onMouseLeave={() => setMobileHoveredIdx(null)}
                                                onClick={() => {
                                                    setActiveTab("Project");
                                                    setMobileMenuOpen(false);
                                                    setMobileProjectDropdownOpen(false);
                                                }}
                                                className={`relative z-10 w-full h-9 flex items-center justify-start px-4 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
                                                    activeMobileHoverIdx === 0 ? 'text-white' : 'text-slate-300'
                                                }`}
                                            >
                                                Project
                                            </a>
                                            <a
                                                href="/docs"
                                                onMouseEnter={() => setMobileHoveredIdx(1)}
                                                onMouseLeave={() => setMobileHoveredIdx(null)}
                                                onClick={() => {
                                                    setActiveTab("Project");
                                                    setMobileMenuOpen(false);
                                                    setMobileProjectDropdownOpen(false);
                                                }}
                                                className={`relative z-10 w-full h-9 flex items-center justify-start px-4 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
                                                    activeMobileHoverIdx === 1 ? 'text-white' : 'text-slate-300'
                                                }`}
                                            >
                                                Docs
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return (
                            <a
                                key={tab.name}
                                href={pathname === "/" ? tab.href : (tab.href.startsWith("#") ? `/${tab.href}` : tab.href)}
                                onClick={() => { setActiveTab(tab.name); setMobileMenuOpen(false); }}
                                className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                                    activeTab === tab.name
                                        ? 'bg-[#7042f8]/20 text-white'
                                        : 'text-slate-200 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                {tab.name}
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Navbar;