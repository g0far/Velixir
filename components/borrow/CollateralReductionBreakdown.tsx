import React from 'react';
import { CredentialCard } from '@/lib/types/borrow';

interface CollateralReductionBreakdownProps {
  credentials: CredentialCard[];
  totalReductionPercent: number; // e.g. 30 (represented out of 100)
}

export default function CollateralReductionBreakdown({
  credentials,
  totalReductionPercent,
}: CollateralReductionBreakdownProps) {
  // Compute active slices
  const activeSlices = credentials.filter(cred => cred.active);
  const totalWeight = activeSlices.reduce((sum, c) => sum + c.reductionValue, 0);

  // Define color mapping for each card key
  const colors: Record<string, string> = {
    credit_score: '#ff007a', // Hot pink / violet
    kyc: '#10b981',          // Emerald
    banking: '#3b82f6',      // Blue
    onchain: '#818cf8',      // Lavender indigo
    consent: '#f59e0b',      // Amber
  };

  const bgColors: Record<string, string> = {
    credit_score: 'bg-[#ff007a]',
    kyc: 'bg-[#10b981]',
    banking: 'bg-[#3b82f6]',
    onchain: 'bg-[#818cf8]',
    consent: 'bg-[#f59e0b]',
  };

  const textColors: Record<string, string> = {
    credit_score: 'text-[#ff007a]',
    kyc: 'text-[#10b981]',
    banking: 'text-[#3b82f6]',
    onchain: 'text-[#818cf8]',
    consent: 'text-[#f59e0b]',
  };

  // SVG parameters
  const size = 100;
  const radius = 38;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Let's compute accumulated offset for circular segments
  let accumulatedPercent = 0;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 backdrop-blur-sm h-full flex flex-col justify-between">
      <div>
        <h3 className="font-display text-sm font-bold text-white mb-0.5">
          Collateral Reduction Breakdown
        </h3>
        <p className="text-[10px] text-slate-400 mb-2 font-normal">
          Visual slice representations of trust factors lowering your overall capital lock.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-0.5">
        {/* SVG Donut Container */}
        <div className="relative w-[100px] h-[100px] flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
            {/* Background Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
            />

            {/* Render dynamic segments */}
            {activeSlices.map((cred) => {
              // Share of this credential relative to total reductions (or just absolute values)
              // Let's make it absolute out of 100% total possible sum of 50.
              const sliceWeight = cred.reductionValue; // e.g. 0.15
              const slicePercentage = (sliceWeight / 0.30) * 100; // Fraction of 30% max possible
              
              const strokeLength = (sliceWeight / 0.30) * circumference;
              const strokeOffset = circumference - (accumulatedPercent / 30) * circumference;
              
              // Increment accumulated
              accumulatedPercent += sliceWeight * 100; // percent of total

              return (
                <circle
                  key={cred.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors[cred.id] || '#cbd5e1'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              );
            })}
          </svg>

          {/* Central Label overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight leading-none">
              -{Math.round(totalReductionPercent)}%
            </span>
            <span className="text-[8px] font-mono text-indigo-400 font-semibold tracking-wider mt-0.5 uppercase">
              REDUCTION
            </span>
          </div>
        </div>

        {/* Legend table explaining segments */}
        <div className="flex-1 space-y-1 w-full">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className={`flex items-center justify-between text-[11px] transition-opacity duration-300 ${
                cred.active ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${bgColors[cred.id]}`} />
                <span className="text-slate-300 font-medium">{cred.title}</span>
              </div>
              <span className={`font-mono font-bold ${cred.active ? textColors[cred.id] : 'text-slate-500'}`}>
                {cred.active ? `-${cred.reductionValue * 100}%` : '0%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
