import React, { useMemo } from 'react';
import { Award, Zap, CheckCircle2, Share2 } from 'lucide-react';
import { TrustTierBadge } from './TrustTierBadge';

import { CredentialCard } from '@/lib/types/borrow';
import CollateralReductionBreakdown from './CollateralReductionBreakdown';

interface MetricsProps {
  score: number; // dynamically computed score (max 1000)
  borrowPower: number; // dynamically computed borrow power (max 100)
  credentials: CredentialCard[];
  activeReductionSum: number;
  trustStrength: number; // dynamic trust strength
}

const MiniatureSpeedometer = ({ value }: { value: number }) => {
  const minVal = 70;
  const maxVal = 110;
  const numTicks = 20;
  const cx = 48;
  const cy = 56;
  const rOuter = 40;
  const rInner = 33;
  const rNeedle = 36;
  
  const startAngle = 190;
  const endAngle = -10;
  const angleSpan = startAngle - endAngle; // 200
  
  const clampedVal = Math.min(maxVal, Math.max(minVal, value));
  const valPercent = (clampedVal - minVal) / (maxVal - minVal);
  const needleAngle = startAngle - valPercent * angleSpan;
  const rotationAngle = 90 - needleAngle;
  
  const ticks = [];
  for (let i = 0; i < numTicks; i++) {
    const tPercent = i / (numTicks - 1);
    const tVal = minVal + tPercent * (maxVal - minVal);
    const tAngle = startAngle - tPercent * angleSpan;
    const tRad = (tAngle * Math.PI) / 180;
    
    const tx1 = cx + rInner * Math.cos(tRad);
    const ty1 = cy - rInner * Math.sin(tRad);
    const tx2 = cx + rOuter * Math.cos(tRad);
    const ty2 = cy - rOuter * Math.sin(tRad);
    
    const isActive = tVal <= value;
    const strokeColor = isActive ? '#10b981' : '#334155';
    
    ticks.push(
      <line
        key={i}
        x1={tx1}
        y1={ty1}
        x2={tx2}
        y2={ty2}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    );
  }
  
  return (
    <div className="relative w-24 h-16 flex justify-center items-end overflow-hidden shrink-0">
      <svg width="96" height="60" viewBox="0 0 96 60" className="overflow-visible">
        {ticks}
        <circle cx={cx} cy={cy} r="2.5" fill="#cbd5e1" stroke="#475569" strokeWidth="0.5" />
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - rNeedle}
          stroke="#cbd5e1"
          strokeWidth="1.2"
          strokeLinecap="round"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${rotationAngle}deg)`,
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
        <circle
          cx={cx}
          cy={cy - rNeedle}
          r="1.5"
          fill="#cbd5e1"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${rotationAngle}deg)`,
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </svg>
      {/* Central label under pivot */}
      <div className="absolute bottom-0 text-center select-none leading-none z-10 pb-0.5">
        <div className="text-xl text-white font-extrabold leading-none">{value}</div>
        <div className="text-[7px] text-slate-500 font-mono mt-0.5">/ 110</div>
      </div>
    </div>
  );
};

