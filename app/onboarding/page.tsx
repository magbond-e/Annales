'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { GraduationCap, ArrowRight, Loader2, Sparkles, Check, Award } from 'lucide-react';
import { VALID_NIVEAUX_PREDEFINIS } from '@/lib/utils/validation';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirection automatique si non authentifié
  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('google', { callbackUrl: '/onboarding' });
    }
  }, [status]);

  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customNiveau, setCustomNiveau] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Vérifier si l'utilisateur a déjà un profil rempli
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/profil')
        .then((res) => res.json())
        .then((data) => {
          if (data.profil?.niveau) {
            const niv = data.profil.niveau;
            if (VALID_NIVEAUX_PREDEFINIS.includes(niv)) {
              setSelectedOption(niv);
            } else {
              setSelectedOption('Autre');
              setCustomNiveau(niv);
            }
          }
        })
        .catch((err) => console.error(err));
    }
  }, [status]);

  const isOther = selectedOption === 'Autre';
  const effectiveNiveau = isOther ? customNiveau.trim() : selectedOption;
  const isValid = effectiveNiveau.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch('/api/profil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niveau: effectiveNiveau }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de l\'enregistrement');
      }

      // Redirection vers /epreuves avec filtre par défaut
      router.push(`/epreuves?niveau=${encodeURIComponent(effectiveNiveau)}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible d\'enregistrer votre niveau. Réessayez.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col justify-between selection:bg-brand selection:text-white">
      {/* Barre supérieure */}
      <header className="w-full max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
        <Link href="/epreuves" className="flex items-center gap-3 group">
          <img
            src="/logo.svg"
            alt="Annale229 Logo"
            className="w-9 h-9 rounded-xl shadow-md object-contain group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-[#F0F6FC] font-heading">
              Annale<span className="text-emerald-500">229</span>
            </span>
          </div>
        </Link>
      </header>

      {/* Contenu onboarding */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-white dark:bg-[#161B22] border border-slate-200/80 dark:border-[#30363D] rounded-3xl p-6 sm:p-10 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-emerald-950/60 border border-brand-200/80 dark:border-emerald-800 text-brand dark:text-emerald-400 flex items-center justify-center mb-6 shadow-xs">
            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-ink-primary dark:text-[#F0F6FC] tracking-tight">
            Bienvenue {session?.user?.name ? `${session.user.name.split(' ')[0]} !` : 'en MBH !'}
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-ink-secondary dark:text-slate-400 leading-relaxed">
            Pour personnaliser votre catalogue et afficher directement les épreuves qui vous concernent, quel est votre niveau actuel à l&apos;EPAC ?
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {/* Grille de sélection tactile des niveaux */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink-primary dark:text-[#F0F6FC] uppercase tracking-wider mb-2">
                Sélectionnez votre niveau <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 gap-3">
                {VALID_NIVEAUX_PREDEFINIS.map((opt) => {
                  const isSelected = selectedOption === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedOption(opt)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between ${
                        isSelected
                          ? 'border-brand dark:border-emerald-500 bg-brand-50 dark:bg-emerald-950/40 text-brand dark:text-emerald-300 shadow-sm font-bold scale-[1.01]'
                          : 'border-slate-200 dark:border-[#30363D] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#21262D] hover:bg-slate-50 dark:hover:bg-[#282E37] text-ink-primary dark:text-[#F0F6FC] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Award className={`w-5 h-5 ${isSelected ? 'text-brand dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                        <div>
                          <span className="text-sm font-bold block">{opt}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">Filière Maintenance Biomédicale & Hospitalière</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-brand dark:bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-xl font-semibold">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full mt-6 flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-brand to-teal-700 hover:from-brand-hover hover:to-teal-800 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-99"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <span>Accéder à mes épreuves</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-ink-muted dark:text-slate-500">
        Ce choix pourra être modifié à tout moment depuis votre profil.
      </footer>
    </div>
  );
}
