import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync } from '@/lib/utils/admin';
import { DataService } from '@/lib/storage/data-service';
import { fetchCloudinaryBuffer, isCloudinaryConfigured } from '@/lib/storage/cloudinary-client';

export const dynamic = 'force-dynamic';

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

    const sanitize = (s: string) =>
      s.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');

    const ext = epreuve.type_fichier?.toLowerCase() === 'pdf' ? 'pdf' : (epreuve.type_fichier?.toLowerCase() || 'pdf');
    const fileName = `${sanitize(epreuve.matiere_nom)}_${epreuve.annee_academique}_${epreuve.type}.${ext}`;

    // 1. Si Cloudinary est configuré et que l'ID n'est pas un mock
    if (isCloudinaryConfigured() && epreuve.cloudinary_public_id && !epreuve.cloudinary_public_id.startsWith('mock_')) {
      const cldResult = await fetchCloudinaryBuffer(epreuve.cloudinary_public_id, ext);
      if (cldResult) {
        const uint8Array = new Uint8Array(cldResult.buffer);
        return new NextResponse(uint8Array, {
          headers: {
            'Content-Type': cldResult.contentType,
            'Content-Disposition': `inline; filename="${fileName}"`,
            'Content-Length': String(uint8Array.byteLength),
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      }
    }

    // 2. Si c'est une image mock ou une URL externe valide
    if (epreuve.cloudinary_url) {
      try {
        const fileRes = await fetch(epreuve.cloudinary_url);
        if (fileRes.ok) {
          const fileBuffer = await fileRes.arrayBuffer();
          const contentType = fileRes.headers.get('content-type') || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg');
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `inline; filename="${fileName}"`,
              'Content-Length': String(fileBuffer.byteLength),
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      } catch (fetchErr) {
        console.warn('Échec fetch URL directe:', fetchErr);
      }
    }

    return NextResponse.json(
      { error: 'Impossible de charger le contenu du fichier.' },
      { status: 502 }
    );
  } catch (error) {
    console.error('Erreur API /fichier:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la récupération du fichier.' },
      { status: 500 }
    );
  }
}