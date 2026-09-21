import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DataService } from '@/lib/storage/data-service';
import { 
  isValidAcademicYear, 
  isValidMatiereNom, 
  isValidTitre,
  isValidNiveau,
  VALID_NIVEAUX_PREDEFINIS,
  MAX_FILE_SIZE_BYTES, 
  getCanonicalFileType,
  validateUploadedFile,
  VALID_TYPES 
} from '@/lib/utils/validation';
import { TypeEpreuve } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserEmail = session?.user?.email?.trim().toLowerCase();
    const { isUserAdminAsync } = await import('@/lib/utils/admin');
    const userIsAdmin = currentUserEmail ? await isUserAdminAsync(currentUserEmail) : false;

    const { searchParams } = new URL(req.url);
    const niveau = searchParams.get('niveau') || undefined;
    const matiere = searchParams.get('matiere') || undefined;
    const annee = searchParams.get('annee') || undefined;
    const type = searchParams.get('type') || undefined;
    const q = searchParams.get('q') || undefined;
    const rawUploaderEmail = searchParams.get('uploader_email') || undefined;

    // Protection anti-scraping / énumération : le filtre uploader_email n'est accessible qu'à l'admin ou à l'auteur
    let uploader_email: string | undefined = undefined;
    if (rawUploaderEmail) {
      const targetEmail = rawUploaderEmail.trim().toLowerCase();
      if (userIsAdmin || (currentUserEmail && currentUserEmail === targetEmail)) {
        uploader_email = targetEmail;
      } else {
        return NextResponse.json(
          { error: 'Non autorisé à filtrer par cette adresse email.' },
          { status: 403 }
        );
      }
    }

    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    // Borner strictement limit pour prévenir l'extraction massive et les attaques DoS
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 50);

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

    // Masquage systématique de uploader_email pour toute personne qui n'est ni admin ni propriétaire
    const sanitizedEpreuves = result.epreuves.map((epreuve) => {
      const isOwner = Boolean(currentUserEmail && epreuve.uploader_email.toLowerCase() === currentUserEmail);
      if (userIsAdmin || isOwner) {
        return epreuve;
      }
      return {
        ...epreuve,
        uploader_email: '', // masqué pour protéger la vie privée des étudiants
      };
    });

    return NextResponse.json({
      ...result,
      epreuves: sanitizedEpreuves,
    });
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
    const titre = (formData.get('titre') as string)?.trim() || '';
    const file = formData.get('file') as File | null;

    // Validation Titre (max 150 caractères)
    const titreCheck = isValidTitre(titre);
    if (!titreCheck.valid) {
      return NextResponse.json({ error: titreCheck.error || 'Titre invalide.' }, { status: 400 });
    }

    // Validation Matière
    const matiereCheck = isValidMatiereNom(matiereNom);
    if (!matiereCheck.valid) {
      return NextResponse.json({ error: matiereCheck.error || 'Matière invalide.' }, { status: 400 });
    }

    // Validation Niveau (liste blanche stricte)
    if (!isValidNiveau(niveau)) {
      return NextResponse.json({ 
        error: `Niveau invalide. Valeurs acceptées : ${VALID_NIVEAUX_PREDEFINIS.join(', ')}.` 
      }, { status: 400 });
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

    // Conversion en Buffer pour vérification de signature binaire réelle et stockage
    const bytes = await primaryFile.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);

    const primaryValidation = validateUploadedFile(primaryFile.name, fileBuffer, primaryFile.type);
    if (!primaryValidation.valid) {
      return NextResponse.json({ error: primaryValidation.error }, { status: 400 });
    }

    // Fichier corrigé optionnel
    const corrigeFile = (formData.get('corrige_file') || formData.get('corrige')) as File | null;
    let corrigeBuffer: Buffer | null = null;
    if (corrigeFile && corrigeFile.size > 0) {
      const cBytes = await corrigeFile.arrayBuffer();
      corrigeBuffer = Buffer.from(cBytes);
      const corrigeValidation = validateUploadedFile(corrigeFile.name, corrigeBuffer, corrigeFile.type);
      if (!corrigeValidation.valid) {
        return NextResponse.json({ error: `Corrigé invalide : ${corrigeValidation.error}` }, { status: 400 });
      }
    }

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

    // Association automatique du corrigé si fourni et validé
    if (corrigeFile && corrigeBuffer && corrigeBuffer.length > 0) {
      try {
        createdEpreuve = await DataService.addCorrige({
          epreuveId: createdEpreuve.id,
          fileBuffer: corrigeBuffer,
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
