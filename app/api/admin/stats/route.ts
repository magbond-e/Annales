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
    const stats = await AdminService.getFullAdminStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erreur API GET /api/admin/stats:', error);
    return NextResponse.json({ error: 'Erreur récupération des statistiques.' }, { status: 500 });
  }
}
