"use client";

import React, { useState, useEffect, useRef } from "react";
import VelixirFooter from "@/components/main/VelixirFooter";
import {
    BookOpen,
    Rocket,
    ShieldCheck,
    Coins,
    Repeat,
    Layers,
    Lock,
    Gauge,
    Wallet,
    ArrowUpRight,
    Cpu,
    LineChart,
    Droplets,
    AlertTriangle,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Docs content model
   ────────────────────────────────────────────────────────────── */

interface DocSection {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const SECTIONS: DocSection[] = [
    { id: "introduction", label: "Introduction", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "getting-started", label: "Getting Started", icon: <Rocket className="h-3.5 w-3.5" /> },
    { id: "reputation", label: "Reputation Engine", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { id: "lending", label: "Lending & Borrow", icon: <Coins className="h-3.5 w-3.5" /> },
    { id: "health", label: "Borrow Health", icon: <Gauge className="h-3.5 w-3.5" /> },
    { id: "market", label: "Market & Swap", icon: <Repeat className="h-3.5 w-3.5" /> },
    { id: "staking", label: "Liquidity & Staking", icon: <Droplets className="h-3.5 w-3.5" /> },
    { id: "architecture", label: "ZK Architecture", icon: <Layers className="h-3.5 w-3.5" /> },
];

interface FeatureCard {
    title: string;
    desc: string;
    icon: React.ReactNode;
    tone: string;
    link?: string;
}

const FEATURE_CARDS: FeatureCard[] = [
    {
        title: "Reputation Borrowing",
        desc: "A Trust Score of 0–1000 raises your Effective Liquidation Threshold, lowering collateral requirements from 137.5% to 100%.",
        icon: <ShieldCheck className="h-5 w-5 text-purple-400" />,
        tone: "purple",
        link: "/borrow",
    },
    {
        title: "Capital Efficiency",
        desc: "Verified reputation acts as additional collateral — higher borrow power without traditional over-collateralization.",
        icon: <Gauge className="h-5 w-5 text-cyan-400" />,
        tone: "cyan",
        link: "/borrow",
    },
    {
        title: "ZK-Identity Verifier",
        desc: "Real-world credit scores are verified via zk-SNARK (Plonky2) without revealing the user's true identity.",
        icon: <Lock className="h-5 w-5 text-emerald-400" />,
        tone: "emerald",
        link: "/borrow?tab=Reputation",
    },
    {
        title: "Market & Swap",
        desc: "Trade Solana Devnet tokens with real-time price feeds and charting through the Raydium SDK integration.",
        icon: <LineChart className="h-5 w-5 text-amber-400" />,
        tone: "amber",
        link: "/market",
    },
    {
        title: "Liquidity & Staking",
        desc: "Provide liquidity and stake assets to strengthen your reputation profile while earning rewards.",
        icon: <Droplets className="h-5 w-5 text-indigo-400" />,
        tone: "indigo",
        link: "/liquidity",
    },
    {
        title: "Portfolio & Wallet",
        desc: "Monitor positions, health factors, and history in one dashboard. Connect Phantom/Solflare for on-chain use.",
        icon: <Wallet className="h-5 w-5 text-rose-400" />,
        tone: "rose",
        link: "/borrow?tab=Portfolio",
    },
];

const HEALTH_FORMULAS: { label: string; value: string; sub: string; accent: string }[] = [
    {
        label: "Market Health",
        value: "1.60×",
        sub: "Baseline safety from Collateral × 0.80 ÷ Debt. Liquidates at the 1.0× line.",
        accent: "text-cyan-400",
    },
    {
        label: "Reputation Health",
        value: "85%",
        sub: "Borrowing strength from Trust Score & verified credentials (R = Score / 1000).",
        accent: "text-purple-400",
    },
    {
        label: "Borrow Health",
        value: "2.17×",
        sub: "Headline metric: (Collateral × ELT) ÷ Debt. Collateral strengthened by reputation.",
        accent: "text-emerald-400",
    },
];

const ELT_ANCHORS: { score: string; elt: string }[] = [
    { score: "≤ 300", elt: "85%" },
    { score: "500", elt: "93.6%" },
    { score: "700", elt: "102.1%" },
    { score: "850", elt: "108.6%" },
    { score: "1000", elt: "115.0%" },
];

const TONE_BORDER: Record<string, string> = {
    purple: "group-hover:border-purple-500/40 bg-purple-500/10 border-purple-500/20",
    cyan: "group-hover:border-cyan-500/40 bg-cyan-500/10 border-cyan-500/20",
    emerald: "group-hover:border-emerald-500/40 bg-emerald-500/10 border-emerald-500/20",
    amber: "group-hover:border-amber-500/40 bg-amber-500/10 border-amber-500/20",
    indigo: "group-hover:border-indigo-500/40 bg-indigo-500/10 border-indigo-500/20",
    rose: "group-hover:border-rose-500/40 bg-rose-500/10 border-rose-500/20",
};

/* ──────────────────────────────────────────────────────────────
   Shared visual primitives (matching Velixir card language)
   ────────────────────────────────────────────────────────────── */

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[10px] font-mono font-bold tracking-widest text-purple-400 uppercase bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
        {children}
    </span>
);

const SectionShell = ({
    id,
    eyebrow,
    title,
    children,
}: {
    id: string;
    eyebrow: string;
    title: React.ReactNode;
    children: React.ReactNode;
}) => (
    <section id={id} className="scroll-mt-28">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-xl md:text-2xl font-extrabold font-display text-white mt-3 mb-5 tracking-tight">
            {title}
        </h2>
        {children}
    </section>
);

// Hover treatment applied to every card: the tile flips to a white background
// with a black icon when the parent card is hovered.
const ICON_FLIP =
    "transition-all duration-300 group-hover:!bg-white group-hover:!border-white group-hover:!text-black group-hover:scale-110 [&_svg]:transition-colors [&_svg]:duration-300 group-hover:[&_svg]:!text-black";

const Panel = ({
    children,
    className = "",
    interactive = false,
}: {
    children: React.ReactNode;
    className?: string;
    interactive?: boolean;
}) => (
    <div
        className={`rounded-2xl bg-gradient-to-b from-slate-900/60 to-slate-950/70 border border-white/5 backdrop-blur-md p-5 md:p-6 transition-all duration-300 ease-out ${
            interactive
                ? "group hover:-translate-y-1.5 hover:scale-[1.03] hover:border-purple-500/30 hover:shadow-[0_20px_45px_rgba(124,58,237,0.22)]"
                : ""
        } ${className}`}
    >
        {children}
    </div>
);

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("introduction");
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveSection(entry.target.id);
                });
            },
            { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
        );
        SECTIONS.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) observerRef.current?.observe(el);
        });
        return () => observerRef.current?.disconnect();
    }, []);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="min-h-screen bg-[#030014] overflow-x-hidden flex flex-col justify-between relative">
            {/* Background blackhole video — matching the Project page header */}
            <div className="absolute top-0 left-0 w-full h-[600px] z-0 overflow-hidden pointer-events-none">
                <video
                    autoPlay
                    muted
                    loop
                    className="rotate-180 absolute top-0 -translate-y-[45%] left-0 w-full h-full object-cover opacity-40"
                >
                    <source src="/blackhole.webm" type="video/webm" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030014]/60 to-[#030014]" />
            </div>

            {/* Ambient glows */}
            <div className="absolute top-1/4 left-0 w-80 h-80 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

            <main className="flex-grow pt-[110px] md:pt-[130px] pb-16 relative z-10 w-full max-w-[1400px] mx-auto px-5 md:px-12">
                {/* ── Hero ───────────────────────────────────────── */}
                <header className="text-center max-w-2xl mx-auto mb-14">
                    <Eyebrow>Velixir Documentation</Eyebrow>
                    <h1 className="text-3xl md:text-5xl font-extrabold font-display text-white mt-4 tracking-tight">
                        Docs &{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500">
                            Protocol Guide
                        </span>
                    </h1>
                    <p className="text-slate-400 text-xs md:text-sm mt-4 leading-relaxed">
                        A complete guide to the <span className="text-purple-300 font-semibold">Velixir</span> protocol — a
                        reputation-powered lending system on Solana Devnet where digital trust is treated as real
                        collateral.
                    </p>
                </header>

                {/* ── Two-column docs layout: sidebar + content ──── */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar column */}
                    <aside className="lg:w-64 shrink-0">
                        <div className="lg:sticky lg:top-28">
                            <Panel className="!p-3">
                                <span className="block text-[9px] font-mono text-slate-500 uppercase font-bold tracking-widest px-3 py-2">
                                    On this page
                                </span>
                                <nav className="flex flex-col gap-0.5">
                                    {SECTIONS.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => scrollTo(s.id)}
                                            className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                                                activeSection === s.id
                                                    ? "bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-white border border-purple-500/30 shadow-[0_0_14px_rgba(124,58,237,0.18)]"
                                                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                                            }`}
                                        >
                                            <span
                                                className={
                                                    activeSection === s.id
                                                        ? "text-purple-300"
                                                        : "text-slate-500 group-hover:text-slate-300"
                                                }
                                            >
                                                {s.icon}
                                            </span>
                                            {s.label}
                                        </button>
                                    ))}
                                </nav>
                            </Panel>

                            {/* Devnet status chip */}
                            <div className="mt-3 flex items-center gap-2 bg-slate-950/70 border border-white/5 px-4 py-2.5 rounded-xl text-[9px] font-mono text-slate-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                SOLANA_DEVNET:{" "}
                                <span className="text-emerald-400 font-bold">OPERATIONAL</span>
                            </div>
                        </div>
                    </aside>

                    {/* Content column */}
                    <div className="flex-1 min-w-0 flex flex-col gap-16">
                        {/* Introduction */}
                        <SectionShell
                            id="introduction"
                            eyebrow="01 — Overview"
                            title={
                                <>
                                    Your Reputation Is Your{" "}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                        Collateral
                                    </span>
                                </>
                            }
                        >
                            <Panel className="mb-6">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Velixir is a DeFi protocol that redefines lending. Instead of relying solely on
                                    traditional over-collateralization, Velixir uses a verified{" "}
                                    <span className="text-white font-semibold">Trust Score</span> to increase borrowing
                                    power and capital efficiency. A strong reputation raises your effective liquidation
                                    threshold — it never triggers liquidation by itself.
                                </p>
                            </Panel>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {FEATURE_CARDS.map((card) => (
                                    <a
                                        key={card.title}
                                        href={card.link}
                                        className="group relative flex flex-col rounded-2xl bg-gradient-to-b from-slate-900/60 to-slate-950/70 border border-white/5 hover:border-purple-500/30 p-5 backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_20px_45px_rgba(124,58,237,0.22)]"
                                    >
                                        <div
                                            className={`h-11 w-11 rounded-xl border flex items-center justify-center mb-4 transition-all duration-300 group-hover:!bg-white group-hover:!border-white group-hover:scale-110 group-hover:shadow-[0_0_18px_rgba(255,255,255,0.35)] [&_svg]:transition-colors [&_svg]:duration-300 group-hover:[&_svg]:!text-black ${TONE_BORDER[card.tone]}`}
                                        >
                                            {card.icon}
                                        </div>
                                        <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                                            {card.title}
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed flex-grow">
                                            {card.desc}
                                        </p>
                                    </a>
                                ))}
                            </div>
                        </SectionShell>

                        {/* Getting Started */}
                        <SectionShell id="getting-started" eyebrow="02 — Quickstart" title="Getting Started">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    {
                                        n: "1",
                                        t: "Connect Wallet",
                                        d: "Connect Phantom or Solflare for real on-chain transactions on Solana Devnet. Other wallets run as a simulated session.",
                                    },
                                    {
                                        n: "2",
                                        t: "Fund Devnet SOL",
                                        d: "Use the Airdrop button in the wallet menu or faucet.solana.com to get Devnet SOL for paying fees.",
                                    },
                                    {
                                        n: "3",
                                        t: "Build Reputation",
                                        d: "Verify your credentials via ZK-Identity to raise your Trust Score, then borrow with lower collateral requirements.",
                                    },
                                ].map((step) => (
                                    <Panel key={step.n} interactive className="relative overflow-hidden">
                                        <span className="absolute -top-3 -right-1 text-6xl font-extrabold font-display text-white/5 select-none">
                                            {step.n}
                                        </span>
                                        <div
                                            className={`h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 font-mono font-bold text-sm mb-3 ${ICON_FLIP}`}
                                        >
                                            {step.n}
                                        </div>
                                        <h3 className="text-sm font-bold text-white">{step.t}</h3>
                                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{step.d}</p>
                                    </Panel>
                                ))}
                            </div>
                        </SectionShell>

                        {/* Reputation Engine */}
                        <SectionShell id="reputation" eyebrow="03 — Trust Layer" title="Reputation Engine">
                            <Panel interactive>
                                <div className="flex items-start gap-4 mb-5">
                                    <div className={`h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 ${ICON_FLIP}`}>
                                        <Cpu className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        Reputation Factor <code className="font-mono text-purple-300">R = TrustScore / 1000</code>.
                                        The Trust Score raises your{" "}
                                        <span className="text-white font-semibold">Effective Liquidation Threshold (ELT)</span>{" "}
                                        in a piecewise-linear way between the following anchors:
                                    </p>
                                </div>

                                <div className="grid grid-cols-5 gap-2">
                                    {ELT_ANCHORS.map((a) => (
                                        <div
                                            key={a.score}
                                            className="rounded-xl bg-slate-950/60 border border-white/5 p-3 text-center"
                                        >
                                            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                                                Score
                                            </div>
                                            <div className="text-sm font-bold text-white font-display mt-0.5">{a.score}</div>
                                            <div className="mt-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                                                ELT
                                            </div>
                                            <div className="text-sm font-bold text-purple-300 font-display mt-0.5">{a.elt}</div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
                                    Linear interpolation between the two nearest anchors (e.g. score 600 → 86%, score 925 → 91%).
                                    A higher Trust Score → higher ELT → greater borrow power & capital efficiency.
                                </p>
                            </Panel>
                        </SectionShell>

                        {/* Lending & Borrow */}
                        <SectionShell id="lending" eyebrow="04 — Core Protocol" title="Lending & Borrow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Panel interactive>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Coins className="h-4 w-4 text-cyan-400" /> Max Borrow Power
                                    </h3>
                                    <p className="text-[12px] text-slate-400 mt-3 leading-relaxed">
                                        A 5% safety buffer below the liquidation line:
                                    </p>
                                    <div className="mt-3 rounded-xl bg-slate-950/70 border border-white/5 p-3 font-mono text-[11px] text-cyan-300 leading-relaxed">
                                        MaxBorrowLTV = ELT − 0.05
                                        <br />
                                        MaxBorrow = Collateral × MaxBorrowLTV
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                        Example: Collateral $10,000 · Score 850 → ELT 90% → MaxBorrow{" "}
                                        <span className="text-white font-semibold">$8,500</span>.
                                    </p>
                                </Panel>
                                <Panel interactive>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-400" /> Liquidation Rule
                                    </h3>
                                    <p className="text-[12px] text-slate-400 mt-3 leading-relaxed">
                                        Liquidation occurs <span className="text-white font-semibold">if and only if</span>:
                                    </p>
                                    <div className="mt-3 rounded-xl bg-slate-950/70 border border-amber-500/15 p-3 font-mono text-[11px] text-amber-300 leading-relaxed">
                                        LTV &gt; ELT &nbsp;⟺&nbsp; BorrowHealth &lt; 1.0
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                        No other trigger exists. The Trust Score{" "}
                                        <span className="text-white font-semibold">never</span> causes liquidation
                                        directly.
                                    </p>
                                </Panel>
                            </div>
                        </SectionShell>

                        {/* Borrow Health */}
                        <SectionShell id="health" eyebrow="05 — Risk Dashboard" title="Borrow Health Monitor">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                {HEALTH_FORMULAS.map((m) => (
                                    <Panel key={m.label} interactive>
                                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">
                                            {m.label}
                                        </span>
                                        <div className={`text-3xl font-extrabold font-display mt-1 ${m.accent}`}>
                                            {m.value}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{m.sub}</p>
                                    </Panel>
                                ))}
                            </div>
                            <Panel>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        🟢 Healthy &gt; 1.5×
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        🟡 Warning 1.0–1.5×
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                        🔴 Risk &lt; 1.0×
                                    </span>
                                    <span className="ml-auto text-slate-500">
                                        $5,000 / $8,500 borrowed · $3,500 available · Effective LT 90%
                                    </span>
                                </div>
                            </Panel>
                        </SectionShell>

                        {/* Market & Swap */}
                        <SectionShell id="market" eyebrow="06 — Trading" title="Market & Swap">
                            <Panel interactive>
                                <div className="flex items-start gap-4">
                                    <div className={`h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 ${ICON_FLIP}`}>
                                        <LineChart className="h-5 w-5 text-amber-400" />
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        The Market module provides Solana Devnet token trading with{" "}
                                        <span className="text-white font-semibold">lightweight-charts</span> and swap routing
                                        via <span className="text-white font-semibold">Raydium SDK v2</span>. Price feeds are
                                        fetched through an internal API route, with a mock fallback when the endpoint is blocked.
                                    </p>
                                </div>
                            </Panel>
                        </SectionShell>

                        {/* Liquidity & Staking */}
                        <SectionShell id="staking" eyebrow="07 — Yield" title="Liquidity & Staking">
                            <Panel interactive>
                                <div className="flex items-start gap-4">
                                    <div className={`h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 ${ICON_FLIP}`}>
                                        <Droplets className="h-5 w-5 text-indigo-400" />
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        Provide liquidity and stake assets to earn rewards while strengthening your on-chain
                                        reputation profile. Consistent staking activity contributes to your Trust Score, which
                                        in turn increases your borrow power in the Lending module.
                                    </p>
                                </div>
                            </Panel>
                        </SectionShell>

                        {/* ZK Architecture */}
                        <SectionShell id="architecture" eyebrow="08 — Under the Hood" title="ZK-Proof Architecture">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {[
                                    { n: "Node-01", t: "Off-Chain Credentials", d: "FICO score, KYC hash, bank links, & Web3 wallet history.", c: "text-cyan-400" },
                                    { n: "Node-02", t: "ZK Prover Client", d: "Plonky2 builds the circuit to guarantee score validity privately.", c: "text-purple-400" },
                                    { n: "Node-03", t: "On-Chain Verifier", d: "The Solana Devnet verifier program validates the ZK proof.", c: "text-amber-400" },
                                    { n: "Node-04", t: "Lending Protocol", d: "ELT & LTV are recalibrated based on the verified score.", c: "text-emerald-400" },
                                ].map((node) => (
                                    <Panel key={node.n} interactive className="!p-4">
                                        <div className="flex items-center gap-2">
                                            <Layers className={`h-4 w-4 ${node.c}`} />
                                            <span className="text-[10px] font-mono font-bold text-slate-400">{node.n}</span>
                                        </div>
                                        <h4 className="text-xs font-bold text-white mt-2">{node.t}</h4>
                                        <p className="text-[9px] text-slate-400 mt-1 leading-snug">{node.d}</p>
                                    </Panel>
                                ))}
                            </div>
                            <Panel className="mt-5 flex items-center justify-between flex-wrap gap-3">
                                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                                    See the interactive ZK-Proof pipeline and circuit code inspector on the Project page.
                                </p>
                                <a
                                    href="/project"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                                >
                                    Open System Architecture
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </a>
                            </Panel>
                        </SectionShell>
                    </div>
                </div>
            </main>

            <div className="relative z-10">
                <VelixirFooter />
            </div>
        </div>
    );
}
