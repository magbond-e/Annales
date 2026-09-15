import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DataService } from '@/lib/storage/data-service';
import { isUserAdminAsync } from '@/lib/utils/admin';
import { MAX_FILE_SIZE_BYTES, getCanonicalFileType } from '@/lib/utils/validation';

/**
 * POST /api/epreuves/[id]/corrige
 * Téléverse un corrigé (PDF ou image) associé à une épreuve.
 * Accès : admin toujours ; étudiant connecté si aucun corrigé n'existe encore.
 */
type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const { id: epreuveId } = await context.params;
  const userIsAdmin = await isUserAdminAsync(session.user.email);

  // Vérification de l'épreuve
  let epreuve;
  try {
    epreuve = await DataService.getEpreuveById(epreuveId);
  } catch {
    return NextResponse.json({ error: 'Épreuve introuvable.' }, { status: 404 });
  }
  if (!epreuve) {
    return NextResponse.json({ error: 'Épreuve introuvable.' }, { status: 404 });
  }

  // Si un corrigé existe déjà, seul un admin peut le remplacer
  if (epreuve.has_corrige && !userIsAdmin) {
    return NextResponse.json(
      { error: 'Un corrigé existe déjà. Seul un administrateur peut le remplacer.' },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Veuillez sélectionner un fichier.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 15 Mo.' }, { status: 400 });
    }

    const canonicalType = getCanonicalFileType(file.name, file.type);
    if (!canonicalType) {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez PDF, JPG, PNG ou HEIC.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);

    const updatedEpreuve = await DataService.addCorrige({
      epreuveId,
      fileBuffer,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
    });

    return NextResponse.json({ success: true, epreuve: updatedEpreuve });
  } catch (error) {
    console.error('Erreur POST /api/epreuves/[id]/corrige:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors du téléversement du corrigé.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/epreuves/[id]/corrige
 * Supprime le corrigé d'une épreuve. Accès : admin uniquement.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const session = await getServerSession(authOptions);
  const userIsAdmin = await isUserAdminAsync(session?.user?.email);
  if (!session?.user?.email || !userIsAdmin) {
    return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await DataService.deleteCorrige(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/epreuves/[id]/corrige:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du corrigé.' },
      { status: 500 }
    );
  }
}
