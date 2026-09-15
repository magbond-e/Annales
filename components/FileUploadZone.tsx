'use client';

import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles 
} from 'lucide-react';
import { formatFileSize } from '@/lib/utils/date';
import { MAX_FILE_SIZE_BYTES, getCanonicalFileType } from '@/lib/utils/validation';
import { compressImageClient } from '@/lib/utils/compression-image';

interface FileUploadZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  uploadProgress: number | null; // null si pas en upload, 0-100 si en cours
  error?: string;
}

export function FileUploadZone({
  file,
  onFileSelect,
  uploadProgress,
  error,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [wasCompressed, setWasCompressed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    setLocalError(null);
    setWasCompressed(false);
    if (!files || files.length === 0) return;

    const selected = files[0];

    // Vérification taille max 15 Mo
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setLocalError('Le fichier dépasse la taille maximale autorisée de 15 Mo.');
      return;
    }

    // Vérification format
    const canonicalType = getCanonicalFileType(selected.name, selected.type);
    if (!canonicalType) {
      setLocalError('Format non pris en charge. Formats acceptés : PDF, JPG, PNG, HEIC.');
      return;
    }

    // Compression d'image automatique côté client
    if (canonicalType !== 'pdf') {
      try {
        setCompressing(true);
        const originalSize = selected.size;
        const compressed = await compressImageClient(selected);
        if (compressed.size < originalSize) {
          setWasCompressed(true);
        }
        onFileSelect(compressed);
      } catch (err) {
        console.error('Erreur compression client:', err);
        onFileSelect(selected);
      } finally {
        setCompressing(false);
      }
    } else {
      onFileSelect(selected);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setWasCompressed(false);
    setLocalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayError = error || localError;
  const isPdf = file ? getCanonicalFileType(file.name, file.type) === 'pdf' : false;

  return (
    <div className="w-full space-y-2">
      {/* Zone d'upload / Dropzone */}
      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-200 ${
            dragActive
              ? 'border-brand bg-brand-50/70 scale-[1.01]'
              : 'border-slate-300 hover:border-brand/60 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand group-hover:border-brand-200 group-hover:scale-110 transition-all duration-200">
              {compressing ? (
                <Loader2 className="w-7 h-7 animate-spin text-brand" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-ink-primary group-hover:text-brand transition-colors">
                {compressing ? 'Optimisation du fichier...' : 'Cliquez pour sélectionner ou glissez votre fichier'}
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                PDF numérisé ou photo de l&apos;épreuve (JPG, PNG, HEIC)
              </p>
            </div>

            {/* Badges des formats autorisés */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {['PDF', 'JPG', 'PNG', 'HEIC'].map((format) => (
                <span
                  key={format}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-white border border-slate-200 text-ink-muted"
                >
                  {format}
                </span>
              ))}
              <span className="text-[11px] font-medium text-slate-400 ml-1">
                • Max 15 Mo
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Fichier sélectionné - Carte de prévisualisation */
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isPdf 
                  ? 'bg-red-50 text-red-600 border border-red-100' 
                  : 'bg-teal-50 text-teal-600 border border-teal-100'
              }`}>
                {isPdf ? <FileText className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-primary truncate max-w-xs sm:max-w-md">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-secondary">
                  <span className="font-semibold uppercase">{isPdf ? 'PDF' : 'Image'}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                  {wasCompressed && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Sparkles className="w-3 h-3" />
                      Optimisé
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bouton supprimer */}
            {uploadProgress === null && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                aria-label="Supprimer le fichier"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Barre de progression d'upload */}
          {uploadProgress !== null && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-semibold text-ink-primary mb-1.5">
                <span>Téléversement sécurisé vers le cloud...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-teal-500 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Affichage des erreurs */}
      {displayError && (
        <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
