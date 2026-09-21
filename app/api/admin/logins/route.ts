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
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || undefined;
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);

    const logs = await AdminService.getLoginHistory(email, limit);
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Erreur API GET /api/admin/logins:', error);
    return NextResponse.json({ error: 'Erreur récupération des historiques de connexion.' }, { status: 500 });
  }
}
