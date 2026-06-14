import React from 'react';
import { Shield, Star, Crown, Sparkles } from 'lucide-react';
import { getTrustTier, TrustTier, TRUST_TIERS, getReputationTierName } from '@/lib/store/trustStore';

interface TrustTierBadgeProps {
  trustScore: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getTierIcon(tier: TrustTier, className: string) {
  switch (tier.name) {
    case 'Bronze': return <Shield className={className} />;
    case 'Silver': return <Star className={className} />;
    case 'Gold':   return <Crown className={className} />;
    case 'Elite':  return <Sparkles className={className} />;
  }
}

export function TrustTierBadge({ trustScore, size = 'md', showLabel = true }: TrustTierBadgeProps) {
  const tier = getTrustTier(trustScore);
  const tierName = getReputationTierName(trustScore);
  if (!tier) {
    return (
      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40 flex items-center gap-1">
        <Shield className="h-3 w-3" />
        {showLabel && tierName}
      </span>
    );
  }

  const sizes = {
    sm: { badge: 'text-[9px] px-1.5 py-0.5', icon: 'h-2.5 w-2.5' },
    md: { badge: 'text-[10px] px-2 py-0.5', icon: 'h-3 w-3' },
    lg: { badge: 'text-[11px] px-2.5 py-1', icon: 'h-3.5 w-3.5' },
  };

  const s = sizes[size];
  return (
    <span className={`font-mono font-bold rounded border flex items-center gap-1 ${s.badge} ${tier.color.bg} ${tier.color.text} ${tier.color.border}`}>
      {getTierIcon(tier, s.icon)}
      {showLabel && tierName}
    </span>
  );
}

interface TrustTierCardProps {
  trustScore: number;
  compact?: boolean;
}

export function TrustTierCard({ trustScore, compact = false }: TrustTierCardProps) {
  const tier = getTrustTier(trustScore);
  const tierName = getReputationTierName(trustScore);

  if (compact) {
    return (
      <div className={`rounded-xl border p-3 ${tier ? `${tier.color.bg} ${tier.color.border}` : 'bg-slate-800/20 border-slate-700/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tier ? getTierIcon(tier, `h-4 w-4 ${tier.color.text}`) : <Shield className="h-4 w-4 text-slate-500" />}
            <div>
              <span className={`text-xs font-bold ${tier ? tier.color.text : 'text-slate-400'}`}>
                {tierName} Tier
              </span>
              {tier && (
                <p className="text-[10px] text-slate-400 font-mono">Score {tier.minScore}–{tier.maxScore === 1000 ? '1000' : tier.maxScore}</p>
              )}
              {!tier && trustScore >= 300 && (
                <p className="text-[10px] text-slate-400 font-mono">Score 300–499</p>
              )}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-[10px] font-mono text-slate-400">APY <span className={`font-bold ${tier ? tier.color.text : 'text-slate-300'}`}>{tier ? tier.apy.toFixed(1) : '12.5'}%</span></div>
            <div className="text-[10px] font-mono text-slate-400">Grace <span className="font-bold text-slate-300">{tier ? `${tier.gracePeriodHours}h` : 'None'}</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Active tier highlight */}
      {tier ? (
        <div className={`rounded-xl border p-4 relative overflow-hidden ${tier.color.bg} ${tier.color.border}`}>
          <div className="absolute top-0 right-0 h-16 w-16 rounded-full blur-xl opacity-20" style={{ background: tier.color.glow }} />
          <div className="flex items-start justify-between relative">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tier.color.bg} border ${tier.color.border}`}>
                {getTierIcon(tier, `h-5 w-5 ${tier.color.text}`)}
              </div>
              <div>
                <div className={`text-sm font-bold ${tier.color.text}`}>{tierName} Tier</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Score {tier.minScore}–{tier.maxScore === 1000 ? '1000' : tier.maxScore}</div>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${tier.color.bg} ${tier.color.text} ${tier.color.border}`}>
              Active
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
              <div className="text-[9px] font-mono text-slate-500 uppercase">Reduction</div>
              <div className={`text-sm font-bold font-mono ${tier.color.text}`}>{(tier.borrowCapacityPct * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
              <div className="text-[9px] font-mono text-slate-500 uppercase">APY Rate</div>
              <div className={`text-sm font-bold font-mono ${tier.color.text}`}>{tier.apy.toFixed(1)}%</div>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2 text-center">
              <div className="text-[9px] font-mono text-slate-500 uppercase">Grace</div>
              <div className={`text-sm font-bold font-mono ${tier.color.text}`}>{tier.gracePeriodHours}h</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-800 border border-slate-700/40 flex items-center justify-center">
              <Shield className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-400">{tierName} Tier</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Score 300–499 — entry level reputation</div>
            </div>
          </div>
        </div>
      )}

      {/* All tiers progression */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TRUST_TIERS.map((t) => {
          const isActive = tier?.name === t.name;
          const isPast = tier ? TRUST_TIERS.indexOf(t) < TRUST_TIERS.indexOf(tier) : false;
          return (
            <div
              key={t.name}
              className={`rounded-lg p-2.5 border text-center transition-all ${
                isActive
                  ? `${t.color.bg} ${t.color.border}`
                  : isPast
                  ? 'bg-slate-900/40 border-white/5 opacity-60'
                  : 'bg-slate-900/20 border-white/5 opacity-40'
              }`}
            >
              <div className="flex justify-center mb-1.5">
                {getTierIcon(t, `h-4 w-4 ${isActive ? t.color.text : 'text-slate-500'}`)}
              </div>
              <div className={`text-[10px] font-bold ${isActive ? t.color.text : 'text-slate-500'}`}>{t.name}</div>
              <div className="text-[9px] font-mono text-slate-600 mt-0.5">{t.minScore}+</div>
              <div className={`text-[9px] font-mono mt-1 ${isActive ? t.color.text : 'text-slate-600'}`}>{t.apy}% APY</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TrustTierBadge;
