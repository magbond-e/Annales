import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync } from '@/lib/utils/admin';
import { DataService } from '@/lib/storage/data-service';
import { fetchCloudinaryBuffer, isCloudinaryConfigured } from '@/lib/storage/cloudinary-client';
import { getNeonStorageBuffer, isNeonStorageConfigured } from '@/lib/storage/s3-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/epreuves/[id]/corrige/fichier
 * Stream du corrigé pour affichage inline dans le navigateur (viewer intégré).
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

    const session = await getServerSession(authOptions);
    const currentUserEmail = session?.user?.email?.trim().toLowerCase();
    const userIsAdmin = currentUserEmail ? await isUserAdminAsync(currentUserEmail) : false;
    const isOwner = Boolean(currentUserEmail && epreuve.uploader_email?.toLowerCase() === currentUserEmail);

    // Une épreuve non approuvée (en attente ou rejetée) n'est accessible que par l'admin ou son auteur
    if (epreuve.statut !== 'approuve' && !userIsAdmin && !isOwner) {
      return NextResponse.json({ error: 'Épreuve introuvable.' }, { status: 404 });
    }

    if (!epreuve.has_corrige || !epreuve.corrige_url) {
      return NextResponse.json({ error: 'Aucun corrigé disponible pour cette épreuve.' }, { status: 404 });
    }

    const ext = epreuve.corrige_type_fichier?.toLowerCase() || 'pdf';
    const contentType = ext === 'pdf' ? 'application/pdf'
      : ext === 'jpg' ? 'image/jpeg'
        : ext === 'png' ? 'image/png'
          : 'application/octet-stream';

    // Essai 1 : S3 Neon Object Storage
    if (isNeonStorageConfigured() && epreuve.corrige_s3_key) {
      const buf = await getNeonStorageBuffer(epreuve.corrige_s3_key);
      if (buf) {
        const uint8Array = new Uint8Array(buf);
        return new NextResponse(uint8Array, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': 'inline',
            'Content-Length': String(buf.length),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // Essai 2 : Cloudinary
    if (isCloudinaryConfigured() && epreuve.corrige_cloudinary_public_id) {
      const cldResult = await fetchCloudinaryBuffer(epreuve.corrige_cloudinary_public_id, ext);
      if (cldResult) {
        const uint8Array = new Uint8Array(cldResult.buffer);
        return new NextResponse(uint8Array, {
          headers: {
            'Content-Type': cldResult.contentType,
            'Content-Disposition': 'inline',
            'Content-Length': String(cldResult.buffer.length),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // Essai 3 : URL publique directe
    const fileRes = await fetch(epreuve.corrige_url);
    if (fileRes.ok) {
      const buf = await fileRes.arrayBuffer();
      return new NextResponse(buf, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': 'inline',
        },
      });
    }

    return NextResponse.json({ error: 'Impossible de récupérer le corrigé.' }, { status: 502 });
  } catch (error) {
    console.error('Erreur GET /corrige/fichier:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}