export default function Metrics({ score, borrowPower, credentials, activeReductionSum, trustStrength }: MetricsProps) {
  // Generate random connecting paths for trust nodes once or with relative positions
  const nodes = useMemo(() => [
    { id: 1, x: 25, y: 35, r: 4 },
    { id: 2, x: 45, y: 15, r: 6 },
    { id: 3, x: 75, y: 25, r: 5 },
    { id: 4, x: 60, y: 65, r: 7 },
    { id: 5, x: 30, y: 75, r: 4 },
    { id: 6, x: 50, y: 45, r: 8 },
    { id: 7, x: 80, y: 70, r: 5 },
  ], []);

  // Compute percentage for Reputation gauge
  const scorePercent = (score / 1000) * 100;
  
  // Angle for Gauge chart pointer (from -90 to +90 degrees)
  const angle = -90 + (borrowPower / 100) * 180;

  // Rating label based on numeric score
  const getReputationLabel = (val: number) => {
    if (val >= 850) return 'Excellent Borrower';
    if (val >= 750) return 'Very Good Borrower';
    if (val >= 600) return 'Good Borrower';
    return 'Fair Borrower';
  };

  const getPowerLabel = (power: number) => {
    if (power >= 100) return 'Elite';
    if (power >= 90) return 'Strong';
    if (power >= 73) return 'Standard';
    return 'Basic';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
      {/* Reputation Score Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/20 border border-white/5 p-4 shadow-xl transition-all hover:border-violet-500/20 group">
        <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-all">
          <Award className="h-16 w-16 text-indigo-400" />
        </div>
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Reputation Score</span>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-bold font-display text-white">{score}</span>
          <span className="text-sm font-semibold text-slate-500">/ 1000</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-indigo-400 font-medium">{getReputationLabel(score)}</p>
          <TrustTierBadge trustScore={score} size="sm" />
        </div>
        
        {/* Progress Bar Container */}
        <div className="mt-4">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-400 rounded-full transition-all duration-700 ease-out" 
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
            <span>300 (Min)</span>
            <span>Current: {Math.round(scorePercent)}%</span>
            <span>1000 (Max)</span>
          </div>
        </div>
      </div>

      {/* Borrow Power Gauge Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/20 border border-white/5 p-4 shadow-xl transition-all hover:border-violet-500/20 group">
        <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-all">
          <Zap className="h-16 w-16 text-emerald-400" />
        </div>
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">COLLATERAL TRUST INDEX</span>
          <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/10">
            Reputation Active
          </span>
        </div>
        
        {/* Gauge Chart Layout */}
        <div className="flex items-center gap-4 mt-1">
          <MiniatureSpeedometer value={borrowPower} />
          <div>
            <div className="text-xl font-bold font-display text-white">{borrowPower}% <span className="text-xs text-slate-500 font-normal">/ 110%</span></div>
            <p className="text-xs text-emerald-400 font-medium mt-1">{getPowerLabel(borrowPower)} Rating</p>
            <p className="text-[10px] text-slate-500 mt-1">Reflects collateral requirements advantage</p>
          </div>
        </div>
      </div>

      {/* Collateral Reduction Breakdown Card */}
      <CollateralReductionBreakdown
        credentials={credentials}
        totalReductionPercent={activeReductionSum * 100}
      />


      {/* Trust Strength Card (Network Nodes Visual) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/20 border border-white/5 p-4 shadow-xl transition-all hover:border-violet-500/20 group">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Trust Strength</span>
          <span className="text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/10">
            Decentralized ID
          </span>
        </div>
        
        <div className="flex items-center gap-4 mt-1.5">
          {/* Animated network visualization using standard HTML/CSS + SVG */}
          <div className="relative w-16 h-16 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center p-0.5 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Connection lines */}
              <line x1="25" y1="35" x2="60" y2="65" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />
              <line x1="45" y1="15" x2="60" y2="65" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />
              <line x1="75" y1="25" x2="60" y2="65" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />
              <line x1="30" y1="75" x2="60" y2="65" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />
              <line x1="50" y1="45" x2="75" y2="25" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" />
              <line x1="50" y1="45" x2="25" y2="35" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" />
              <line x1="50" y1="45" x2="30" y2="75" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" />
              <line x1="80" y1="70" x2="60" y2="65" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />

              {/* Glowing nodes */}
              {nodes.map((node) => (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={node.r / 1.5}
                  fill={node.id === 6 ? '#818cf8' : '#4f46e5'}
                  className={node.id === 6 ? 'animate-pulse' : ''}
                />
              ))}
            </svg>
          </div>
          <div>
            <div className="text-3xl font-bold font-display text-white">{trustStrength} <span className="text-xs text-slate-500 font-normal">/100</span></div>
            <p className="text-xs text-indigo-300 font-medium mt-1">Cross-Chain Certified</p>
            <p className="text-[10px] text-slate-500 mt-1">Verifiable Credentials</p>
          </div>
        </div>
      </div>
    </div>
  );
}
