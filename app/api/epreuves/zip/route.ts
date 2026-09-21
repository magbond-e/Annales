import { NextRequest, NextResponse } from 'next/server';
import { buildZipFromFilters, buildZipFromIds } from '@/lib/storage/zip-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync } from '@/lib/utils/admin';

export const dynamic = 'force-dynamic';
// Les ZIPs peuvent être lourds : augmenter le timeout de la route Next.js
export const maxDuration = 60;

/**
 * GET /api/epreuves/zip?matiere=...&niveau=...&annee=...&type=...
 * Génère et télécharge un ZIP des épreuves correspondant aux filtres.
 * Accessible sans authentification (épreuves approuvées uniquement).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matiere = searchParams.get('matiere') || undefined;
    const niveau  = searchParams.get('niveau')  || undefined;
    const annee   = searchParams.get('annee')   || undefined;
    const type    = searchParams.get('type')    || undefined;
    const q       = searchParams.get('q')       || undefined;

    if (!matiere && !niveau && !annee && !type && !q) {
      return NextResponse.json(
        { error: 'Veuillez préciser au moins un filtre (matière, niveau, année, type) pour générer un pack ZIP.' },
        { status: 400 }
      );
    }

    const result = await buildZipFromFilters({ matiere, niveau, annee, type, q });

    if ('error' in result) {
      if (result.error === 'NO_RESULTS') {
        return NextResponse.json({ error: 'Aucune épreuve ne correspond à ces filtres.' }, { status: 404 });
      }
      if (result.error === 'LIMIT_FILES') {
        return NextResponse.json(
          {
            error: `Votre sélection contient ${result.count} épreuves, soit plus que la limite de ${result.maxFiles} par archive. Affinez vos filtres (matière, niveau, année).`,
          },
          { status: 400 }
        );
      }
    }

    const { buffer, fileName } = result as { buffer: Buffer; fileName: string; count: number };
    const uint8GET = new Uint8Array(buffer);
    return new NextResponse(uint8GET, {
      headers: {
        'Content-Type':        'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length':      String(uint8GET.byteLength),
        'Cache-Control':       'no-cache',
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/epreuves/zip:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération de l\'archive ZIP.' }, { status: 500 });
  }
}

/**
 * POST /api/epreuves/zip
 * Body: { ids: string[] }
 * Génère un ZIP des épreuves dont les IDs sont fournis.
 * Utilisé par l'interface admin pour l'export de sélections multiples.
 * Accès : admin uniquement.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdminAsync(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Accès réservé aux administrateurs.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawIds = Array.isArray(body.ids) ? body.ids : [];
    const ids: string[] = rawIds
      .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id: string) => id.trim());

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Aucun identifiant valide fourni.' }, { status: 400 });
    }

    const result = await buildZipFromIds(ids);

    if ('error' in result) {
      if (result.error === 'NO_RESULTS') {
        return NextResponse.json({ error: 'Aucune épreuve valide trouvée.' }, { status: 404 });
      }
      if (result.error === 'LIMIT_FILES') {
        return NextResponse.json(
          {
            error: `Sélection trop grande (${result.count} épreuves). Maximum : ${result.maxFiles} par archive. Faites plusieurs exports.`,
          },
          { status: 400 }
        );
      }
    }

    const { buffer, fileName } = result as { buffer: Buffer; fileName: string; count: number };
    const uint8POST = new Uint8Array(buffer);
    return new NextResponse(uint8POST, {
      headers: {
        'Content-Type':        'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length':      String(uint8POST.byteLength),
        'Cache-Control':       'no-cache',
      },
    });
  } catch (error) {
    console.error('Erreur POST /api/epreuves/zip:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération de l\'archive ZIP.' }, { status: 500 });
  }
}
