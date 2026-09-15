'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Check, Plus, ChevronDown, Sparkles } from 'lucide-react';
import { Matiere } from '@/types';
import { normalizeMatiereNom } from '@/lib/utils/validation';

interface MatiereComboboxProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  matieresList: Matiere[];
}

export function MatiereCombobox({
  value,
  onChange,
  error,
  matieresList = [],
}: MatiereComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const normalizedQuery = normalizeMatiereNom(query || '');

  // Filtrage des suggestions existantes
  const filteredMatieres = matieresList.filter((m) =>
    normalizeMatiereNom(m.nom).includes(normalizedQuery)
  );

  // Vérifier s'il y a une correspondance exacte
  const hasExactMatch = matieresList.some(
    (m) => normalizeMatiereNom(m.nom) === normalizedQuery
  );

  const canAddNew = query.trim().length >= 2 && !hasExactMatch;

  const handleSelect = (matiereNom: string) => {
    setQuery(matiereNom);
    onChange(matiereNom);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    const cleanName = query.trim();
    if (cleanName) {
      handleSelect(cleanName);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <BookOpen className="w-4 h-4" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Ex: Électronique Médicale, Imagerie..."
          className={`w-full pl-10 pr-10 py-3 bg-white dark:bg-[#21262D] border rounded-xl text-sm font-medium text-ink-primary dark:text-[#F0F6FC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-300 dark:border-red-500 focus:ring-red-200 focus:border-red-500'
              : 'border-slate-200 dark:border-[#30363D] focus:ring-brand/20 dark:focus:ring-emerald-500/20 focus:border-brand dark:focus:border-emerald-500 shadow-xs'
          }`}
        />

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-ink-primary dark:hover:text-white"
          aria-label="Dérouler la liste des matières"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Menu déroulant des suggestions */}
      {isOpen && (
        <div className="absolute z-30 mt-1.5 w-full glass-dropdown rounded-2xl p-2 border border-slate-200 dark:border-[#30363D] shadow-lg max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {filteredMatieres.length > 0 ? (
            <div className="space-y-0.5">
              <p className="px-3 py-1.5 text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Matières enregistrées
              </p>
              {filteredMatieres.map((m) => {
                const isSelected = value.toLowerCase() === m.nom.toLowerCase();
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(m.nom)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-emerald-950/60 text-brand dark:text-emerald-300 font-bold'
                        : 'text-ink-primary dark:text-[#F0F6FC] hover:bg-slate-50 dark:hover:bg-[#21262D]'
                    }`}
                  >
                    <span>{m.nom}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand dark:text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-3 py-3 text-xs text-ink-muted text-center">
              Aucune matière existante ne correspond.
            </p>
          )}

          {/* Option de création à la volée */}
          {canAddNew && (
            <div className="pt-2 mt-1 border-t border-slate-100 dark:border-[#30363D]">
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 rounded-xl transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-200">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 truncate">
                  <span>Créer la matière : </span>
                  <span className="font-bold underline">{query.trim()}</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
