/**
 * ZipService — Génération d'archives ZIP d'annales pour Annale229 MBH
 *
 * Logique de fusion : si une épreuve possède un corrigé PDF,
 * le sujet et le corrigé sont fusionnés en un seul PDF avant d'être ajoutés à l'archive.
 *
 * Arborescence dans le ZIP :
 *   Devoirs/        ← épreuves de type "devoir"
 *   Rattrapages/    ← épreuves de type "rattrapage"
 *   LISEZ-MOI.txt   ← provenance et date de génération
 */
import JSZip from 'jszip';
import { Epreuve } from '@/types';
import { DataService } from '@/lib/storage/data-service';
import { fetchCloudinaryBuffer, isCloudinaryConfigured } from '@/lib/storage/cloudinary-client';
import { getNeonStorageBuffer, isNeonStorageConfigured } from '@/lib/storage/s3-client';
import { EpreuvesFilterParams } from '@/types';

// Limite de sécurité : 40 fichiers ou 150 Mo par archive
const MAX_FILES   = 40;
const MAX_BYTES   = 150 * 1024 * 1024;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeFilename(s: string): string {
  return s.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 80);
}

async function fetchBuffer(params: {
  s3Key?: string;
  cloudinaryPublicId?: string;
  fallbackUrl?: string;
  ext: string;
}): Promise<Buffer | null> {
  if (isNeonStorageConfigured() && params.s3Key) {
    const buf = await getNeonStorageBuffer(params.s3Key);
    if (buf) return buf;
  }
  if (isCloudinaryConfigured() && params.cloudinaryPublicId && !params.cloudinaryPublicId.startsWith('mock_')) {
    const cld = await fetchCloudinaryBuffer(params.cloudinaryPublicId, params.ext);
    if (cld) return cld.buffer;
  }
  if (params.fallbackUrl && !params.fallbackUrl.includes('images.unsplash.com')) {
    try {
      const res = await fetch(params.fallbackUrl);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * Fusionne sujet PDF + corrigé PDF en un seul document via pdf-lib
 * Retourne null si la fusion est impossible (erreur ou fichiers non-PDF)
 */
async function mergePdfs(sujetBuffer: Buffer, corrigeBuffer: Buffer): Promise<Buffer | null> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const sujetDoc   = await PDFDocument.load(sujetBuffer);
    const corrigeDoc = await PDFDocument.load(corrigeBuffer);
    const merged     = await PDFDocument.create();

    const sp = await merged.copyPages(sujetDoc,   sujetDoc.getPageIndices());
    sp.forEach((p) => merged.addPage(p));
    const cp = await merged.copyPages(corrigeDoc, corrigeDoc.getPageIndices());
    cp.forEach((p) => merged.addPage(p));

    return Buffer.from(await merged.save());
  } catch (err) {
    console.error('ZipService: erreur fusion PDF:', err);
    return null;
  }
}

// ─── Génération du ZIP ────────────────────────────────────────────────────────

export interface ZipResult {
  buffer: Buffer;
  fileName: string;
  count: number;
}

export interface ZipLimitError {
  error: 'LIMIT_FILES' | 'LIMIT_SIZE' | 'NO_RESULTS';
  count?: number;
  maxFiles?: number;
}

/**
 * Génère une archive ZIP pour une liste d'épreuves (par IDs)
 */
export async function buildZipFromIds(ids: string[]): Promise<ZipResult | ZipLimitError> {
  if (!ids || ids.length === 0) {
    return { error: 'NO_RESULTS' };
  }
  if (ids.length > MAX_FILES) {
    return { error: 'LIMIT_FILES', count: ids.length, maxFiles: MAX_FILES };
  }

  // Fetch en parallèle (limité à 6 concurrent)
  const epreuves: (Epreuve | null)[] = await Promise.all(
    ids.map((id) => DataService.getEpreuveById(id).catch(() => null))
  );
  const valid = epreuves.filter(Boolean) as Epreuve[];
  if (valid.length === 0) return { error: 'NO_RESULTS' };

  return buildZipFromEpreuves(valid);
}

/**
 * Génère une archive ZIP à partir de filtres
 */
export async function buildZipFromFilters(filters: Partial<EpreuvesFilterParams>): Promise<ZipResult | ZipLimitError> {
  const result = await DataService.getEpreuves({
    ...filters,
    statut: 'approuve',
    page: 1,
    limit: MAX_FILES + 1,
  });

  if (result.total === 0 || result.epreuves.length === 0) {
    return { error: 'NO_RESULTS' };
  }
  if (result.total > MAX_FILES) {
    return { error: 'LIMIT_FILES', count: result.total, maxFiles: MAX_FILES };
  }

  return buildZipFromEpreuves(result.epreuves);
}

/**
 * Construit le ZIP depuis une liste d'épreuves
 */
async function buildZipFromEpreuves(epreuves: Epreuve[]): Promise<ZipResult | ZipLimitError> {
  const zip = new JSZip();
  let totalBytes = 0;
  let addedCount = 0;

  // Fichier README
  const now = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  zip.file('LISEZ-MOI.txt',
    `ANNALE229 — Plateforme d'Annales MBH (EPAC Bénin)\n` +
    `Archive générée le : ${now}\n` +
    `Nombre d'épreuves : ${epreuves.length}\n` +
    `\n` +
    `Les fichiers sont organisés par type d'épreuve.\n` +
    `Les PDF fusionnés (sujet + corrigé) contiennent d'abord le sujet puis le corrigé dans le même document.\n` +
    `\n` +
    `Site : https://annale229.vercel.app\n`
  );

  // Traitement concurrent (max 4 à la fois)
  const concurrency = 4;
  for (let i = 0; i < epreuves.length; i += concurrency) {
    const batch = epreuves.slice(i, i + concurrency);

    await Promise.all(batch.map(async (epreuve) => {
      const ext = epreuve.type_fichier?.toLowerCase() || 'pdf';
      const folder = epreuve.type === 'rattrapage' ? 'Rattrapages' : 'Devoirs';
      const base = sanitizeFilename(
        `${epreuve.matiere_nom}_${epreuve.type}_${epreuve.niveau}_${epreuve.annee_academique}`
      );

      const sujetBuffer = await fetchBuffer({
        s3Key: epreuve.s3_key,
        cloudinaryPublicId: epreuve.cloudinary_public_id,
        fallbackUrl: epreuve.cloudinary_url,
        ext,
      });

      if (!sujetBuffer) return; // skip si non récupérable

      // Tentative de fusion si corrigé PDF disponible
      if (epreuve.has_corrige && epreuve.corrige_url && ext === 'pdf' && epreuve.corrige_type_fichier === 'pdf') {
        const corrigeBuffer = await fetchBuffer({
          s3Key: epreuve.corrige_s3_key,
          cloudinaryPublicId: epreuve.corrige_cloudinary_public_id,
          fallbackUrl: epreuve.corrige_url,
          ext: 'pdf',
        });

        if (corrigeBuffer) {
          const merged = await mergePdfs(sujetBuffer, corrigeBuffer);
          if (merged) {
            totalBytes += merged.length;
            if (totalBytes > MAX_BYTES) return; // skip si archive trop lourde
            zip.folder(folder)!.file(`${base}_avec_corrige.pdf`, merged);
            addedCount++;
            return;
          }
        }
      }

      // Ajout du sujet seul
      totalBytes += sujetBuffer.length;
      if (totalBytes > MAX_BYTES) return;
      zip.folder(folder)!.file(`${base}.${ext}`, sujetBuffer);
      addedCount++;
    }));
  }

  if (addedCount === 0) return { error: 'NO_RESULTS' };

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Nom du fichier ZIP
  const firstEpreuve = epreuves[0];
  const zipName = `Annale229_${sanitizeFilename(firstEpreuve.matiere_nom || 'Pack')}_${Date.now()}.zip`;

  return { buffer: zipBuffer, fileName: zipName, count: addedCount };
}
