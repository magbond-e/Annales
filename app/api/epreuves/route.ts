import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DataService } from '@/lib/storage/data-service';
import { 
  isValidAcademicYear, 
  isValidMatiereNom, 
  MAX_FILE_SIZE_BYTES, 
  getCanonicalFileType,
  VALID_TYPES 
} from '@/lib/utils/validation';
import { TypeEpreuve } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const niveau = searchParams.get('niveau') || undefined;
    const matiere = searchParams.get('matiere') || undefined;
    const annee = searchParams.get('annee') || undefined;
    const type = searchParams.get('type') || undefined;
    const q = searchParams.get('q') || undefined;
    const uploader_email = searchParams.get('uploader_email') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await DataService.getEpreuves({
      niveau,
      matiere,
      annee,
      type,
      q,
      uploader_email,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur API GET /api/epreuves:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des épreuves.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Vous devez être connecté pour déposer une épreuve.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const matiereNom = formData.get('matiere_nom') as string;
    const niveau = formData.get('niveau') as string;
    const anneeAcademique = formData.get('annee_academique') as string;
    const type = formData.get('type') as string;
    const titre = (formData.get('titre') as string) || '';
    const file = formData.get('file') as File | null;

    // Validation Matière
    const matiereCheck = isValidMatiereNom(matiereNom);
    if (!matiereCheck.valid) {
      return NextResponse.json({ error: matiereCheck.error || 'Matière invalide.' }, { status: 400 });
    }

    // Validation Niveau
    if (!niveau || !niveau.trim()) {
      return NextResponse.json({ error: 'Le niveau est obligatoire.' }, { status: 400 });
    }

    // Validation Année académique
    if (!isValidAcademicYear(anneeAcademique)) {
      return NextResponse.json({ error: 'L\'année académique doit être au format AAAA-AAAA (ex: 2024-2025).' }, { status: 400 });
    }

    // Validation Type
    if (!VALID_TYPES.includes(type as TypeEpreuve)) {
      return NextResponse.json({ error: 'Le type doit être Devoir ou Rattrapage.' }, { status: 400 });
    }

    // Fichier principal
    let primaryFile = file;
    const allFiles = formData.getAll('files') as File[];
    if ((!primaryFile || primaryFile.size === 0) && allFiles.length > 0) {
      if (allFiles.length === 1) {
        primaryFile = allFiles[0];
      } else {
        const { mergeFilesToPdf } = await import('@/lib/utils/pdf-merger');
        primaryFile = await mergeFilesToPdf(allFiles, `${titre || matiereNom}_epreuve.pdf`);
      }
    }

    if (!primaryFile || primaryFile.size === 0) {
      return NextResponse.json({ error: 'Veuillez sélectionner un fichier (photo ou PDF).' }, { status: 400 });
    }

    if (primaryFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'La taille du fichier ne doit pas dépasser 15 Mo.' }, { status: 400 });
    }

    const canonicalType = getCanonicalFileType(primaryFile.name, primaryFile.type);
    if (!canonicalType) {
      return NextResponse.json({ error: 'Format de fichier non supporté. Utilisez PDF, JPG, PNG ou HEIC.' }, { status: 400 });
    }

    // Fichier corrigé optionnel
    const corrigeFile = (formData.get('corrige_file') || formData.get('corrige')) as File | null;
    if (corrigeFile && corrigeFile.size > 0) {
      if (corrigeFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'La taille du corrigé ne doit pas dépasser 15 Mo.' }, { status: 400 });
      }
      const canonicalCorrigeType = getCanonicalFileType(corrigeFile.name, corrigeFile.type);
      if (!canonicalCorrigeType) {
        return NextResponse.json({ error: 'Format du corrigé non supporté. Utilisez PDF, JPG, PNG ou HEIC.' }, { status: 400 });
      }
    }

    // Conversion en Buffer pour le stockage
    const bytes = await primaryFile.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);

    let createdEpreuve = await DataService.createEpreuve({
      matiereNom,
      niveau: niveau.trim(),
      anneeAcademique: anneeAcademique.trim(),
      type,
      titre,
      fileBuffer,
      fileName: primaryFile.name,
      mimeType: primaryFile.type || 'application/octet-stream',
      uploaderEmail: session.user.email,
      uploaderNom: session.user.name || 'Étudiant MBH',
    });

    // Association automatique du corrigé si fourni
    if (corrigeFile && corrigeFile.size > 0) {
      try {
        const cBytes = await corrigeFile.arrayBuffer();
        createdEpreuve = await DataService.addCorrige({
          epreuveId: createdEpreuve.id,
          fileBuffer: Buffer.from(cBytes),
          fileName: corrigeFile.name,
          mimeType: corrigeFile.type || 'application/octet-stream',
          fileSize: corrigeFile.size,
        });
      } catch (cErr) {
        console.error('Erreur attachement automatique corrigé:', cErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: createdEpreuve.id,
      epreuve: createdEpreuve,
    });
  } catch (error) {
    console.error('Erreur API POST /api/epreuves:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'enregistrement de l\'épreuve.' },
      { status: 500 }
    );
  }
}
