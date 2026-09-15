'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  BookOpen, 
  Calendar, 
  ChevronDown, 
  X, 
  Check, 
  Search, 
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { Matiere } from '@/types';
import { VALID_NIVEAUX_PREDEFINIS } from '@/lib/utils/validation';
import { getAcademicYears } from '@/lib/utils/date';

interface FilterChipsProps {
  selectedNiveau?: string;
  niveau?: string;
  selectedMatieres: string[];
  selectedAnnee?: string;
  annee?: string;
  matieresList: Matiere[];
  onApplyFilters: (filters: {
    niveau: string;
    matieres: string[];
    annee: string;
  }) => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
}

type ActiveChip = 'niveau' | 'matiere' | 'annee' | null;

export function FilterChips({
  selectedNiveau,
  niveau,
  selectedMatieres,
  selectedAnnee,
  annee,
  matieresList,
  onApplyFilters,
  onResetAll,
  hasActiveFilters,
}: FilterChipsProps) {
  const currentNiveau = selectedNiveau || niveau || 'all';
  const currentAnnee = selectedAnnee || annee || 'all';
  const [activeChip, setActiveChip] = useState<ActiveChip>(null);

  // Valeurs temporaires pour le panneau de filtres en cours d'édition
  const [tempNiveau, setTempNiveau] = useState<string>(currentNiveau);
  const [tempMatieres, setTempMatieres] = useState<string[]>(selectedMatieres || []);
  const [tempAnnee, setTempAnnee] = useState<string>(currentAnnee);
  const [isCustomAnnee, setIsCustomAnnee] = useState(false);
  const [customAnnee, setCustomAnnee] = useState('');
  const [matiereSearch, setMatiereSearch] = useState('');

  const academicYears = getAcademicYears(5);
  const panelRef = useRef<HTMLDivElement>(null);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (activeChip) {
      setTempNiveau(currentNiveau);
      setTempMatieres(selectedMatieres || []);
      setTempAnnee(currentAnnee);
      setMatiereSearch('');

      if (currentAnnee && currentAnnee !== 'all' && !academicYears.includes(currentAnnee)) {
        setIsCustomAnnee(true);
        setCustomAnnee(currentAnnee);
      } else {
        setIsCustomAnnee(false);
        setCustomAnnee('');
      }
    }
  }, [activeChip, currentNiveau, selectedMatieres, currentAnnee]);

  // Fermeture au clic extérieur sur desktop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setActiveChip(null);
      }
    }
    if (activeChip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeChip]);

  const handleApply = () => {
    const finalAnnee = isCustomAnnee && customAnnee.trim() ? customAnnee.trim() : tempAnnee;
    onApplyFilters({
      niveau: tempNiveau,
      matieres: tempMatieres,
      annee: finalAnnee,
    });
    setActiveChip(null);
  };

  const toggleMatiere = (nom: string) => {
    if (tempMatieres.includes(nom)) {
      setTempMatieres(tempMatieres.filter((m) => m !== nom));
    } else {
      setTempMatieres([...tempMatieres, nom]);
    }
  };

  const filteredMatieres = matieresList.filter((m) =>
    m.nom.toLowerCase().includes(matiereSearch.toLowerCase())
  );

  // Libellés dynamiques des boutons
  const isNiveauActive = currentNiveau && currentNiveau !== 'all' && currentNiveau !== 'Tous les niveaux';
  const isMatieresActive = selectedMatieres && selectedMatieres.length > 0;
  const isAnneeActive = currentAnnee && currentAnnee !== 'all';

  const getNiveauLabel = () => {
    if (!isNiveauActive) return 'Tous les niveaux';
    return currentNiveau;
  };

  const getMatieresLabel = () => {
    if (!isMatieresActive) return 'Toutes les matières';
    if (selectedMatieres.length === 1) return selectedMatieres[0];
    return `${selectedMatieres.length} matières`;
  };

  const getAnneeLabel = () => {
    if (!isAnneeActive) return 'Toutes les années';
    return currentAnnee;
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {/* CHIP : NIVEAU */}
        <button
          type="button"
          onClick={() => setActiveChip(activeChip === 'niveau' ? null : 'niveau')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border shadow-xs ${
            isNiveauActive
              ? 'bg-brand-50 dark:bg-emerald-950/60 border-brand-300 dark:border-emerald-700/60 text-brand dark:text-emerald-300'
              : 'bg-white dark:bg-[#161B22] border-slate-200 dark:border-[#30363D] text-ink-secondary dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-ink-primary dark:hover:text-white'
          }`}
        >
          <Award className={`w-4 h-4 ${isNiveauActive ? 'text-brand dark:text-emerald-400' : 'text-slate-400'}`} />
          <span className="truncate max-w-[130px] sm:max-w-none">{getNiveauLabel()}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeChip === 'niveau' ? 'rotate-180' : ''}`} />
        </button>

        {/* CHIP : MATIÈRE */}
        <button
          type="button"
          onClick={() => setActiveChip(activeChip === 'matiere' ? null : 'matiere')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border shadow-xs ${
            isMatieresActive
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-white dark:bg-[#161B22] border-slate-200 dark:border-[#30363D] text-ink-secondary dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-ink-primary dark:hover:text-white'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${isMatieresActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
          <span className="truncate max-w-[140px] sm:max-w-none">{getMatieresLabel()}</span>
          {isMatieresActive && (
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
              {selectedMatieres.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeChip === 'matiere' ? 'rotate-180' : ''}`} />
        </button>

        {/* CHIP : ANNÉE */}
        <button
          type="button"
          onClick={() => setActiveChip(activeChip === 'annee' ? null : 'annee')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border shadow-xs ${
            isAnneeActive
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300'
              : 'bg-white dark:bg-[#161B22] border-slate-200 dark:border-[#30363D] text-ink-secondary dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-ink-primary dark:hover:text-white'
          }`}
        >
          <Calendar className={`w-4 h-4 ${isAnneeActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
          <span className="truncate max-w-[120px] sm:max-w-none">{getAnneeLabel()}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeChip === 'annee' ? 'rotate-180' : ''}`} />
        </button>

        {/* BOUTON RÉINITIALISER */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/40 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/60 rounded-xl transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        )}
      </div>

      {/* PANNEAU FLOTTANT DE CONFIGURATION DU FILTRE */}
      {activeChip && (
        <>
          {/* Backdrop mobile */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden"
            onClick={() => setActiveChip(null)}
          />

          <div
            ref={panelRef}
            className="fixed inset-x-4 bottom-4 z-50 sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:mt-2 sm:w-84 glass-dropdown rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-[#30363D] animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col"
          >
            {/* Header du panneau */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#30363D]">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-primary dark:text-[#F0F6FC] flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand dark:text-emerald-400" />
                {activeChip === 'niveau' && 'Filtrer par Niveau'}
                {activeChip === 'matiere' && 'Filtrer par Matières'}
                {activeChip === 'annee' && 'Filtrer par Année'}
              </span>
              <button
                type="button"
                onClick={() => setActiveChip(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-ink-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CORPS : NIVEAU */}
            {activeChip === 'niveau' && (
              <div className="py-3 space-y-1.5 overflow-y-auto flex-1 max-h-64">
                <button
                  type="button"
                  onClick={() => setTempNiveau('all')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors ${
                    tempNiveau === 'all' || !tempNiveau
                      ? 'bg-brand-50 dark:bg-emerald-950/60 text-brand dark:text-emerald-300 font-bold border border-brand-200 dark:border-emerald-800/60'
                      : 'text-ink-primary dark:text-[#F0F6FC] hover:bg-slate-50 dark:hover:bg-[#21262D]'
                  }`}
                >
                  <span>Tous les niveaux</span>
                  {(tempNiveau === 'all' || !tempNiveau) && (
                    <Check className="w-4 h-4 text-brand dark:text-emerald-400" />
                  )}
                </button>

                {VALID_NIVEAUX_PREDEFINIS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTempNiveau(n)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors ${
                      tempNiveau === n
                        ? 'bg-brand-50 dark:bg-emerald-950/60 text-brand dark:text-emerald-300 font-bold border border-brand-200 dark:border-emerald-800/60'
                        : 'text-ink-primary dark:text-[#F0F6FC] hover:bg-slate-50 dark:hover:bg-[#21262D]'
                    }`}
                  >
                    <span>{n}</span>
                    {tempNiveau === n && <Check className="w-4 h-4 text-brand dark:text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* CORPS : MATIÈRE */}
            {activeChip === 'matiere' && (
              <div className="py-3 flex flex-col flex-1 min-h-0">
                {matieresList.length > 4 && (
                  <div className="relative mb-2.5">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={matiereSearch}
                      onChange={(e) => setMatiereSearch(e.target.value)}
                      placeholder="Rechercher une matière..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-ink-primary dark:text-[#F0F6FC] placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand focus:bg-white dark:focus:bg-[#161B22]"
                    />
                  </div>
                )}

                <div className="space-y-1 overflow-y-auto flex-1 pr-1 max-h-56">
                  {filteredMatieres.length === 0 ? (
                    <p className="text-xs text-ink-muted text-center py-5">
                      Aucune matière trouvée.
                    </p>
                  ) : (
                    filteredMatieres.map((m) => {
                      const isChecked = tempMatieres.includes(m.nom);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#21262D] cursor-pointer text-xs sm:text-sm text-ink-primary dark:text-[#F0F6FC] select-none transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMatiere(m.nom)}
                            className="w-4 h-4 text-brand rounded border-slate-300 dark:border-slate-600 focus:ring-brand accent-brand cursor-pointer"
                          />
                          <span className="truncate">{m.nom}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* CORPS : ANNÉE */}
            {activeChip === 'annee' && (
              <div className="py-3 space-y-1.5 overflow-y-auto flex-1 max-h-64">
                <button
                  type="button"
                  onClick={() => {
                    setTempAnnee('all');
                    setIsCustomAnnee(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors ${
                    (tempAnnee === 'all' || !tempAnnee) && !isCustomAnnee
                      ? 'bg-brand-50 dark:bg-emerald-950/60 text-brand dark:text-emerald-300 font-bold border border-brand-200 dark:border-emerald-800/60'
                      : 'text-ink-primary dark:text-[#F0F6FC] hover:bg-slate-50 dark:hover:bg-[#21262D]'
                  }`}
                >
                  <span>Toutes les années</span>
                  {(tempAnnee === 'all' || !tempAnnee) && !isCustomAnnee && (
                    <Check className="w-4 h-4 text-brand dark:text-emerald-400" />
                  )}
                </button>

                {academicYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setTempAnnee(yr);
                      setIsCustomAnnee(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors ${
                      tempAnnee === yr && !isCustomAnnee
                        ? 'bg-brand-50 dark:bg-emerald-950/60 text-brand dark:text-emerald-300 font-bold border border-brand-200 dark:border-emerald-800/60'
                        : 'text-ink-primary dark:text-[#F0F6FC] hover:bg-slate-50 dark:hover:bg-[#21262D]'
                    }`}
                  >
                    <span>{yr}</span>
                    {tempAnnee === yr && !isCustomAnnee && (
                      <Check className="w-4 h-4 text-brand dark:text-emerald-400" />
                    )}
                  </button>
                ))}

                {/* Option Année Manuelle */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#30363D]">
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary dark:text-slate-300 mb-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustomAnnee}
                      onChange={(e) => setIsCustomAnnee(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600 text-brand focus:ring-brand accent-brand"
                    />
                    <span>Autre année antérieure</span>
                  </label>
                  {isCustomAnnee && (
                    <input
                      type="text"
                      value={customAnnee}
                      onChange={(e) => setCustomAnnee(e.target.value)}
                      placeholder="Ex: 2019-2020"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-ink-primary dark:text-[#F0F6FC] rounded-xl focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  )}
                </div>
              </div>
            )}

            {/* PIED DU PANNEAU : ACTIONS */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#30363D] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (activeChip === 'niveau') setTempNiveau('all');
                  if (activeChip === 'matiere') setTempMatieres([]);
                  if (activeChip === 'annee') {
                    setTempAnnee('all');
                    setIsCustomAnnee(false);
                    setCustomAnnee('');
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Effacer
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-teal-700 hover:from-brand-hover hover:to-teal-800 rounded-xl transition-all shadow-sm shadow-brand/20 active:scale-98"
              >
                Appliquer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
