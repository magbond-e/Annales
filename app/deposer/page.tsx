'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { MatiereCombobox } from '@/components/MatiereCombobox';
import { Matiere, TypeEpreuve } from '@/types';
import { getAcademicYears, formatFileSize } from '@/lib/utils/date';
import { VALID_NIVEAUX_PREDEFINIS, VALID_TYPES, MAX_FILE_SIZE_BYTES, getCanonicalFileType } from '@/lib/utils/validation';
import { mergeFilesToPdf } from '@/lib/utils/pdf-merger';
import {
  ArrowLeft,
  Upload,
  Sparkles,
  AlertCircle,
  Check,
  Loader2,
  GraduationCap,
  Calendar,
  Award,
  FileCheck,
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Layers,
  Files
} from 'lucide-react';

export default function DeposerPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Données de formulaire
  const [matiereNom, setMatiereNom] = useState('');
  const [niveau, setNiveau] = useState('');
  const [customNiveau, setCustomNiveau] = useState('');
  const [anneeAcademique, setAnneeAcademique] = useState('');
  const [customAnnee, setCustomAnnee] = useState('');
  const [type, setType] = useState<TypeEpreuve | ''>('');
  const [titre, setTitre] = useState('');

  // Fichiers de l'épreuve (support multi-pages / photos multiples)
  const [epreuvePages, setEpreuvePages] = useState<File[]>([]);
  const epreuveInputRef = useRef<HTMLInputElement>(null);

  // Corrigé optionnel
  const [hasCorrige, setHasCorrige] = useState<boolean>(false);
  const [corrigePages, setCorrigePages] = useState<File[]>([]);
  const corrigeInputRef = useRef<HTMLInputElement>(null);

  // Données externes
  const [matieresList, setMatieresList] = useState<Matiere[]>([]);
  const academicYears = getAcademicYears(5);

  // États de validation et de soumission
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Charger les matières
  useEffect(() => {
    fetch('/api/matieres')
      .then((res) => res.json())
      .then((data) => {
        if (data.matieres) setMatieresList(data.matieres);
      })
      .catch((err) => console.error('Erreur chargement matières:', err));
  }, []);

  // Pré-remplir le niveau depuis le profil utilisateur
  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/profil')
        .then((res) => res.json())
        .then((data) => {
          if (data.profil?.niveau) {
            const niv = data.profil.niveau;
            if (VALID_NIVEAUX_PREDEFINIS.includes(niv)) {
              setNiveau(niv);
            } else {
              setNiveau('Autre');
              setCustomNiveau(niv);
            }
          }
        })
        .catch((err) => console.error(err));
    }
  }, [session]);

  const effectiveNiveau = niveau === 'Autre' ? customNiveau.trim() : niveau;
  const effectiveAnnee = anneeAcademique === 'Plus ancien' ? customAnnee.trim() : anneeAcademique;

  const isFormValid = Boolean(
    matiereNom.trim() &&
    effectiveNiveau &&
    effectiveAnnee &&
    type &&
    epreuvePages.length > 0 &&
    (!hasCorrige || corrigePages.length > 0)
  );

  // ============================================================
  // GESTION DES PAGES DU SUJET
  // ============================================================

  const handleAddEpreuveFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];

    Array.from(files).forEach((f) => {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        alert(`Le fichier "${f.name}" dépasse la taille maximale de 15 Mo.`);
        return;
      }
      const canonical = getCanonicalFileType(f.name, f.type);
      if (!canonical) {
        alert(`Format non supporté pour "${f.name}". Formats acceptés : PDF, JPG, PNG, HEIC.`);
        return;
      }
      valid.push(f);
    });

    if (valid.length > 0) {
      setEpreuvePages((prev) => [...prev, ...valid]);
      if (errors.file) setErrors((prev) => ({ ...prev, file: '' }));
    }
  };

  const removeEpreuvePage = (index: number) => {
    setEpreuvePages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveEpreuvePage = (fromIndex: number, toIndex: number) => {
    setEpreuvePages((prev) => {
      const copy = [...prev];
      if (toIndex < 0 || toIndex >= copy.length) return prev;
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  // ============================================================
  // GESTION DU CORRIGÉ
  // ============================================================

  const handleAddCorrigeFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];

    Array.from(files).forEach((f) => {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        alert(`Le fichier de corrigé "${f.name}" dépasse 15 Mo.`);
        return;
      }
      const canonical = getCanonicalFileType(f.name, f.type);
      if (!canonical) {
        alert(`Format non supporté pour le corrigé "${f.name}".`);
        return;
      }
      valid.push(f);
    });

    if (valid.length > 0) {
      setCorrigePages((prev) => [...prev, ...valid]);
      if (errors.corrige) setErrors((prev) => ({ ...prev, corrige: '' }));
    }
  };

  const removeCorrigePage = (index: number) => {
    setCorrigePages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // ============================================================
  // SOUMISSION DU FORMULAIRE
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    const newErrors: { [key: string]: string } = {};
    if (!matiereNom.trim()) {
      newErrors.matiere = 'Veuillez renseigner ou choisir une matière.';
    }
    if (!effectiveNiveau) {
      newErrors.niveau = 'Veuillez sélectionner votre niveau.';
    }
    if (!effectiveAnnee) {
      newErrors.annee = 'L\'année académique est obligatoire.';
    }
    if (!type) {
      newErrors.type = 'Sélectionnez le type d\'épreuve.';
    }
    if (epreuvePages.length === 0) {
      newErrors.file = 'Veuillez sélectionner au moins une page ou un PDF pour l\'épreuve.';
    }
    if (hasCorrige && corrigePages.length === 0) {
      newErrors.corrige = 'Vous avez indiqué avoir le corrigé. Veuillez joindre le fichier ou repasser sur "Épreuve seule".';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(15);

      // 1. Fusion des pages du sujet si plusieurs pages
      let finalEpreuveFile: File;
      if (epreuvePages.length > 1) {
        setSubmittingStep(`Fusion de vos ${epreuvePages.length} photos en un document PDF...`);
        const safeTitle = (titre.trim() || matiereNom.trim()).replace(/[^a-zA-Z0-9_-]/g, '_');
        finalEpreuveFile = await mergeFilesToPdf(epreuvePages, `${safeTitle}_epreuve.pdf`);
      } else {
        finalEpreuveFile = epreuvePages[0];
      }

      setUploadProgress(40);

      // 2. Fusion éventuelle des pages du corrigé si plusieurs
      let finalCorrigeFile: File | null = null;
      if (hasCorrige && corrigePages.length > 0) {
        if (corrigePages.length > 1) {
          setSubmittingStep(`Fusion des ${corrigePages.length} pages du corrigé en un document PDF...`);
          const safeTitle = (titre.trim() || matiereNom.trim()).replace(/[^a-zA-Z0-9_-]/g, '_');
          finalCorrigeFile = await mergeFilesToPdf(corrigePages, `corrige_${safeTitle}.pdf`);
        } else {
          finalCorrigeFile = corrigePages[0];
        }
      }

      setUploadProgress(65);
      setSubmittingStep('Téléversement sécurisé vers la plateforme...');

      // 3. Envoi multipart
      const formData = new FormData();
      formData.append('matiere_nom', matiereNom.trim());
      formData.append('niveau', effectiveNiveau);
      formData.append('annee_academique', effectiveAnnee);
      formData.append('type', type);
      if (titre.trim()) formData.append('titre', titre.trim());
      formData.append('file', finalEpreuveFile);

      if (finalCorrigeFile) {
        formData.append('corrige_file', finalCorrigeFile);
      }

      const res = await fetch('/api/epreuves', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la publication.');
      }

      setUploadProgress(100);
      setSubmittingStep('Finalisation...');
      const data = await res.json();
      router.push(`/epreuves/${data.id}?created=true`);
    } catch (err: any) {
      setUploadProgress(null);
      setIsSubmitting(false);
      setSubmittingStep(null);
      setGlobalError(
        err.message || 'Échec de l\'envoi réseau. Cliquez sur Réessayer sans perdre vos saisies.'
      );
    }
  };

  const totalEpreuveSize = epreuvePages.reduce((acc, f) => acc + f.size, 0);
  const totalCorrigeSize = corrigePages.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg selection:bg-brand selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Navigation retour */}
        <div className="mb-6">
          <Link
            href="/epreuves"
            className="inline-flex items-center gap-2 text-xs font-bold text-ink-secondary dark:text-slate-300 hover:text-brand dark:hover:text-emerald-400 transition-colors bg-white dark:bg-[#161B22] px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-[#30363D] shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Retour au catalogue</span>
          </Link>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-[#161B22] rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-[#30363D] shadow-sm relative overflow-hidden">
          {/* Header */}
          <div className="mb-8 border-b border-slate-100 dark:border-[#30363D] pb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Contribution Solidaire MBH</span>
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">| Promotion de l&apos;Excellence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink-primary dark:text-[#F0F6FC] tracking-tight font-heading">
              Déposer une épreuve passée
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-1.5 leading-relaxed">
              Partagez une épreuve d&apos;examen ou de devoir avec vos camarades. Si votre sujet est découpé en plusieurs photos,
              <strong> elles seront automatiquement fusionnées en un PDF unique</strong>. Vous pouvez également y joindre le corrigé.
            </p>
          </div>

          {/* Erreur globale si rejet serveur */}
          {globalError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs sm:text-sm font-semibold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1">{globalError}</div>
            </div>
          )}

          {/* Progression lors de la soumission */}
          {isSubmitting && (
            <div className="mb-8 p-5 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-2">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>{submittingStep || 'Traitement et publication en cours...'}</span>
                </span>
                <span>{uploadProgress || 30}%</span>
              </div>
              <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress || 30}%` }}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Matière */}
            <div>
              <label className="block text-xs font-bold text-ink-primary dark:text-[#F0F6FC] uppercase tracking-wider mb-2">
                Matière de l&apos;épreuve <span className="text-red-500">*</span>
              </label>
              <MatiereCombobox
                matieresList={matieresList}
                value={matiereNom}
                onChange={(val) => {
                  setMatiereNom(val);
                  if (errors.matiere) setErrors({ ...errors, matiere: '' });
                }}
                error={errors.matiere}
              />
            </div>

            {/* 2. Niveau & Année académique */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Niveau */}
              <div>
                <label className="block text-xs font-bold text-ink-primary dark:text-[#F0F6FC] uppercase tracking-wider mb-2">
                  Niveau d&apos;études <span className="text-red-500">*</span>
                </label>
                <select
                  value={niveau}
                  onChange={(e) => {
                    setNiveau(e.target.value);
                    if (errors.niveau) setErrors({ ...errors, niveau: '' });
                  }}
                  className={`w-full px-4 py-3 bg-white dark:bg-[#21262D] border rounded-xl text-sm font-medium text-ink-primary dark:text-[#F0F6FC] focus:outline-none focus:ring-2 focus:ring-brand/20 dark:focus:ring-emerald-500/20 focus:border-brand dark:focus:border-emerald-500 shadow-xs transition-colors ${errors.niveau ? 'border-red-300 dark:border-red-500 bg-red-50/20' : 'border-slate-200 dark:border-[#30363D]'
                    }`}
                >
                  <option value="" className="dark:bg-[#21262D]">Sélectionnez le niveau...</option>
                  {VALID_NIVEAUX_PREDEFINIS.map((niv) => (
                    <option key={niv} value={niv} className="dark:bg-[#21262D]">
                      {niv}
                    </option>
                  ))}
                  <option value="Autre" className="dark:bg-[#21262D]">Autre niveau...</option>
                </select>

                {niveau === 'Autre' && (
                  <input
                    type="text"
                    value={customNiveau}
                    onChange={(e) => setCustomNiveau(e.target.value)}
                    placeholder="Précisez votre niveau (ex: Master Spécialisé...)"
                    className="mt-2 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-ink-primary dark:text-[#F0F6FC] placeholder-slate-400 dark:placeholder-slate-500 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                )}

                {errors.niveau && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">{errors.niveau}</p>
                )}
              </div>

              {/* Année Académique */}
              <div>
                <label className="block text-xs font-bold text-ink-primary dark:text-[#F0F6FC] uppercase tracking-wider mb-2">
                  Année Académique <span className="text-red-500">*</span>
                </label>
                <select
                  value={anneeAcademique}
                  onChange={(e) => {
                    setAnneeAcademique(e.target.value);
                    if (errors.annee) setErrors({ ...errors, annee: '' });
                  }}
                  className={`w-full px-4 py-3 bg-white dark:bg-[#21262D] border rounded-xl text-sm font-medium text-ink-primary dark:text-[#F0F6FC] focus:outline-none focus:ring-2 focus:ring-brand/20 dark:focus:ring-emerald-500/20 focus:border-brand dark:focus:border-emerald-500 shadow-xs transition-colors ${errors.annee ? 'border-red-300 dark:border-red-500 bg-red-50/20' : 'border-slate-200 dark:border-[#30363D]'
                    }`}
                >
                  <option value="" className="dark:bg-[#21262D]">Sélectionnez l&apos;année...</option>
                  {academicYears.map((yr) => (
                    <option key={yr} value={yr} className="dark:bg-[#21262D]">
                      {yr}
                    </option>
                  ))}
                  <option value="Plus ancien" className="dark:bg-[#21262D]">Année plus ancienne (saisie libre)</option>
                </select>

                {anneeAcademique === 'Plus ancien' && (
                  <input
                    type="text"
                    value={customAnnee}
                    onChange={(e) => setCustomAnnee(e.target.value)}
                    placeholder="Ex: 2018-2019"
                    className="mt-2 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-ink-primary dark:text-[#F0F6FC] placeholder-slate-400 dark:placeholder-slate-500 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                )}

                {errors.annee && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">{errors.annee}</p>
                )}
              </div>
            </div>

            {/* 3. Type d'épreuve */}
            <div>
              <label className="block text-xs font-bold text-ink-primary dark:text-[#F0F6FC] uppercase tracking-wider mb-2">
                Type d&apos;épreuve <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {VALID_TYPES.map((t) => {
                  const isSelected = type === t;
                  let selectedTheme = 'bg-brand text-white border-brand shadow-md shadow-brand/20';
                  if (t === 'devoir') selectedTheme = 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20';
                  if (t === 'rattrapage') selectedTheme = 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20';

                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setType(t);
                        if (errors.type) setErrors({ ...errors, type: '' });
                      }}
                      className={`py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold capitalize border transition-all duration-150 flex items-center justify-center gap-2 ${isSelected
                          ? selectedTheme
                          : 'bg-white dark:bg-[#21262D] text-ink-secondary dark:text-slate-300 border-slate-200 dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>

              {errors.type && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">{errors.type}</p>
              )}
            </div>

            {/* 4. Titre ou précision (optionnel) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="depot-titre"
                  className="text-xs font-bold text-ink-primary dark:text-[#F0F6FC] uppercase tracking-wider"
                >
                  Titre ou précisions <span className="text-ink-muted lowercase font-normal">(optionnel)</span>
                </label>
                <span className="text-[11px] font-medium text-ink-muted">
                  {titre.length}/150
                </span>
              </div>

              <input
                id="depot-titre"
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                maxLength={150}
                placeholder="Ex : Devoir de synthèse n°1, Session normale..."
                className="w-full px-4 py-3 bg-white dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] rounded-xl text-sm font-medium text-ink-primary dark:text-[#F0F6FC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/20 dark:focus:ring-emerald-500/20 focus:border-brand dark:focus:border-emerald-500 shadow-xs"
              />
            </div>

            {/* 5. Pages du Sujet (Multi-pages avec fusion automatique) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-ink-primary dark:text-[#F0F6FC] uppercase tracking-wider">
                  Fichier(s) de l&apos;épreuve <span className="text-red-500">*</span>
                </label>
                {epreuvePages.length > 1 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                    <Files className="w-3 h-3" />
                    <span>{epreuvePages.length} pages réunies en 1 PDF</span>
                  </span>
                )}
              </div>

              <input
                ref={epreuveInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
                className="hidden"
                onChange={(e) => {
                  handleAddEpreuveFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              {/* Zone de drop/sélection */}
              {epreuvePages.length === 0 ? (
                <div
                  onClick={() => epreuveInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand/60 dark:hover:border-emerald-500/60 rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer bg-white dark:bg-[#21262D]/40 hover:bg-slate-50/50 dark:hover:bg-[#21262D]/70 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-ink-primary dark:text-[#F0F6FC] mb-1">
                    Sélectionner l&apos;épreuve (document PDF ou photos multi-pages)
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400 mb-3 max-w-md mx-auto">
                    Si votre sujet comporte plusieurs pages ou photos (recto/verso), sélectionnez-les toutes ensemble. Elles seront assemblées proprement.
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-[#30363D] group-hover:bg-slate-200 dark:group-hover:bg-[#3A424D] text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors">
                    <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Choisir les photos / PDF</span>
                  </span>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-50/60 dark:bg-[#21262D]/50 p-4 rounded-3xl border border-slate-200 dark:border-[#30363D]">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold px-1">
                    <span>Pages du sujet ({epreuvePages.length}) • {formatFileSize(totalEpreuveSize)}</span>
                    <button
                      type="button"
                      onClick={() => epreuveInputRef.current?.click()}
                      className="text-brand dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter d&apos;autres pages</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {epreuvePages.map((page, idx) => {
                      const isPdf = page.type === 'application/pdf' || page.name.endsWith('.pdf');
                      return (
                        <div
                          key={`${page.name}_${idx}`}
                          className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-[#161B22] rounded-2xl border border-slate-200 dark:border-[#30363D] shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400' : 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
                              }`}>
                              {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-ink-primary dark:text-[#F0F6FC] truncate max-w-xs sm:max-w-md">
                                {page.name}
                              </p>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {formatFileSize(page.size)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveEpreuvePage(idx, idx - 1)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Monter"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === epreuvePages.length - 1}
                              onClick={() => moveEpreuvePage(idx, idx + 1)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Descendre"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEpreuvePage(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 ml-1"
                              title="Supprimer cette page"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {epreuvePages.length > 1 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>Ces {epreuvePages.length} pages seront assemblées dans cet ordre précis lors de la validation.</span>
                    </p>
                  )}
                </div>
              )}

              {errors.file && (
                <p className="mt-1.5 text-xs text-red-600 font-semibold">{errors.file}</p>
              )}
            </div>

            {/* 6. Section Corrigé / Barème (« Si oui disponible ») */}
            <div className="bg-slate-50/70 dark:bg-[#21262D]/40 p-5 rounded-3xl border border-slate-200/80 dark:border-[#30363D]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand dark:text-emerald-400" />
                  <label className="text-xs font-bold text-ink-primary dark:text-[#F0F6FC] uppercase tracking-wider">
                    Corrigé / Barème de l&apos;épreuve
                  </label>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-transparent dark:border-emerald-800/40">
                  Recommandé si disponible
                </span>
              </div>

              <p className="text-xs text-ink-secondary dark:text-slate-400 mb-4">
                Avez-vous le corrigé officiel ou la proposition de solution de cette épreuve ?
              </p>

              {/* Choix binaire stylisé */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setHasCorrige(false);
                    setCorrigePages([]);
                    if (errors.corrige) setErrors({ ...errors, corrige: '' });
                  }}
                  className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all text-left flex items-center justify-between ${!hasCorrige
                      ? 'bg-white dark:bg-[#161B22] text-ink-primary dark:text-[#F0F6FC] border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/20 shadow-xs'
                      : 'bg-white dark:bg-[#21262D] text-ink-secondary dark:text-slate-400 border-slate-200 dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                    <span>Non</span>
                  </div>
                  {!hasCorrige && <Check className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => setHasCorrige(true)}
                  className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all text-left flex items-center justify-between ${hasCorrige
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-white dark:bg-[#21262D] text-ink-secondary dark:text-slate-400 border-slate-200 dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 ${hasCorrige ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span>Oui, j&apos;ai le corrigé !</span>
                  </div>
                  {hasCorrige && <Check className="w-4 h-4 text-white" />}
                </button>
              </div>

              {/* Zone d'ajout du corrigé si "Oui" */}
              {hasCorrige && (
                <div className="space-y-3 pt-2">
                  <input
                    ref={corrigeInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
                    className="hidden"
                    onChange={(e) => {
                      handleAddCorrigeFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />

                  {corrigePages.length === 0 ? (
                    <div
                      onClick={() => corrigeInputRef.current?.click()}
                      className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center transition-all cursor-pointer bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40"
                    >
                      <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-300 mb-1">
                        Sélectionner le document ou les photos du corrigé
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        PDF, JPG ou PNG acceptés (jusqu&apos;à 15 Mo).
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#161B22] p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        <span>Fichiers du corrigé ({corrigePages.length}) • {formatFileSize(totalCorrigeSize)}</span>
                        <button
                          type="button"
                          onClick={() => corrigeInputRef.current?.click()}
                          className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter des pages</span>
                        </button>
                      </div>

                      {corrigePages.map((cPage, cIdx) => (
                        <div
                          key={`${cPage.name}_${cIdx}`}
                          className="flex items-center justify-between gap-3 p-2 bg-emerald-50/40 dark:bg-[#21262D] rounded-xl border border-emerald-100 dark:border-[#30363D]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold text-[10px] flex items-center justify-center">
                              {cIdx + 1}
                            </span>
                            <span className="text-xs font-medium text-emerald-950 dark:text-[#F0F6FC] truncate max-w-xs">
                              {cPage.name}
                            </span>
                            <span className="text-[10px] text-emerald-700 dark:text-slate-400">
                              ({formatFileSize(cPage.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCorrigePage(cIdx)}
                            className="p-1 text-emerald-700 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md"
                            title="Retirer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.corrige && (
                    <p className="mt-1.5 text-xs text-red-600 font-semibold">{errors.corrige}</p>
                  )}
                </div>
              )}
            </div>

            {/* 7. Bouton de soumission */}
            <div className="pt-4 border-t border-slate-100 dark:border-[#30363D]">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-brand to-teal-700 hover:from-brand-hover hover:to-teal-800 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-99"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{submittingStep || 'Publication en cours...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-emerald-300" />
                    <span>
                      Publier l&apos;épreuve sur Annale229 {hasCorrige && corrigePages.length > 0 ? '(avec Corrigé)' : ''}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
