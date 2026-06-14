"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { TokenLogo } from '@/lib/store/assetMetadata';

interface AmountModalProps {
  open: boolean;
  title: string;
  description?: string;
  assetSymbol: string;
  max?: number;
  accent?: 'indigo' | 'emerald';
  confirmLabel: string;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}

export default function AmountModal({
  open,
  title,
  description,
  assetSymbol,
  max,
  accent = 'indigo',
  confirmLabel,
  onConfirm,
  onClose,
}: AmountModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  const num = Number(value) || 0;
  const overMax = max !== undefined && num > max;
  const valid = num > 0 && !overMax;

  const accentClasses =
    accent === 'emerald'
      ? 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/15'
      : 'from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-indigo-600/15';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h3 className="font-display text-sm font-bold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {description && <p className="text-[11px] text-slate-400 leading-snug">{description}</p>}

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex justify-between mb-1.5">
                  <span>Amount</span>
                  {max !== undefined && (
                    <button
                      onClick={() => setValue(String(max))}
                      className="text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1"
                    >
                      Max: {max.toLocaleString(undefined, { maximumFractionDigits: 4 })} <TokenLogo symbol={assetSymbol} size={12} /> {assetSymbol}
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950/80 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5">
                    <TokenLogo symbol={assetSymbol} size={16} />
                    {assetSymbol}
                  </span>
                </div>
                {overMax && (
                  <p className="text-[10px] text-rose-400 mt-1.5 font-mono">Amount exceeds maximum.</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-950 hover:text-white border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => valid && onConfirm(num)}
                  disabled={!valid}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${accentClasses} disabled:opacity-30 disabled:pointer-events-none shadow-lg cursor-pointer`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
