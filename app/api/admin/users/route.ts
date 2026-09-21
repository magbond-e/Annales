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
    const callerEmail = session?.user?.email?.trim().toLowerCase();

    // 1. Protection STRICTE et ABSOLUE du Fondateur
    if (isSuperAdmin(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Action interdite' },
        { status: 403 }
      );
    }

    // 2. Seul le Super Administrateur (Fondateur) peut modifier les rôles (promouvoir ou rétrograder)
    if (!isSuperAdmin(callerEmail)) {
      return NextResponse.json(
        { error: 'Action non autorisée : Seul le Super Administrateur (Fondateur) a le pouvoir de nommer ou rétrograder des administrateurs.' },
        { status: 403 }
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
  } catch (error) {
    console.error('Erreur API POST /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la gestion des utilisateurs.' },
      { status: 500 }
    );
  }
}
