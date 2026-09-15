import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync } from '@/lib/utils/admin';
import { AdminService } from '@/lib/storage/admin-service';
import { DataService } from '@/lib/storage/data-service';
import { StatutEpreuve, TypeEpreuve } from '@/types';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const session = await getServerSession(authOptions);
  const userIsAdmin = await isUserAdminAsync(session?.user?.email);
  if (!session?.user?.email || !userIsAdmin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();

    const updated = await AdminService.updateEpreuveDetails(id, {
      titre: body.titre,
      matiereNom: body.matiereNom,
      niveau: body.niveau,
      anneeAcademique: body.anneeAcademique,
      type: body.type as TypeEpreuve,
      statut: body.statut as StatutEpreuve,
      uploaderNom: body.uploaderNom,
      uploaderEmail: body.uploaderEmail,
    });

    if (!updated) {
      // Fallback si pas de résultat SQL
      if (body.statut) {
        await DataService.updateEpreuveStatut(id, body.statut);
      }
      const fallbackUpdated = await DataService.getEpreuveById(id);
      return NextResponse.json({ success: true, epreuve: fallbackUpdated });
    }

    return NextResponse.json({ success: true, epreuve: updated });
  } catch (error) {
    console.error('Erreur API PATCH /api/admin/epreuves/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'épreuve.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const session = await getServerSession(authOptions);
  const userIsAdmin = await isUserAdminAsync(session?.user?.email);
  if (!session?.user?.email || !userIsAdmin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const success = await DataService.deleteEpreuveAdmin(id);

    if (!success) {
      return NextResponse.json({ error: 'Épreuve introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Épreuve supprimée avec succès par l\'administrateur.' });
  } catch (error) {
    console.error('Erreur API DELETE /api/admin/epreuves/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression admin.' },
      { status: 500 }
    );
  }
}
