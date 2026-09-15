'use client';

import React from 'react';
import Link from 'next/link';
import { Epreuve } from '@/types';
import { formatRelativeDate, formatFileSize } from '@/lib/utils/date';
import { 
  FileText, 
  Image as ImageIcon, 
  ArrowRight, 
  Calendar, 
  Award, 
  DownloadCloud,
  BookOpen
} from 'lucide-react';

interface EpreuveCardProps {
  epreuve: Epreuve;
}

export function EpreuveCard({ epreuve }: EpreuveCardProps) {
  // Styles du badge de Type (Devoir, Rattrapage)
  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'devoir':
        return {
          pill: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
          dot: 'bg-blue-500 dark:bg-blue-400',
        };
      case 'rattrapage':
        return {
          pill: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          dot: 'bg-amber-500 dark:bg-amber-400',
        };
      default:
        return {
          pill: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-400 dark:bg-slate-400',
        };
    }
  };

  const isPdf = epreuve.type_fichier?.toLowerCase() === 'pdf';
  const badgeStyle = getTypeBadge(epreuve.type);

  return (
    <Link
      href={`/epreuves/${epreuve.id}`}
      className="group relative block bg-white dark:bg-[#161B22] border border-slate-200/80 dark:border-[#30363D] hover:border-emerald-500/40 dark:hover:border-emerald-500/50 rounded-2xl p-5 sm:p-6 shadow-subtle hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    >
      {/* Top subtle highlight gradient on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500 transition-all duration-300" />

      <div className="flex items-start gap-4">
        {/* Document Icon Avatar with format color */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105 ${
          isPdf 
            ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50' 
            : 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/50'
        }`}>
          {isPdf ? (
            <FileText className="w-6 h-6" />
          ) : (
            <ImageIcon className="w-6 h-6" />
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Metadata Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Type badge with colored dot */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize shadow-xs ${badgeStyle.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
              <span>{epreuve.type}</span>
            </span>

            {/* Niveau badge */}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-secondary bg-slate-100 dark:bg-[#21262D] px-2.5 py-0.5 rounded-full border border-slate-200/60 dark:border-[#30363D]">
              <Award className="w-3 h-3 text-slate-400" />
              <span>{epreuve.niveau}</span>
            </span>

            {/* Année Académique badge */}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-secondary bg-slate-100 dark:bg-[#21262D] px-2.5 py-0.5 rounded-full border border-slate-200/60 dark:border-[#30363D]">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{epreuve.annee_academique}</span>
            </span>

            {/* Badge Corrigé */}
            {epreuve.has_corrige && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                <BookOpen className="w-3 h-3" />
                <span>Corrigé inclus</span>
              </span>
            )}
          </div>

          {/* Matière Title */}
          <h3 className="text-base sm:text-lg font-bold text-ink-primary dark:text-[#F0F6FC] group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors truncate">
            {epreuve.matiere_nom}
          </h3>

          {/* Optional specific Title if available */}
          {epreuve.titre && (
            <p className="mt-0.5 text-xs text-ink-secondary dark:text-slate-400 line-clamp-1">
              {epreuve.titre}
            </p>
          )}
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#21262D] flex items-center justify-between text-xs text-ink-secondary">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink-primary dark:text-slate-200 uppercase tracking-wider text-[11px]">
            {epreuve.type_fichier}
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="font-medium text-ink-muted">
            {formatFileSize(epreuve.taille_octets)}
          </span>
          {epreuve.telechargements_count !== undefined && epreuve.telechargements_count > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                <DownloadCloud className="w-3.5 h-3.5" />
                {epreuve.telechargements_count}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-ink-muted hidden sm:inline-block">
            {formatRelativeDate(epreuve.created_at)}
          </span>

          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-brand dark:group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-400 dark:text-slate-300 transition-all duration-200 shadow-xs">
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
