import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync } from '@/lib/utils/admin';
import { DataService } from '@/lib/storage/data-service';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userIsAdmin = await isUserAdminAsync(session?.user?.email);
  if (!session?.user?.email || !userIsAdmin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statut = (searchParams.get('statut') as any) || 'all';
    const niveau = searchParams.get('niveau') || undefined;
    const matiere = searchParams.get('matiere') || undefined;
    const annee = searchParams.get('annee') || undefined;
    const type = searchParams.get('type') || undefined;
    const q = searchParams.get('q') || undefined;
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);

    const result = await DataService.getEpreuves({
      statut,
      niveau,
      matiere,
      annee,
      type,
      q,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur API GET /api/admin/epreuves:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des épreuves admin.' },
      { status: 500 }
    );
  }
}
