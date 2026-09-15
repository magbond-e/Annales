'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BottomNavCTA } from '@/components/BottomNavCTA';
import { Epreuve } from '@/types';
import { formatRelativeDate, formatFileSize } from '@/lib/utils/date';
import { 
  FolderArchive, 
  Trash2, 
  ExternalLink, 
  Upload, 
  Loader2, 
  Award, 
  Calendar,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Plus,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function MesDepotsPage() {
  const { data: session } = useSession();

  const [epreuves, setEpreuves] = useState<Epreuve[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modale de suppression
  const [targetEpreuve, setTargetEpreuve] = useState<Epreuve | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMesDepots = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/epreuves?uploader_email=${encodeURIComponent(session.user.email)}`);
      if (!res.ok) throw new Error('Impossible de charger vos dépôts.');
      const data = await res.json();
      setEpreuves(data.epreuves || []);
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchMesDepots();
  }, [fetchMesDepots]);

  const handleDeleteConfirm = async () => {
    if (!targetEpreuve) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/epreuves/${targetEpreuve.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression.');
      }

      // Optimistic update : retrait immédiat de l'UI
      setEpreuves((prev) => prev.filter((e) => e.id !== targetEpreuve.id));
      setTargetEpreuve(null);
    } catch (err: any) {
      alert(err.message || 'Impossible de supprimer cette épreuve.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'devoir':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'rattrapage':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatutBadge = (statut?: string) => {
    switch (statut) {
      case 'en_attente':
        return {
          label: 'En attente de validation',
          icon: <Clock className="w-3 h-3" />,
          cls: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'rejete':
        return {
          label: 'Non retenue',
          icon: <XCircle className="w-3 h-3" />,
          cls: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        };
      case 'approuve':
      default:
        return {
          label: 'En ligne',
          icon: <CheckCircle2 className="w-3 h-3" />,
          cls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg selection:bg-brand selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-16">
        {/* En-tête Dashboard avec statistiques */}
        <div className="rounded-3xl bg-white dark:bg-[#161B22] border border-slate-200/80 dark:border-[#30363D] p-6 sm:p-8 shadow-card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-2">
                <FolderArchive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Espace Contributeur</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink-primary dark:text-[#F0F6FC] tracking-tight">
                Mes épreuves déposées
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-ink-secondary dark:text-slate-400">
                Consultez, partagez ou supprimez les documents que vous avez partagés avec la communauté.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-slate-50 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] rounded-2xl text-center">
                <span className="block text-xl font-black text-brand dark:text-emerald-400">{epreuves.length}</span>
                <span className="text-[10px] font-bold text-ink-muted dark:text-slate-400 uppercase tracking-wider">
                  Dépôt{epreuves.length > 1 ? 's' : ''}
                </span>
              </div>

              <Link
                href="/deposer"
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-brand to-teal-700 hover:from-brand-hover hover:to-teal-800 text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-md shadow-brand/20 active:scale-98"
              >
                <Plus className="w-4 h-4 text-emerald-300" />
                <span>Nouveau dépôt</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Message d'erreur éventuel */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center justify-between text-xs text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchMesDepots}
              className="font-bold underline hover:text-red-900 dark:hover:text-red-200 ml-3"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Liste des épreuves */}
        <div>
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 text-brand dark:text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-ink-primary dark:text-[#F0F6FC]">Chargement de vos dépôts...</p>
            </div>
          ) : epreuves.length === 0 ? (
            <div className="bg-white dark:bg-[#161B22] border border-slate-200/80 dark:border-[#30363D] rounded-3xl p-10 sm:p-16 text-center shadow-subtle">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-4">
                <FolderArchive className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-ink-primary dark:text-[#F0F6FC]">
                Vous n&apos;avez encore déposé aucune épreuve
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-ink-secondary dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Une photo de devoir ou un examen dans votre téléphone peut débloquer les révisions de toute votre promotion !
              </p>
              <Link
                href="/deposer"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-brand/20 active:scale-98"
              >
                <Upload className="w-4 h-4 text-emerald-300" />
                <span>Déposer ma première épreuve</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {epreuves.map((epreuve) => {
                const isPdf = epreuve.type_fichier?.toLowerCase() === 'pdf';
                return (
                  <div
                    key={epreuve.id}
                    className="bg-white dark:bg-[#161B22] border border-slate-200/80 dark:border-[#30363D] rounded-2xl p-5 sm:p-6 shadow-subtle hover:shadow-card hover:border-brand/30 dark:hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isPdf 
                          ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40' 
                          : 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40'
                      }`}>
                        {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${getTypeBadge(epreuve.type)}`}>
                            {epreuve.type}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-secondary dark:text-slate-300 bg-slate-100 dark:bg-[#21262D] px-2.5 py-0.5 rounded-full border border-transparent dark:border-[#30363D]">
                            <Award className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>{epreuve.niveau}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-secondary dark:text-slate-300 bg-slate-100 dark:bg-[#21262D] px-2.5 py-0.5 rounded-full border border-transparent dark:border-[#30363D]">
                            <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>{epreuve.annee_academique}</span>
                          </span>
                          {/* Badge de statut de modération */}
                          {(() => {
                            const sb = getStatutBadge((epreuve as any).statut);
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${sb.cls}`}>
                                {sb.icon}
                                {sb.label}
                              </span>
                            );
                          })()}
                        </div>

                        <Link
                          href={`/epreuves/${epreuve.id}`}
                          className="block text-base font-bold text-ink-primary dark:text-[#F0F6FC] hover:text-brand dark:hover:text-emerald-400 transition-colors truncate"
                        >
                          {epreuve.matiere_nom}
                        </Link>

                        {epreuve.titre && (
                          <p className="text-xs text-ink-secondary dark:text-slate-400 truncate">
                            {epreuve.titre}
                          </p>
                        )}

                        <p className="text-[11px] text-ink-muted dark:text-slate-500">
                          Déposé {formatRelativeDate(epreuve.created_at)} •{' '}
                          <span className="uppercase font-semibold">{epreuve.type_fichier}</span> •{' '}
                          {formatFileSize(epreuve.taille_octets)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center border-t border-slate-200/60 dark:border-[#30363D] sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
                      <Link
                        href={`/epreuves/${epreuve.id}`}
                        className="px-3 py-2 text-xs font-bold text-ink-secondary dark:text-slate-300 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200/80 dark:border-[#30363D]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Consulter</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setTargetEpreuve(epreuve)}
                        className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/50 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modale de confirmation de suppression */}
      <ConfirmModal
        isOpen={Boolean(targetEpreuve)}
        title="Supprimer cette épreuve ?"
        message={`Êtes-vous sûr de vouloir supprimer définitivement l'épreuve "${targetEpreuve?.matiere_nom}" (${targetEpreuve?.type}, ${targetEpreuve?.annee_academique}) ? Le fichier sera retiré du stockage cloud et du catalogue.`}
        confirmLabel="Oui, supprimer"
        cancelLabel="Conserver"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTargetEpreuve(null)}
        isProcessing={isDeleting}
      />

      <BottomNavCTA />
    </div>
  );
}
