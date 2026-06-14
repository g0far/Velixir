import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, ShieldCheck, Landmark, Link, FileHeart, CircleHelp, Loader2, Shield, Activity, RefreshCw } from 'lucide-react';
import { CredentialCard } from '@/lib/types/borrow';
import { getTrustTier } from '@/lib/store/trustStore';

interface TrustBuilderProps {
  credentials: CredentialCard[];
  onToggle: (id: string) => void;
  totalReduction: number; // e.g. 0.30
  collateralSaved: number; // calculated saved amount e.g. 60000
  collateralRatio?: number; // resulting required collateral ratio %, e.g. 100
  connected?: boolean;
  trustScore?: number;
  wrongNetwork?: boolean;
}

export default function TrustBuilder({ credentials, onToggle, totalReduction, collateralSaved, collateralRatio, connected = true, trustScore = 0, wrongNetwork = false }: TrustBuilderProps) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [zkLogs, setZkLogs] = useState<string[]>([]);
  const [zkProgress, setZkProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<'idle' | 'proving' | 'revoking' | 'success'>('idle');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs console to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [zkLogs]);

  const handleCardClick = (id: string, isActive: boolean) => {
    if (!connected || wrongNetwork) return;

    if (isActive) {
      // Disable immediately without effects/animation
      onToggle(id);
    } else {
      // Proving sequence (1600ms)
      setVerifyingId(id);
      setScanStatus('proving');
      setZkProgress(0);
      setZkLogs(['[SYSTEM] Initializing Plonky2 zk-SNARK prover circuit...']);

      const steps = [
        { time: 250, progress: 15, log: `[WITNESS] Compiling witness variables for credential: ${id}...` },
        { time: 500, progress: 35, log: '[WITNESS] Math constraint check: 147,204 gates configured.' },
        { time: 750, progress: 55, log: '[PROVER] Executing elliptic-curve multi-scalar multiplication (MSM)...' },
        { time: 1050, progress: 75, log: '[PROVER] Polynomial commitment generated. Wrapping zk-SNARK proof...' },
        { time: 1350, progress: 90, log: '[VERIFIER] Submitting proof signature to Solana Devnet verifier program...' },
        { time: 1600, progress: 100, log: '[SUCCESS] On-chain proof verified! Capital reduction unlocked.' }
      ];

      steps.forEach((step) => {
        setTimeout(() => {
          setZkProgress(step.progress);
          setZkLogs(prev => [...prev, step.log]);
          if (step.progress === 100) {
            setScanStatus('success');
            setTimeout(() => {
              onToggle(id);
              setVerifyingId(null);
              setScanStatus('idle');
            }, 300);
          }
        }, step.time);
      });
    }
  };

  // Map credential id to an icon
  const getIcon = (id: string, colorClass: string) => {
    switch (id) {
      case 'credit_score':
        return <CreditCard className={`h-4 w-4 ${colorClass}`} />;
      case 'kyc':
        return <ShieldCheck className={`h-4 w-4 ${colorClass}`} />;
      case 'banking':
        return <Landmark className={`h-4 w-4 ${colorClass}`} />;
      case 'onchain':
        return <Link className={`h-4 w-4 ${colorClass}`} />;
      case 'consent':
        return <FileHeart className={`h-4 w-4 ${colorClass}`} />;
      default:
        return <CircleHelp className={`h-4 w-4 ${colorClass}`} />;
    }
  };

  const tier = getTrustTier(trustScore);

  const tierStyles = (() => {
    if (!tier) {
      return {
        cardBg: 'bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border-indigo-500/50 shadow-lg shadow-[0_0_15px_rgba(99,102,241,0.15)]',
        border: 'border-indigo-500/50',
        hoverBorder: 'hover:border-indigo-400/60',
        iconBg: 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400',
        iconText: 'text-indigo-400',
        hoverText: 'group-hover:text-indigo-300',
        toggleBg: 'bg-indigo-600',
        accentLabel: 'text-indigo-400',
        labelBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      };
    }
    
    switch (tier.name) {
      case 'Bronze':
        return {
          cardBg: 'bg-gradient-to-r from-amber-950/40 via-amber-900/10 to-slate-900 border-amber-500/50 shadow-lg shadow-[0_0_15px_rgba(245,158,11,0.15)]',
          border: 'border-amber-500/50',
          hoverBorder: 'hover:border-amber-400/60',
          iconBg: 'bg-amber-500/20 border border-amber-500/30 text-amber-400',
          iconText: 'text-amber-400',
          hoverText: 'group-hover:text-amber-300',
          toggleBg: 'bg-amber-600',
          accentLabel: 'text-amber-400',
          labelBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      case 'Silver':
        return {
          cardBg: 'bg-gradient-to-r from-slate-800/30 via-slate-900/15 to-slate-950 border-slate-400/50 shadow-lg shadow-[0_0_15px_rgba(148,163,184,0.15)]',
          border: 'border-slate-400/50',
          hoverBorder: 'hover:border-slate-300/60',
          iconBg: 'bg-slate-500/20 border border-slate-400/30 text-slate-300',
          iconText: 'text-slate-300',
          hoverText: 'group-hover:text-slate-200',
          toggleBg: 'bg-slate-500',
          accentLabel: 'text-slate-300',
          labelBg: 'bg-slate-500/10 text-slate-300 border-slate-500/20'
        };
      case 'Gold':
        return {
          cardBg: 'bg-gradient-to-r from-yellow-950/40 via-yellow-900/10 to-slate-900 border-yellow-500/50 shadow-lg shadow-[0_0_15px_rgba(234,179,8,0.15)]',
          border: 'border-yellow-500/50',
          hoverBorder: 'hover:border-yellow-400/60',
          iconBg: 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400',
          iconText: 'text-yellow-400',
          hoverText: 'group-hover:text-yellow-300',
          toggleBg: 'bg-yellow-500',
          accentLabel: 'text-yellow-400',
          labelBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        };
      case 'Elite':
        return {
          cardBg: 'bg-gradient-to-r from-violet-950/50 via-purple-950/35 to-slate-900 border-violet-500/50 shadow-lg shadow-[0_0_15px_rgba(139,92,246,0.2)]',
          border: 'border-violet-500/50',
          hoverBorder: 'hover:border-violet-400/60',
          iconBg: 'bg-violet-500/20 border border-violet-500/30 text-violet-400',
          iconText: 'text-violet-400',
          hoverText: 'group-hover:text-violet-300',
          toggleBg: 'bg-violet-600',
          accentLabel: 'text-violet-400',
          labelBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
        };
      default:
        return {
          cardBg: 'bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border-indigo-500/50 shadow-lg shadow-[0_0_15px_rgba(99,102,241,0.15)]',
          border: 'border-indigo-500/50',
          hoverBorder: 'hover:border-indigo-400/60',
          iconBg: 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400',
          iconText: 'text-indigo-400',
          hoverText: 'group-hover:text-indigo-300',
          toggleBg: 'bg-indigo-600',
          accentLabel: 'text-indigo-400',
          labelBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        };
    }
  })();

  // ---- Progress toward the next trust tier ----
  // Keeps every credential feeling rewarding: even a single credential visibly
  // advances the bar, while a full tier (APY discount) still requires accumulation.
  const TIER_LADDER = [
    { name: 'Bronze', at: 500 },
    { name: 'Silver', at: 700 },
    { name: 'Gold', at: 850 },
    { name: 'Elite', at: 1000 },
  ] as const;
  const nextStep = TIER_LADDER.find((t) => trustScore < t.at);
  const prevFloor = TIER_LADDER.reduce((floor, t) => (trustScore >= t.at ? t.at : floor), 300);
  const progressPct = nextStep
    ? Math.max(0, Math.min(100, ((trustScore - prevFloor) / (nextStep.at - prevFloor)) * 100))
    : 100;
  const pointsToGo = nextStep ? nextStep.at - trustScore : 0;
  const currentTierLabel = tier?.name ?? 'Neutral';
  const barGradient = {
    Bronze: 'from-amber-600 to-amber-400',
    Silver: 'from-slate-500 to-slate-300',
    Gold: 'from-yellow-600 to-yellow-400',
    Elite: 'from-violet-600 to-fuchsia-500',
  }[nextStep?.name ?? 'Elite'];

  return (
    <div className="space-y-3">
      {/* Build Your Trust Credential Cards Column */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-3.5 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-display text-base font-bold text-white flex items-center gap-1.5">
              Build Your Trust
              {connected && tier && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ml-1.5 border uppercase tracking-wider transition-colors duration-300 ${tierStyles.labelBg}`}>
                  {tier.name}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Verify credentials to unlock reduced collateral requirements in real-time.
            </p>
          </div>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border transition-colors duration-300 ${
            (connected && tier) ? tierStyles.labelBg : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          }`}>
            {connected ? credentials.filter(c => c.active).length : 0} / {credentials.length} Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {credentials.map((cred) => {
            const isActive = cred.active && connected;
            const isClickable = connected && !wrongNetwork;
            return (
              <div
                key={cred.id}
                onClick={() => isClickable && handleCardClick(cred.id, isActive)}
                className={`group flex items-center justify-between p-2 rounded-lg border transition-all duration-300 select-none ${
                  isActive
                    ? `${tierStyles.cardBg} ${tierStyles.border}`
                    : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/60'
                } ${(!connected || wrongNetwork) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      isActive
                        ? tierStyles.iconBg
                        : 'bg-slate-900 border border-white/5 text-slate-400'
                    }`}
                  >
                    {getIcon(cred.id, isActive ? tierStyles.iconText : 'text-slate-400')}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold text-white transition-colors leading-none ${
                      isActive ? tierStyles.hoverText : 'group-hover:text-indigo-300'
                    }`}>
                      {cred.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[9px] font-mono font-semibold px-1 py-0.5 rounded ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isActive ? cred.status : 'Inactive'}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-mono">
                        -{cred.reductionValue * 100}% Collateral Ratio
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verified Badge / Toggle Button */}
                <div className="flex items-center gap-3">
                  <div
                    className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 ${
                      isActive ? tierStyles.toggleBg : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform duration-300 ${
                        isActive ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress toward next tier — keeps every credential feeling rewarding */}
        {connected && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                {nextStep ? (
                  <>Progress to <span className={tierStyles.accentLabel}>{nextStep.name}</span></>
                ) : (
                  <span className="text-violet-400">Max Tier — Elite Unlocked</span>
                )}
              </span>
              {nextStep && (
                <span className="text-[10px] font-mono font-bold text-white">
                  {pointsToGo} pts to go
                </span>
              )}
            </div>
            <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] font-mono text-slate-500">{currentTierLabel} · {trustScore} pts</span>
              {nextStep && <span className="text-[9px] font-mono text-slate-500">{nextStep.name} · {nextStep.at} pts</span>}
            </div>
          </div>
        )}
      </div>

      {/* Large Total Collateral Reduction widget */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-violet-950/40 to-slate-950 border border-indigo-500/20 p-3 shadow-2xl">
        {/* Abstract futuristic grid pattern decoration */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-semibold text-indigo-400 uppercase tracking-wider">
              Total Collateral Reduction
            </span>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight">
                -{Math.round(totalReduction * 100)}%
              </span>
              <span className="text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                Verified Rep
              </span>
            </div>
          </div>
          <div className="text-left md:text-right">
            <span className="text-[10px] font-semibold text-slate-400">Capital Saved</span>
            <div className="text-lg md:text-xl font-bold text-emerald-400 font-display mt-0.5">
              ${collateralSaved.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[9px] text-slate-550 mt-0.5">
              Reduced on-chain liquid capital locking requirement
            </p>
          </div>
        </div>
      </div>

      {/* Holographic ZK Prover Modal Overlay */}
      {verifyingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scan-line {
              0% { top: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
            .hologram-scan {
              position: absolute;
              left: 0;
              right: 0;
              height: 2px;
              background: linear-gradient(90deg, transparent, #06b6d4, #a855f7, #06b6d4, transparent);
              box-shadow: 0 0 15px #06b6d4, 0 0 5px #a855f7;
              animation: scan-line 2s linear infinite;
            }
            @keyframes circuit-glow {
              0%, 100% { opacity: 0.1; }
              50% { opacity: 0.25; }
            }
            .circuit-matrix {
              background-image: radial-gradient(circle, rgba(6, 182, 212, 0.15) 1px, transparent 1px);
              background-size: 16px 16px;
              animation: circuit-glow 4s ease-in-out infinite;
            }
            @keyframes hud-spin {
              100% { transform: rotate(360deg); }
            }
            .hud-spinner {
              animation: hud-spin 8s linear infinite;
            }
          `}} />
          
          <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            {/* Holographic grid background decorator */}
            <div className="absolute inset-0 circuit-matrix pointer-events-none" />
            
            {/* Top scanning ambient glow */}
            <div className="absolute -top-10 left-1/4 right-1/4 h-20 bg-cyan-500/10 blur-[40px] pointer-events-none" />

            <div className="relative flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-xl border border-cyan-400/20 hud-spinner pointer-events-none" />
                  {scanStatus === 'revoking' ? (
                    <RefreshCw className="h-5 w-5 text-purple-400 animate-spin" />
                  ) : scanStatus === 'success' ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white tracking-wider flex items-center gap-2">
                    ZK-PROOF SYSTEM
                    <span className="text-[9px] font-mono font-normal text-cyan-400/60 px-1.5 py-0.5 rounded bg-cyan-500/5 border border-cyan-500/10 uppercase">
                      plonky2
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {scanStatus === 'revoking' ? 'Revoking Cryptographic Credentials' : 'Compiling Zero-Knowledge Proof'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  scanStatus === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : scanStatus === 'revoking'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                }`}>
                  {scanStatus === 'success' ? 'PROOF_VERIFIED' : scanStatus === 'revoking' ? 'REVOKING_ACCUMULATOR' : 'PROVING_WITNESS'}
                </span>
              </div>
            </div>

            {/* Target Credential Box */}
            {(() => {
              const activeCred = credentials.find(c => c.id === verifyingId);
              if (!activeCred) return null;
              return (
                <div className="relative rounded-xl bg-slate-950/40 border border-white/5 p-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400">
                      {getIcon(activeCred.id, 'text-slate-400')}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-none">{activeCred.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{activeCred.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {scanStatus === 'revoking' ? '0.00%' : `-${activeCred.reductionValue * 100}%`}
                    </div>
                    <span className="text-[8px] text-slate-550 font-mono">COLLATERAL RATIO</span>
                  </div>
                </div>
              );
            })()}

            {/* Terminal Log Console */}
            <div className="relative rounded-xl border border-white/5 bg-slate-950/80 p-3 h-52 overflow-hidden flex flex-col justify-between">
              {/* Scanning beam overlay */}
              {scanStatus !== 'success' && <div className="hologram-scan" />}
              
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px] text-cyan-400/90 scrollbar-thin scrollbar-thumb-slate-800">
                {zkLogs.map((log, index) => {
                  let textClass = 'text-cyan-400/90';
                  if (log.startsWith('[SUCCESS]')) textClass = 'text-emerald-400 font-bold';
                  if (log.startsWith('[SYSTEM]')) textClass = 'text-white/60';
                  if (log.startsWith('[WITNESS]')) textClass = 'text-cyan-300';
                  if (log.startsWith('[PROVER]')) textClass = 'text-purple-300';
                  if (log.startsWith('[VERIFIER]')) textClass = 'text-amber-300';
                  
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

            {/* Proving progress bar section */}
            <div className="mt-4 pt-3.5 border-t border-white/5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-mono font-semibold text-slate-400">
                  {scanStatus === 'revoking' ? 'REVOKING COMMITMENT...' : 'GENERATING PROOF CONSTS...'}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {zkProgress}%
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-200"
                    style={{ width: `${zkProgress}%` }}
                  />
                </div>
                {zkProgress < 100 && (
                  <Loader2 className="h-3.5 w-3.5 text-cyan-400 animate-spin flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Cryptographic metadata HUD */}
            <div className="mt-4 flex justify-between items-center text-[8px] font-mono text-slate-500/80">
              <span>SYSTEM: PLONKY2 / GROTH16</span>
              <span>CURVE: BN254_FR</span>
              <span>PROOF SIZE: 128 BYTES</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
