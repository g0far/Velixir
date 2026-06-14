import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Shield, Zap, Lock, Cpu, LineChart, ArrowUpRight, Layers, Database, Play, Loader2, Terminal, X, Check } from "lucide-react";

interface ProjectData {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    status: string;
    statusColor: string;
    icon: React.ReactNode;
    tech: string[];
    link: string;
    hasCodeInspector?: boolean;
}

const PROJECTS_DATA: ProjectData[] = [
    {
        id: "velixir-protocol",
        title: "Velixir Core Protocol",
        subtitle: "Reputation Borrowing & Credit Engine",
        description: "The core DeFi lending protocol that redefines traditional LTV limits. Reduces the required collateral ratio from 125% to 87.5% using a user's accumulated reputation score, verified cryptographically.",
        image: "/velixir.png",
        status: "LIVE ON SOLANA DEVNET",
        statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
        icon: <Layers className="h-5 w-5 text-cyan-400" />,
        tech: ["Next.js", "Anchor (Rust)", "Zustand", "Pyth Network", "Alchemy RPC"],
        link: "/borrow"
    },
    {
        id: "zk-identity",
        title: "ZK-Identity Bridge",
        subtitle: "Zero-Knowledge Score Verifier",
        description: "A modular privacy gateway using zk-SNARK technology (Groth16) to verify the validity of real-world banking credit scores on the smart-contract network without revealing the user's private identity.",
        image: "/velixir_3d.png",
        status: "STABLE SDK v1.2",
        statusColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.15)]",
        icon: <Lock className="h-5 w-5 text-purple-400" />,
        tech: ["Circom", "SnarkJS", "Rust", "Anchor", "Solana Devnet Verifier"],
        link: "/borrow?tab=Reputation",
        hasCodeInspector: true
    },
    {
        id: "nexus-risk-engine",
        title: "Nexus DeFi Analytics",
        subtitle: "Liquidation & Stress Simulator",
        description: "A real-time market risk monitoring dashboard. Lets users simulate market crashes, accruing loan interest, and delivers instant margin-call predictions visually.",
        image: "/CardImage.png",
        status: "ACTIVE SIMULATOR",
        statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.15)]",
        icon: <LineChart className="h-5 w-5 text-amber-400" />,
        tech: ["React", "Recharts", "Solana Web3.js", "Raydium SDK", "Pyth Network"],
        link: "/borrow"
    }
];

