'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';
import { TypeSegmentedControl } from '@/components/TypeSegmentedControl';
import { FilterChips } from '@/components/FilterChips';
import { EpreuveCard } from '@/components/EpreuveCard';
import { EpreuvesListSkeleton } from '@/components/EpreuveSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { BottomNavCTA } from '@/components/BottomNavCTA';
import { Epreuve, Matiere } from '@/types';
import {
  User,
  Sparkles,
  AlertCircle,
  GraduationCap,
  RotateCcw,
  X,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function EpreuvesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Rediriger vers l'accueil si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  // États des filtres synchronisés avec l'URL
  const queryParam = searchParams.get('q') || '';
  const niveauParam = searchParams.get('niveau') || '';
  const matiereParam = searchParams.get('matiere') || '';
  const anneeParam = searchParams.get('annee') || '';
  const typeParam = searchParams.get('type') || 'all';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limitParam = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedType, setSelectedType] = useState(typeParam);
  const [selectedNiveau, setSelectedNiveau] = useState(niveauParam);
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>(
    matiereParam ? matiereParam.split(',').filter(Boolean) : []
  );
  const [selectedAnnee, setSelectedAnnee] = useState(anneeParam);
  const [currentPage, setCurrentPage] = useState(pageParam);
  const [limit, setLimit] = useState(limitParam);

  // Données
  const [epreuves, setEpreuves] = useState<Epreuve[]>([]);
  const [matieresList, setMatieresList] = useState<Matiere[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [userNiveau, setUserNiveau] = useState<string | null>(null);

  // États d'interface
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger la liste des matières pour les filtres
  useEffect(() => {
    fetch('/api/matieres')
      .then((res) => res.json())
      .then((data) => {
        if (data.matieres) setMatieresList(data.matieres);
      })
      .catch((err) => console.error('Erreur chargement matières:', err));
  }, []);

  // Synchroniser les paramètres dans l'URL (déclaré avant les useEffect qui en dépendent)
  const updateUrl = useCallback(
    (newParams: {
      q?: string;
      niveau?: string;
      matieres?: string[];
      annee?: string;
      type?: string;
      page?: number;
      limit?: number;
    }) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      if (newParams.q !== undefined) {
        if (newParams.q.trim()) current.set('q', newParams.q.trim());
        else current.delete('q');
      }

      if (newParams.niveau !== undefined) {
        if (newParams.niveau && newParams.niveau !== 'all' && newParams.niveau !== 'Tous les niveaux') {
          current.set('niveau', newParams.niveau);
        } else {
          current.delete('niveau');
        }
      }

      if (newParams.matieres !== undefined) {
        if (newParams.matieres.length > 0) {
          current.set('matiere', newParams.matieres.join(','));
        } else {
          current.delete('matiere');
        }
      }

      if (newParams.annee !== undefined) {
        if (newParams.annee && newParams.annee !== 'all') {
          current.set('annee', newParams.annee);
        } else {
          current.delete('annee');
        }
      }

      if (newParams.type !== undefined) {
        if (newParams.type && newParams.type !== 'all') {
          current.set('type', newParams.type);
        } else {
          current.delete('type');
        }
      }

      if (newParams.page !== undefined) {
        if (newParams.page > 1) current.set('page', String(newParams.page));
        else current.delete('page');
      } else if (
        newParams.q !== undefined ||
        newParams.niveau !== undefined ||
        newParams.matieres !== undefined ||
        newParams.annee !== undefined ||
        newParams.type !== undefined
      ) {
        current.delete('page');
        setCurrentPage(1);
      }

      if (newParams.limit !== undefined) {
        if (newParams.limit !== 10) current.set('limit', String(newParams.limit));
        else current.delete('limit');
      }

      const search = current.toString();
      const query = search ? `?${search}` : '';
      router.replace(`/epreuves${query}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Charger le profil de l'utilisateur connecté : initialiser le niveau ou rediriger vers onboarding à la 1ère connexion
  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/profil')
        .then((res) => res.json())
        .then((data) => {
          if (data.profil?.niveau) {
            setUserNiveau(data.profil.niveau);
            if (!niveauParam) {
              setSelectedNiveau(data.profil.niveau);
              updateUrl({ niveau: data.profil.niveau });
            }
          } else {
            // Première connexion : aucun niveau enregistré, redirection immédiate vers onboarding
            router.replace('/onboarding');
          }
        })
        .catch((err) => console.error('Erreur lecture profil:', err));
    }
  }, [session, niveauParam, router, updateUrl]);

  // Récupérer les épreuves filtrées depuis l'API avec pagination
  const fetchEpreuves = useCallback(async (targetPage = currentPage, targetLimit = limit) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(targetLimit));
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedNiveau && selectedNiveau !== 'all' && selectedNiveau !== 'Tous les niveaux') {
        params.set('niveau', selectedNiveau);
      }
      if (selectedMatieres.length > 0) {
        params.set('matiere', selectedMatieres.join(','));
      }
      if (selectedAnnee && selectedAnnee !== 'all') {
        params.set('annee', selectedAnnee);
      }
      if (selectedType && selectedType !== 'all') {
        params.set('type', selectedType);
      }

      const res = await fetch(`/api/epreuves?${params.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger les épreuves.');
      const data = await res.json();
      setEpreuves(data.epreuves || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || targetPage);
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchQuery, selectedNiveau, selectedMatieres, selectedAnnee, selectedType]);

  useEffect(() => {
    fetchEpreuves();
  }, [fetchEpreuves]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    updateUrl({ page: newPage });
    fetchEpreuves(newPage, limit);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
    updateUrl({ page: 1, limit: newLimit });
    fetchEpreuves(1, newLimit);
  };

  // Gestion des filtres
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    updateUrl({ q: val });
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    updateUrl({ type });
  };

  const handleApplyChips = (filters: {
    niveau: string;
    matieres: string[];
    annee: string;
  }) => {
    setSelectedNiveau(filters.niveau);
    setSelectedMatieres(filters.matieres);
    setSelectedAnnee(filters.annee);
    updateUrl({
      niveau: filters.niveau,
      matieres: filters.matieres,
      annee: filters.annee,
    });
  };

  const handleResetAll = () => {
    const defaultNiveau = userNiveau || 'all';
    setSearchQuery('');
    setSelectedType('all');
    setSelectedNiveau(defaultNiveau);
    setSelectedMatieres([]);
    setSelectedAnnee('all');
    updateUrl({
      q: '',
      type: 'all',
      niveau: defaultNiveau,
      matieres: [],
      annee: 'all',
    });
  };

  const hasActiveFilters = Boolean(
    (selectedNiveau && selectedNiveau !== 'all' && selectedNiveau !== 'Tous les niveaux') ||
    selectedMatieres.length > 0 ||
    (selectedAnnee && selectedAnnee !== 'all') ||
    (selectedType && selectedType !== 'all') ||
    searchQuery.trim().length > 0
  );

  // État de chargement de session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-ink-muted">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  // Si non authentifié, ne rien afficher pendant que le middleware / useEffect redirige
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg selection:bg-brand selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-16">
        {/* Top Header / Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-brand via-teal-800 to-brand-dark p-6 sm:p-8 text-white shadow-xl shadow-brand/10 mb-8 overflow-hidden">
          {/* Ambient light effect inside header */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-300">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Archives MBH • École Polytechnique d&apos;Abomey-Calavi</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Annales & Sujets d&apos;Épreuves
              </h1>

              <p className="text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed">
                Retrouvez instantanément les devoirs, examens et rattrapages passés pour vos révisions universitaires.
              </p>
            </div>

            {/* Profile Level pill & Total count badge */}
            <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
                <span className="block text-xl font-black text-emerald-300">{totalCount}</span>
                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                  Document{totalCount > 1 ? 's' : ''}
                </span>
              </div>

              <Link
                href="/onboarding"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-brand hover:bg-slate-50 font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>{selectedNiveau && selectedNiveau !== 'all' ? selectedNiveau : 'Définir mon niveau'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Control Dock (Recherche + Type + Filtres) */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 mb-8">
          {/* Barre de recherche principale */}
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
          />

          {/* Segmented Control de Type */}
          <TypeSegmentedControl
            selectedType={selectedType}
            onChange={handleTypeChange}
          />

          {/* Chips de filtres déroulants */}
          <FilterChips
            selectedNiveau={selectedNiveau}
            selectedMatieres={selectedMatieres}
            selectedAnnee={selectedAnnee}
            matieresList={matieresList}
            onApplyFilters={handleApplyChips}
            onResetAll={handleResetAll}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Bandeau de filtres actifs amovibles individuellement */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-slate-100 dark:border-[#30363D] flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-muted font-medium">Filtres actifs :</span>

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#21262D] text-ink-primary dark:text-[#F0F6FC] font-semibold border border-slate-200/80 dark:border-[#30363D]">
                  <span>Recherche : &ldquo;{searchQuery}&rdquo;</span>
                  <button
                    onClick={() => handleSearchChange('')}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedType && selectedType !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800/60 capitalize">
                  <span>{selectedType}</span>
                  <button
                    onClick={() => handleTypeChange('all')}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedNiveau && selectedNiveau !== 'all' && selectedNiveau !== 'Tous les niveaux' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-emerald-950/60 text-brand dark:text-emerald-300 font-semibold border border-brand-200 dark:border-emerald-800/60">
                  <span>{selectedNiveau}</span>
                  <button
                    onClick={() => updateUrl({ niveau: 'all' })}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedMatieres.map((mat) => (
                <span
                  key={mat}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60"
                >
                  <span className="truncate max-w-[120px]">{mat}</span>
                  <button
                    onClick={() => {
                      const updated = selectedMatieres.filter((m) => m !== mat);
                      setSelectedMatieres(updated);
                      updateUrl({ matieres: updated });
                    }}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {selectedAnnee && selectedAnnee !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/60">
                  <span>{selectedAnnee}</span>
                  <button
                    onClick={() => updateUrl({ annee: 'all' })}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={handleResetAll}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold ml-auto hover:underline"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>

        {/* Message d'erreur réseau */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center justify-between text-xs text-red-700 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchEpreuves()}
              className="font-bold underline hover:text-red-900 dark:hover:text-red-200 ml-3"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Grille responsive des cartes d'épreuves (1 col mobile, 2 col tablette/desktop) */}
        {loading ? (
          <EpreuvesListSkeleton count={10} />
        ) : epreuves.length === 0 ? (
          <EmptyState
            title="Aucune épreuve trouvée"
            description="Aucune archive ne correspond à vos filtres actuels. Réinitialisez les filtres ou partagez vos sujets d'examens !"
            onReset={hasActiveFilters ? handleResetAll : undefined}
            showDepositCTA={true}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {epreuves.map((epreuve) => (
                <EpreuveCard key={epreuve.id} epreuve={epreuve} />
              ))}
            </div>

            {/* Barre de pagination moderne et intuitive */}
            {totalCount > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-[#30363D] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-3">
                  <span>
                    Affichage de <strong className="text-slate-800 dark:text-slate-200 font-bold">{Math.min((currentPage - 1) * limit + 1, totalCount)}</strong> à <strong className="text-slate-800 dark:text-slate-200 font-bold">{Math.min(currentPage * limit, totalCount)}</strong> sur <strong className="text-slate-800 dark:text-slate-200 font-bold">{totalCount}</strong> épreuves
                  </span>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span>Par page :</span>
                    {[10, 20, 30].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => handleLimitChange(l)}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${limit === l
                            ? 'bg-[#0F4C5C] dark:bg-emerald-600 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                          }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#21262D] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium shadow-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden xs:inline">Précédent</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        if (
                          totalPages > 7 &&
                          p !== 1 &&
                          p !== totalPages &&
                          Math.abs(p - currentPage) > 1
                        ) {
                          if (p === 2 || p === totalPages - 1) {
                            return <span key={p} className="px-1 text-slate-400">…</span>;
                          }
                          return null;
                        }

                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`min-w-[34px] h-8 px-2 rounded-xl text-xs font-bold transition-all ${currentPage === p
                                ? 'bg-[#0F4C5C] dark:bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#21262D]'
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#21262D] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium shadow-xs"
                    >
                      <span className="hidden xs:inline">Suivant</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNavCTA />
    </div>
  );
}

export default function EpreuvesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm font-semibold text-ink-secondary">Chargement du catalogue...</div>}>
      <EpreuvesContent />
    </Suspense>
  );
}