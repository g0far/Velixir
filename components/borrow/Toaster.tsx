"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useToastStore, ToastType } from '@/lib/store/toastStore';

const config: Record<
  ToastType,
  { icon: React.ReactNode; ring: string; iconColor: string }
> = {
  success: {
    icon: <CheckCircle className="h-4.5 w-4.5" />,
    ring: 'border-emerald-500/30 bg-emerald-500/5',
    iconColor: 'text-emerald-400',
  },
  error: {
    icon: <XCircle className="h-4.5 w-4.5" />,
    ring: 'border-rose-500/30 bg-rose-500/5',
    iconColor: 'text-rose-400',
  },
  warning: {
    icon: <AlertTriangle className="h-4.5 w-4.5" />,
    ring: 'border-amber-500/30 bg-amber-500/5',
    iconColor: 'text-amber-400',
  },
  info: {
    icon: <Info className="h-4.5 w-4.5" />,
    ring: 'border-indigo-500/30 bg-indigo-500/5',
    iconColor: 'text-indigo-400',
  },
};

const renderDescription = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors inline-block break-all"
        >
          Solana Explorer
        </a>
      );
    }
    return part;
  });
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2.5 w-[340px] max-w-[calc(100vw-2rem)] pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const c = config[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${c.ring} bg-slate-900/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/40`}
            >
              <div className={`mt-0.5 ${c.iconColor}`}>{c.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white font-display">{t.title}</p>
                {t.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug break-words">
                    {renderDescription(t.description)}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer -mr-1 -mt-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
