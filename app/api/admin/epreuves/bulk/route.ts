import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isUserAdminAsync } from '@/lib/utils/admin';
import { DataService } from '@/lib/storage/data-service';
import { StatutEpreuve } from '@/types';

/**
 * POST /api/admin/epreuves/bulk
 * Perform bulk actions on multiple epreuves.
 *
 * Body:
 * {
 *   ids: string[],           // array of epreuve IDs
 *   action: 'approuve' | 'rejete' | 'delete'
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userIsAdmin = await isUserAdminAsync(session?.user?.email);

  if (!session?.user?.email || !userIsAdmin) {
    return NextResponse.json(
      { error: 'Accès réservé aux administrateurs.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { ids, action } = body as { ids: string[]; action: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Aucun identifiant fourni.' },
        { status: 400 }
      );
    }

    if (!['approuve', 'rejete', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Action non reconnue. Valeurs acceptées : approuve, rejete, delete.' },
        { status: 400 }
      );
    }

    if (action === 'delete') {
      const bulkResult = await DataService.deleteEpreuvesAdminBulk(ids);
      return NextResponse.json({
        success: true,
        processed: ids.length,
        ...bulkResult,
      });
    } else {
      const updatedCount = await DataService.updateEpreuvesStatutBulk(ids, action as StatutEpreuve);
      return NextResponse.json({
        success: true,
        processed: ids.length,
        successCount: updatedCount,
        failCount: ids.length - updatedCount,
        results: ids.map((id) => ({ id, success: true })),
      });
    }
  } catch (error) {
    console.error('Erreur API POST /api/admin/epreuves/bulk:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'opération en masse.' },
      { status: 500 }
    );
  }
}
