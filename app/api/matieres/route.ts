import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DataService } from '@/lib/storage/data-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const currentUserEmail = session?.user?.email?.trim().toLowerCase();
    const { isUserAdminAsync } = await import('@/lib/utils/admin');
    const userIsAdmin = currentUserEmail ? await isUserAdminAsync(currentUserEmail) : false;

    const matieres = await DataService.getMatieres();

    // Masquage systématique de created_by_email pour tout appelant non-administrateur
    const sanitizedMatieres = matieres.map((m) => {
      if (userIsAdmin) return m;
      return {
        id: m.id,
        nom: m.nom,
        created_at: m.created_at,
        created_by_email: '', // masqué pour protéger la confidentialité des créateurs
      };
    });

    return NextResponse.json(
      { matieres: sanitizedMatieres },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Erreur API GET /api/matieres:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer la liste des matières.' },
      { status: 500 }
    );
  }
}

