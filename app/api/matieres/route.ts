import { NextResponse } from 'next/server';
import { DataService } from '@/lib/storage/data-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const matieres = await DataService.getMatieres();
    return NextResponse.json(
      { matieres },
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