// Interactive 3D tilt card component
const InteractiveProjectCard = ({ 
    project, 
    onOpenInspector 
}: { 
    project: ProjectData; 
    onOpenInspector: () => void;
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [transformStyle, setTransformStyle] = useState("");
    const [glareStyle, setGlareStyle] = useState({ opacity: 0, left: "0px", top: "0px" });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate tilt: rotation from -8 to 8 degrees
        const rotateX = ((rect.height / 2 - y) / (rect.height / 2)) * 8;
        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 8;

        setTransformStyle(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`);
        setGlareStyle({
            opacity: 0.15,
            left: `${x}px`,
            top: `${y}px`
        });
    };

    const handleMouseLeave = () => {
        setTransformStyle("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
        setGlareStyle(prev => ({ ...prev, opacity: 0 }));
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ 
                transform: transformStyle,
                transition: "transform 0.1s ease-out, box-shadow 0.1s ease-out" 
            }}
            className="relative group flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900/60 to-slate-950/70 border border-white/5 hover:border-purple-500/30 p-5 backdrop-blur-md hover:shadow-[0_15px_40px_rgba(124,58,237,0.15)] overflow-hidden"
        >
            {/* Glossy reflective glare effect */}
            <div 
                className="absolute pointer-events-none rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 blur-[80px] w-36 h-36 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
                style={{ 
                    left: glareStyle.left,
                    top: glareStyle.top,
                    opacity: glareStyle.opacity 
                }}
            />

            <div className="relative z-10">
                {/* Masked image container with zoom effect */}
                <div className="relative h-44 w-full overflow-hidden rounded-xl bg-slate-950/60 border border-white/5 mb-5">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent z-10" />
                    <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    <span className={`absolute top-3 right-3 z-20 text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border ${project.statusColor}`}>
                        {project.status}
                    </span>
                </div>

                {/* Card Header & Title */}
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-purple-500/30 transition-all duration-300">
                        {project.icon}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-tight group-hover:text-purple-300 transition-colors duration-300">
                            {project.title}
                        </h3>
                        <span className="text-[9px] font-semibold text-slate-500">
                            {project.subtitle}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 mt-4 leading-relaxed h-16 overflow-hidden text-ellipsis">
                    {project.description}
                </p>
            </div>

            {/* Tech stack tags and Action link */}
            <div className="mt-6 pt-4 border-t border-white/5 relative z-10">
                <div className="flex flex-wrap gap-1.5 mb-5">
                    {project.tech.map((t) => (
                        <span
                            key={t}
                            className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-950/60 border border-white/5 px-2 py-0.5 rounded"
                        >
                            {t}
                        </span>
                    ))}
                </div>

                <div className="flex justify-between items-center">
                    <a
                        href={project.link}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 group-hover:text-purple-400 transition-colors duration-300"
                    >
                        Launch Dashboard
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                    
                    {project.hasCodeInspector && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onOpenInspector();
                            }}
                            className="text-[10px] font-mono font-semibold text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                            &lt;/&gt; View ZK Code
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const Projects = () => {
    // Stats Counting-up State
    const [valSecured, setValSecured] = useState(14000000);
    const [proofsVerified, setProofsVerified] = useState(80000);
    const [efficiency, setEfficiency] = useState(0);

    // Live Solana Devnet Network HUD State
    const [blockHeight, setBlockHeight] = useState(12842912);
    const [gasPrice, setGasPrice] = useState(21);

    // ZK Code Inspector Modal State
    const [inspectorOpen, setInspectorOpen] = useState(false);

    // Interactive Flow HUD State
    const [activeStep, setActiveStep] = useState(0); // 0 = idle, 1..4 = nodes active
    const [hudLogs, setHudLogs] = useState<string[]>([
        "SYSTEM: Press 'RUN DIAGNOSTIC TRACE' to execute ZK-Proof pipeline."
    ]);
    const [isRunning, setIsRunning] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Counting up simulation
        const duration = 1000;
        const intervalTime = 25;
        const steps = duration / intervalTime;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            setValSecured(Math.floor(14000000 + (842910 * (step / steps))));
            setProofsVerified(Math.floor(80000 + (4204 * (step / steps))));
            setEfficiency(Number((37.5 * (step / steps)).toFixed(1)));
            if (step >= steps) {
                clearInterval(timer);
            }
        }, intervalTime);

        return () => clearInterval(timer);
    }, []);

    // Ticking block height and gas fees
    useEffect(() => {
        const blockTimer = setInterval(() => {
            setBlockHeight(prev => prev + 1);
        }, 3000);
        
        const gasTimer = setInterval(() => {
            setGasPrice(Math.floor(15 + Math.random() * 12));
        }, 4000);

        return () => {
            clearInterval(blockTimer);
            clearInterval(gasTimer);
        };
    }, []);

    // Auto-scroll HUD terminal logs (only within the log container, not the page)
    useEffect(() => {
        if (logsEndRef.current) {
            const container = logsEndRef.current.parentElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [hudLogs]);

    const runDiagnostic = () => {
        if (isRunning) return;
        setIsRunning(true);
        setActiveStep(1);
        setHudLogs(["[SYSTEM] Diagnostic initiated...", "[NODE-1] Fetching bank credentials and KYC hashes..."]);

        setTimeout(() => {
            setActiveStep(2);
            setHudLogs(prev => [
                ...prev, 
                "[NODE-1] Fetching complete. Initializing local prover...",
                "[NODE-2] Compiling witness variables with snarkjs (Groth16)...",
                "[NODE-2] Proving constraints: 147,204 gates. zk-SNARK generated (128 bytes)."
            ]);
        }, 1200);

        setTimeout(() => {
            setActiveStep(3);
            setHudLogs(prev => [
                ...prev, 
                "[NODE-2] Proving complete. Emitting cryptographic proof to network...",
                "[NODE-3] Submitting proof signature to Solana Devnet verifier program...",
                "[NODE-3] Program verification SUCCESS. Network fee: 0.000005 SOL."
            ]);
        }, 2400);

        setTimeout(() => {
            setActiveStep(4);
            setHudLogs(prev => [
                ...prev, 
                "[NODE-3] Verification confirmed. Pushing update to Velixir Oracle...",
                "[NODE-4] Re-calibrating user health factors...",
                "[NODE-4] Maximum LTV set to 110%. Collateral requirement reduced by 37.5%!",
                "[SYSTEM] ZK-Proof pipeline trace completed: 100% HEALTHY."
            ]);
            setIsRunning(false);
        }, 3600);
    };

    return (
        <div
            className="flex flex-col items-center justify-center py-5 relative overflow-hidden"
            id="project"
        >
            {/* Background graphics styles */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes pulse-flow {
                  0%, 100% { border-color: rgba(139, 92, 246, 0.2); box-shadow: 0 0 5px rgba(139, 92, 246, 0.1); }
                  50% { border-color: rgba(6, 182, 212, 0.6); box-shadow: 0 0 20px rgba(6, 182, 212, 0.4); }
                }
                .pulse-active {
                  animation: pulse-flow 1.5s infinite;
                }
                @keyframes dash-move {
                  to { stroke-dashoffset: -40; }
                }
                .flow-wire {
                  stroke-dasharray: 8 4;
                  animation: dash-move 2s linear infinite;
                }
            `}} />

            {/* Ambient background glows */}
            <div className="absolute top-1/4 left-0 w-80 h-80 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Standalone Base Sepolia Live HUD status bar */}
            <div className="relative z-10 w-full max-w-[1400px] px-6 md:px-16 mb-4 flex items-center justify-end">
                <div className="flex items-center gap-3.5 bg-slate-950/70 border border-white/5 px-4 py-2 rounded-xl text-[9px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        SOLANA_DEVNET: <span className="text-emerald-400 font-bold">OPERATIONAL</span>
                    </span>
                    <span className="text-white/20">|</span>
                    <span>SLOT: <span className="text-cyan-400 font-bold">#{blockHeight.toLocaleString()}</span></span>
                    <span className="text-white/20">|</span>
                    <span>FEE: <span className="text-purple-400 font-bold">{gasPrice} µLAM</span></span>
                </div>
            </div>

            <div className="relative z-10 text-center max-w-2xl px-6 mb-12">
                <span className="text-[10px] font-mono font-bold tracking-widest text-purple-400 uppercase bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                    Velixir Ecosystem Portfolio
                </span>
                <h1 className="text-3xl md:text-5xl font-extrabold font-display text-white mt-4 tracking-tight">
                    Powering Capital{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500">
                        Efficiency
                    </span>
                </h1>
                <p className="text-slate-400 text-xs md:text-sm mt-3 leading-relaxed">
                    Explore the core modules and supporting infrastructure designed to bring real-world reputation scores into decentralized finance.
                </p>
            </div>

            {/* Ecosystem Stats Banner (Top of page) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 md:px-16 w-full max-w-[1400px] mb-12 relative z-10">
                <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-sm shadow-xl flex items-center justify-between">
                    <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Total Value Secured</span>
                        <div className="text-xl md:text-2xl font-extrabold text-white font-display mt-0.5">
                            ${valSecured.toLocaleString()}
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-purple-400" />
                    </div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-sm shadow-xl flex items-center justify-between">
                    <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">ZK-Proofs Verified</span>
                        <div className="text-xl md:text-2xl font-extrabold text-cyan-400 font-display mt-0.5">
                            {proofsVerified.toLocaleString()}
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Cpu className="h-5 w-5 text-cyan-400 animate-pulse" />
                    </div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-sm shadow-xl flex items-center justify-between">
                    <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Capital Efficiency Gain</span>
                        <div className="text-xl md:text-2xl font-extrabold text-emerald-400 font-display mt-0.5">
                            +{efficiency}%
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-emerald-400" />
                    </div>
                </div>
            </div>

            {/* Core Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 md:px-16 w-full max-w-[1400px] relative z-10 mb-16">
                {PROJECTS_DATA.map((project) => (
                    <InteractiveProjectCard
                        key={project.id}
                        project={project}
                        onOpenInspector={() => setInspectorOpen(true)}
                    />
                ))}
            </div>

            {/* Interactive System Architecture HUD (Bottom of page) */}
            <div className="w-full max-w-[1400px] px-6 md:px-16 relative z-10 mb-10">
                <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]"></div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-white font-display tracking-wide flex items-center gap-2">
                                <Layers className="h-4.5 w-4.5 text-purple-400" />
                                Interactive ZK-Proof System Architecture
                            </h2>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                Simulate the cryptographic proving cycle from external data sources to loan execution on the smart contract.
                            </p>
                        </div>
                        <button
                            onClick={runDiagnostic}
                            disabled={isRunning}
                            className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] disabled:opacity-40 disabled:cursor-not-allowed select-none ${isRunning ? 'animate-pulse' : 'cursor-pointer'}`}
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Running Pipeline...
                                </>
                            ) : (
                                <>
                                    <Play className="h-3.5 w-3.5 fill-white text-white" />
                                    Run Diagnostic Trace
                                </>
                            )}
                        </button>
                    </div>

                    {/* Nodes flow layout */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center mb-6 relative">
                        {/* Flow node 1 */}
                        <div className={`p-4 rounded-2xl bg-slate-950/40 border transition-all duration-300 ${
                            activeStep === 1 
                                ? 'border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.25)] pulse-active' 
                                : activeStep > 1 
                                    ? 'border-emerald-500/30' 
                                    : 'border-white/5'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Database className={`h-4 w-4 ${activeStep >= 1 ? 'text-cyan-400' : 'text-slate-500'}`} />
                                <span className="text-[10px] font-mono font-bold text-slate-400">Node-01</span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-2">Off-Chain Credentials</h4>
                            <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                                FICO scores, KYC identity documents, commercial bank links, & Web3 wallet history.
                            </p>
                        </div>

                        {/* Flow node 2 */}
                        <div className={`p-4 rounded-2xl bg-slate-950/40 border transition-all duration-300 ${
                            activeStep === 2 
                                ? 'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.25)] pulse-active' 
                                : activeStep > 2 
                                    ? 'border-emerald-500/30' 
                                    : 'border-white/5'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Cpu className={`h-4 w-4 ${activeStep >= 2 ? 'text-purple-400' : 'text-slate-500'}`} />
                                <span className="text-[10px] font-mono font-bold text-slate-400">Node-02</span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-2">ZK Prover Client</h4>
                            <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                                The Groth16 (snarkjs) proving engine assembles circuit parameters to guarantee score validity privately.
                            </p>
                        </div>

                        {/* Flow node 3 */}
                        <div className={`p-4 rounded-2xl bg-slate-950/40 border transition-all duration-300 ${
                            activeStep === 3 
                                ? 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] pulse-active' 
                                : activeStep > 3 
                                    ? 'border-emerald-500/30' 
                                    : 'border-white/5'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Lock className={`h-4 w-4 ${activeStep >= 3 ? 'text-amber-400' : 'text-slate-500'}`} />
                                <span className="text-[10px] font-mono font-bold text-slate-400">Node-03</span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-2">On-Chain Verifier</h4>
                            <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                                A verifier program on Solana Devnet validates the ZK proof in a decentralized manner.
                            </p>
                        </div>

                        {/* Flow node 4 */}
                        <div className={`p-4 rounded-2xl bg-slate-950/40 border transition-all duration-300 ${
                            activeStep === 4 
                                ? 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] pulse-active' 
                                : 'border-white/5'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Zap className={`h-4 w-4 ${activeStep >= 4 ? 'text-emerald-400' : 'text-slate-500'}`} />
                                <span className="text-[10px] font-mono font-bold text-slate-400">Node-04</span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-2">Lending Protocol</h4>
                            <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                                Loan LTV is unlocked up to a maximum of 110%. The minimum collateral ratio is adjusted to 87.5%.
                            </p>
                        </div>
                    </div>

                    {/* Console HUD */}
                    <div className="relative rounded-xl border border-white/5 bg-slate-950/80 p-4 h-36 overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-2 right-3 flex items-center gap-1.5 text-[8px] font-mono text-slate-500">
                            <Terminal className="h-3 w-3" />
                            DIAGNOSTIC TERMINAL
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[9px] text-cyan-400/80 scrollbar-thin scrollbar-thumb-slate-800">
                            {hudLogs.map((log, index) => {
                                let textClass = 'text-cyan-400/80';
                                if (log.startsWith('[SYSTEM]')) textClass = 'text-white/60';
                                if (log.includes('SUCCESS') || log.includes('valid')) textClass = 'text-emerald-400 font-bold';
                                if (log.startsWith('[NODE-2]')) textClass = 'text-purple-300';
                                if (log.startsWith('[NODE-3]')) textClass = 'text-amber-300';
                                if (log.startsWith('[NODE-4]')) textClass = 'text-emerald-300';
                                
                                return (
                                    <div key={index} className={`${textClass} flex items-start gap-1`}>
                                        <span className="text-white/20 select-none">&gt;</span>
                                        <span>{log}</span>
                                    </div>
                                );
                            })}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ZK Circuit Code Inspector Modal */}
            {inspectorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="relative w-full max-w-2xl bg-[#090916] border border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.2)]">
                        {/* Header tab */}
                        <div className="bg-slate-950 px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="h-5 w-5 rounded bg-purple-500/10 border border-purple-500/25 flex items-center justify-center font-mono text-[9px] text-purple-400 font-bold">
                                    C
                                </div>
                                <span className="font-mono text-xs text-slate-300 font-semibold tracking-wider">
                                    credit_score_verifier.circom
                                </span>
                                <span className="text-[8px] font-mono bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">
                                    zk-snark circuit
                                </span>
                            </div>
                            <button 
                                onClick={() => setInspectorOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Editor interface */}
                        <div className="p-5 font-mono text-[11px] leading-relaxed bg-[#05050e] overflow-x-auto h-80 border-b border-white/5 text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
                            <div className="flex gap-4">
                                {/* Line numbers */}
                                <div className="text-slate-600 text-right select-none pr-2 border-r border-white/5 flex flex-col">
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                    <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                                    <span>11</span><span>12</span><span>13</span><span>14</span><span>15</span>
                                    <span>16</span><span>17</span>
                                </div>
                                
                                {/* Code lines with highlighted components */}
                                <div className="flex flex-col whitespace-pre">
                                    <div><span className="text-purple-400">{"pragma"}</span>{" circom 2.0.0;"}</div>
                                    <div></div>
                                    <div><span className="text-purple-400">{"include"}</span> <span className="text-amber-300">{"\"./comparators.circom\";"}</span></div>
                                    <div></div>
                                    <div><span className="text-slate-500">{"// Verifies a credit score above a threshold without revealing the actual score"}</span></div>
                                    <div><span className="text-indigo-400">{"template"}</span> <span className="text-cyan-400 font-bold">{"CreditScoreVerifier"}</span>{"() {"}</div>
                                    <div>{"    "}<span className="text-indigo-400">{"signal input"}</span>{" score;          "}<span className="text-slate-500">{"// Private input (not recorded on chain)"}</span></div>
                                    <div>{"    "}<span className="text-indigo-400">{"signal input"}</span>{" minAllowedScore; "}<span className="text-slate-500">{"// Public input (batas minimal juri)"}</span></div>
                                    <div>{"    "}<span className="text-indigo-400">{"signal output"}</span>{" isValid;         "}<span className="text-slate-500">{"// Public output (0 = invalid, 1 = valid)"}</span></div>
                                    <div></div>
                                    <div>{"    "}<span className="text-purple-400">{"component"}</span>{" gte = "}<span className="text-cyan-300">{"GreaterEqThan"}</span>{"("}<span className="text-emerald-400">{"10"}</span>{");"}</div>
                                    <div>{"    gte.in["}<span className="text-emerald-400">{"0"}</span>{"] "}<span className="text-pink-400">{"<=="}</span>{" score;"}</div>
                                    <div>{"    gte.in["}<span className="text-emerald-400">{"1"}</span>{"] "}<span className="text-pink-400">{"<=="}</span>{" minAllowedScore;"}</div>
                                    <div></div>
                                    <div>{"    isValid "}<span className="text-pink-400">{"<=="}</span>{" gte.out;"}</div>
                                    <div>{"}"}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 p-4 px-5 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
                            <div className="mt-0.5 h-4.5 w-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                <Check className="h-3 w-3 text-emerald-400" />
                            </div>
                            <p>
                                This Circom circuit defines the mathematical constraints that are compiled in the user's browser. The resulting zk-SNARK proof guarantees that score &gt;= minAllowedScore holds true, without exposing the user's actual score in the Solana Devnet transaction.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;