import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/storage/data-service';
import { fetchCloudinaryBuffer, isCloudinaryConfigured } from '@/lib/storage/cloudinary-client';
import { getNeonStorageBuffer, isNeonStorageConfigured } from '@/lib/storage/s3-client';

export const dynamic = 'force-dynamic';

function sanitize(s: string): string {
  return s.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * GET /api/epreuves/[id]/corrige/telecharger
 * Téléchargement direct du corrigé seul sous forme d'attachement.
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
    if (!epreuve.has_corrige || !epreuve.corrige_url) {
      return NextResponse.json({ error: 'Aucun corrigé disponible pour cette épreuve.' }, { status: 404 });
    }

    const ext = epreuve.corrige_type_fichier?.toLowerCase() || 'pdf';
    const baseName = `${sanitize(epreuve.matiere_nom)}_${epreuve.annee_academique}_${epreuve.type}_corrige.${ext}`;
    const contentType = ext === 'pdf' ? 'application/pdf'
      : ext === 'jpg' ? 'image/jpeg'
        : ext === 'png' ? 'image/png'
          : 'application/octet-stream';

    // 1. Neon S3
    if (isNeonStorageConfigured() && epreuve.corrige_s3_key) {
      const buf = await getNeonStorageBuffer(epreuve.corrige_s3_key);
      if (buf) {
        const uint8Array = new Uint8Array(buf);
        return new NextResponse(uint8Array, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${baseName}"`,
            'Content-Length': String(buf.length),
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // 2. Cloudinary
    if (isCloudinaryConfigured() && epreuve.corrige_cloudinary_public_id) {
      const cldResult = await fetchCloudinaryBuffer(epreuve.corrige_cloudinary_public_id, ext);
      if (cldResult) {
        const uint8Array = new Uint8Array(cldResult.buffer);
        return new NextResponse(uint8Array, {
          headers: {
            'Content-Type': cldResult.contentType,
            'Content-Disposition': `attachment; filename="${baseName}"`,
            'Content-Length': String(cldResult.buffer.length),
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // 3. Fallback direct URL
    const res = await fetch(epreuve.corrige_url);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${baseName}"`,
          'Content-Length': String(arrayBuffer.byteLength),
          'Cache-Control': 'no-cache',
        },
      });
    }

    return NextResponse.json({ error: 'Impossible de télécharger le fichier corrigé.' }, { status: 502 });
  } catch (error) {
    console.error('Erreur GET /corrige/telecharger:', error);
    return NextResponse.json({ error: 'Erreur lors du téléchargement.' }, { status: 500 });
  }
}