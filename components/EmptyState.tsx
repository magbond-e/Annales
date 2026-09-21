'use client';

import React from 'react';
import Link from 'next/link';
import { FileSearch, Upload, RotateCcw, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  showDepositCTA?: boolean;
}

export function EmptyState({
  title = 'Aucune épreuve trouvée',
  description = 'Aucune épreuve ne correspond à vos critères de recherche actuels. Essayez d\'élargir vos filtres ou soyez le premier à la partager !',
  onReset,
  showDepositCTA = true,
}: EmptyStateProps) {
  return (
    <div className="relative bg-white dark:bg-[#161B22] border border-slate-200/90 dark:border-[#30363D] rounded-3xl p-8 sm:p-14 text-center my-6 shadow-subtle overflow-hidden">
      {/* Subtle ambient light gradient background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-50 to-emerald-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center text-brand dark:text-emerald-400 mb-5 shadow-xs">
          <FileSearch className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h3 className="text-lg sm:text-xl font-extrabold text-ink-primary dark:text-[#F0F6FC] tracking-tight">
          {title}
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-ink-secondary dark:text-slate-400 leading-relaxed">
          {description}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-ink-primary dark:text-[#F0F6FC] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-98"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}

          {showDepositCTA && (
            <Link
              href="/deposer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand to-teal-700 hover:from-brand-hover hover:to-teal-800 rounded-xl shadow-md shadow-brand/20 transition-all hover:scale-[1.02] active:scale-98"
            >
              <Upload className="w-4 h-4 text-emerald-300" />
              <span>Déposer une épreuve</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
