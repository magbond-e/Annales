import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/storage/data-service';
import { fetchCloudinaryBuffer, isCloudinaryConfigured } from '@/lib/storage/cloudinary-client';
import { getNeonStorageBuffer, isNeonStorageConfigured } from '@/lib/storage/s3-client';

export const dynamic = 'force-dynamic';

/**
 * Normalise un nom de fichier (retire accents et caractères spéciaux)
 */
function sanitize(s: string): string {
  return s.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Récupère un Buffer pour une épreuve ou un corrigé depuis S3 puis Cloudinary puis URL directe
 */
async function fetchBuffer(params: {
  s3Key?: string;
  cloudinaryPublicId?: string;
  fallbackUrl?: string;
  ext: string;
}): Promise<Buffer | null> {
  // 1. Neon S3
  if (isNeonStorageConfigured() && params.s3Key) {
    const buf = await getNeonStorageBuffer(params.s3Key);
    if (buf) return buf;
  }
  // 2. Cloudinary
  if (isCloudinaryConfigured() && params.cloudinaryPublicId && !params.cloudinaryPublicId.startsWith('mock_')) {
    const cld = await fetchCloudinaryBuffer(params.cloudinaryPublicId, params.ext);
    if (cld) return cld.buffer;
  }
  // 3. URL directe
  if (params.fallbackUrl) {
    try {
      const res = await fetch(params.fallbackUrl);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * GET /api/epreuves/[id]/telecharger
 *
 * Si l'épreuve possède un corrigé :
 *   → Les deux PDF sont fusionnés en un seul document téléchargeable (Sujet + Corrigé)
 *
 * Si seulement le sujet :
 *   → Téléchargement direct du sujet (comportement antérieur)
 */
type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const epreuve = await DataService.getEpreuveById(id);

    if (!epreuve) {
      return NextResponse.json({ error: 'Épreuve introuvable.' }, { status: 404 });
    }

    // Incrémentation asynchrone non-bloquante du compteur
    DataService.incrementDownloadCount(id).catch((err) => {
      console.error('Erreur incrémentation téléchargements:', err);
    });

    const ext = epreuve.type_fichier?.toLowerCase() === 'pdf' ? 'pdf' : (epreuve.type_fichier?.toLowerCase() || 'pdf');
    const baseName = `${sanitize(epreuve.matiere_nom)}_${epreuve.annee_academique}_${epreuve.type}`;

    const sujetBuffer = await fetchBuffer({
      s3Key: epreuve.s3_key,
      cloudinaryPublicId: epreuve.cloudinary_public_id,
      fallbackUrl: epreuve.cloudinary_url,
      ext,
    });

    if (!sujetBuffer) {
      return NextResponse.json({ error: 'Impossible de récupérer le fichier.' }, { status: 502 });
    }

    // ─── Fusion PDF sujet + corrigé ──────────────────────────────────────────
    if (epreuve.has_corrige && epreuve.corrige_url && ext === 'pdf') {
      const corrigeExt = epreuve.corrige_type_fichier?.toLowerCase() || 'pdf';

      if (corrigeExt === 'pdf') {
        const corrigeBuffer = await fetchBuffer({
          s3Key: epreuve.corrige_s3_key,
          cloudinaryPublicId: epreuve.corrige_cloudinary_public_id,
          fallbackUrl: epreuve.corrige_url,
          ext: corrigeExt,
        });

        if (corrigeBuffer) {
          try {
            const { PDFDocument } = await import('pdf-lib');

            const sujetDoc = await PDFDocument.load(sujetBuffer);
            const corrigeDoc = await PDFDocument.load(corrigeBuffer);
            const mergedDoc = await PDFDocument.create();

            // Copier toutes les pages du sujet
            const sujetPages = await mergedDoc.copyPages(sujetDoc, sujetDoc.getPageIndices());
            sujetPages.forEach((page) => mergedDoc.addPage(page));

            // Copier toutes les pages du corrigé
            const corrigePages = await mergedDoc.copyPages(corrigeDoc, corrigeDoc.getPageIndices());
            corrigePages.forEach((page) => mergedDoc.addPage(page));

            const mergedBytes = await mergedDoc.save();
            const mergedUint8 = new Uint8Array(mergedBytes);
            const downloadName = `${baseName}_avec_corrige.pdf`;

            return new NextResponse(mergedUint8, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${downloadName}"`,
                'Content-Length': String(mergedUint8.byteLength),
                'Cache-Control': 'no-cache',
              },
            });
          } catch (pdfErr) {
            console.error('Erreur fusion PDF sujet+corrigé (fallback sujet seul):', pdfErr);
            // Si la fusion échoue (PDF corrompu, etc.), on livre le sujet seul
          }
        }
      }
    }

    // ─── Téléchargement du sujet seul ────────────────────────────────────────
    const downloadName = `${baseName}.${ext}`;
    const contentType = ext === 'pdf' ? 'application/pdf'
      : ext === 'jpg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : 'application/octet-stream';

    const sujetUint8 = new Uint8Array(sujetBuffer);
    return new NextResponse(sujetUint8, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': String(sujetUint8.byteLength),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Erreur API /telecharger:', error);
    return NextResponse.json(
      { error: 'Impossible de lancer le téléchargement.' },
      { status: 500 }
    );
  }
}
