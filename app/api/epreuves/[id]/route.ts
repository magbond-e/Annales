import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DataService } from '@/lib/storage/data-service';

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

    return NextResponse.json({ epreuve });
  } catch (error) {
    console.error('Erreur API GET /api/epreuves/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'épreuve.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    const result = await DataService.deleteEpreuve(id, session.user.email);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: 'Épreuve supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur API DELETE /api/epreuves/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'épreuve.' },
      { status: 500 }
    );
  }
}
