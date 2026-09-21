import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DataService } from '@/lib/storage/data-service';
import { isValidNiveau, VALID_NIVEAUX_PREDEFINIS } from '@/lib/utils/validation';
import { Profil } from '@/types';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const profil = await DataService.getProfil(session.user.email);
    return NextResponse.json({ profil });
  } catch (error) {
    console.error('Erreur API GET /api/profil:', error);
    return NextResponse.json({ error: 'Erreur lors de la lecture du profil' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { niveau } = body;

    if (!isValidNiveau(niveau)) {
      return NextResponse.json({ 
        error: `Niveau invalide. Valeurs acceptées : ${VALID_NIVEAUX_PREDEFINIS.join(', ')}.` 
      }, { status: 400 });
    }

    const profil: Profil = {
      email: session.user.email,
      nom: session.user.name || 'Étudiant MBH',
      niveau: niveau.trim(),
      created_at: new Date().toISOString(),
    };

    await DataService.upsertProfil(profil);

    return NextResponse.json({ success: true, profil });
  } catch (error) {
    console.error('Erreur API POST /api/profil:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement du profil' }, { status: 500 });
  }
}
