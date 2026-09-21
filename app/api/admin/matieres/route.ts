import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync } from '@/lib/utils/admin';
import { AdminService } from '@/lib/storage/admin-service';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userIsAdmin = await isUserAdminAsync(session?.user?.email);
  if (!session?.user?.email || !userIsAdmin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
  }

  try {
    const matieres = await AdminService.getMatieresWithStats();
    return NextResponse.json({ success: true, matieres });
  } catch (error) {
    console.error('Erreur API GET /api/admin/matieres:', error);
    return NextResponse.json({ error: 'Erreur récupération des matières.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userIsAdmin = await isUserAdminAsync(session?.user?.email);
  if (!session?.user?.email || !userIsAdmin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const nom = body.nom?.trim();

    if (!nom || nom.length < 2) {
      return NextResponse.json(
        { error: 'Le nom de la matière doit comporter au moins 2 caractères.' },
        { status: 400 }
      );
    }

    const matiere = await AdminService.addMatiere(nom, session.user.email);
    return NextResponse.json({ success: true, matiere });
  } catch (error) {
    console.error('Erreur API POST /api/admin/matieres:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la matière.' },
      { status: 500 }
    );
  }
}
