import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync } from '@/lib/utils/admin';
import { AdminService } from '@/lib/storage/admin-service';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

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
    const res = await AdminService.deleteMatiere(id);

    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Impossible de supprimer cette matière.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Matière supprimée avec succès.' });
  } catch (error: any) {
    console.error('Erreur API DELETE /api/admin/matieres/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur lors de la suppression de la matière.' },
      { status: 500 }
    );
  }
}
