import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync, isSuperAdmin } from '@/lib/utils/admin';
import { AdminService } from '@/lib/storage/admin-service';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userIsAdmin = await isUserAdminAsync(session?.user?.email);
  if (!session?.user?.email || !userIsAdmin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
  }

  try {
    const users = await AdminService.getUsersList();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Erreur API GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Erreur récupération des utilisateurs.' }, { status: 500 });
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
    const { email, role, action } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Empêcher de rétrograder un compte admin principal fondateur
    if (isSuperAdmin(normalizedEmail) && role === 'etudiant') {
      return NextResponse.json(
        { error: 'Impossible de retirer les droits d\'administrateur au compte principal fondateur.' },
        { status: 400 }
      );
    }


    if (action === 'setRole' || role) {
      const targetRole = role === 'admin' ? 'admin' : 'etudiant';
      const success = await AdminService.setUserRole(normalizedEmail, targetRole);
      if (!success) {
        return NextResponse.json({ error: 'Échec de la modification du rôle.' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: `Rôle mis à jour pour ${normalizedEmail} : ${targetRole}`,
      });
    }

    return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erreur API POST /api/admin/users:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la gestion des utilisateurs.' },
      { status: 500 }
    );
  }
}
