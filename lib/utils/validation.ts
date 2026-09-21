import { TypeEpreuve, TypeFichier } from '@/types';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo

export const ALLOWED_FILE_EXTENSIONS: TypeFichier[] = ['pdf', 'jpg', 'png', 'heic'];

export const VALID_NIVEAUX_PREDEFINIS = [
  '1ère année',
  '2ème année',
  '3ème année',
];

export const VALID_TYPES: TypeEpreuve[] = ['devoir', 'rattrapage'];

/**
 * Normalise le nom d'une matière pour déduplication insensible à la casse
 */
export function normalizeMatiereNom(nom: string): string {
  return nom.trim().toLowerCase();
}

/**
 * Valide le format d'une année académique (ex: 2024-2025)
 */
export function isValidAcademicYear(year: string): boolean {
  if (!year) return false;
  const regex = /^\d{4}-\d{4}$/;
  if (!regex.test(year.trim())) return false;
  const [start, end] = year.trim().split('-').map(Number);
  return end === start + 1;
}

/**
 * Valide un nom de matière
 */
export function isValidMatiereNom(nom: string): { valid: boolean; error?: string } {
  const trimmed = nom?.trim() || '';
  if (trimmed.length < 2) {
    return { valid: false, error: 'Le nom de la matière doit comporter au moins 2 caractères.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Le nom de la matière ne peut pas dépasser 100 caractères.' };
  }
  return { valid: true };
}

/**
 * Valide le titre d'une épreuve (optionnel, max 150 caractères)
 */
export function isValidTitre(titre?: string): { valid: boolean; error?: string } {
  if (!titre) return { valid: true };
  const trimmed = titre.trim();
  if (trimmed.length > 150) {
    return { valid: false, error: 'Le titre ne peut pas dépasser 150 caractères.' };
  }
  return { valid: true };
}

/**
 * Valide si un niveau fait partie de la liste blanche autorisée
 */
export function isValidNiveau(niveau?: string): boolean {
  if (!niveau || typeof niveau !== 'string') return false;
  return VALID_NIVEAUX_PREDEFINIS.includes(niveau.trim());
}

/**
 * Valide le type de fichier et retourne son extension canonique
 */
export function getCanonicalFileType(filename: string, mimeType?: string): TypeFichier | null {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (ext === 'jpg' || ext === 'jpeg' || mimeType === 'image/jpeg') return 'jpg';
  if (ext === 'png' || mimeType === 'image/png') return 'png';
  if (ext === 'heic' || mimeType === 'image/heic') return 'heic';
  return null;
}

/**
 * Vérifie la signature binaire réelle (Magic Bytes) d'un fichier.
 * Ne fait JAMAIS confiance à l'extension déclarée ou au header Content-Type client.
 */
export function detectMagicBytes(buffer: Buffer | Uint8Array): TypeFichier | null {
  if (!buffer || buffer.length < 4) return null;

  const b = buffer instanceof Buffer ? buffer : Buffer.from(buffer);

  // 1. PDF : commence par %PDF (0x25 0x50 0x44 0x46)
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return 'pdf';
  }

  // 2. JPEG : commence par FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'jpg';
  }

  // 3. PNG : commence par 89 50 4E 47 0D 0A 1A 0A
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return 'png';
  }

  // 4. HEIC / HEIF : conteneur ISO BMFF avec boîte ftyp (octets 4 à 7 valant 'ftyp')
  if (
    b.length >= 12 &&
    b[4] === 0x66 && // 'f'
    b[5] === 0x74 && // 't'
    b[6] === 0x79 && // 'y'
    b[7] === 0x70    // 'p'
  ) {
    const brand = b.toString('ascii', 8, 12).toLowerCase();
    if (['heic', 'heix', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return 'heic';
    }
  }

  return null;
}

/**
 * Valide complètement un fichier reçu côté serveur :
 * 1. Taille non nulle et <= 15 Mo
 * 2. Signature binaire réelle (Magic Bytes)
 * 3. Cohérence entre l'extension déclarée et le contenu binaire réel
 */
export function validateUploadedFile(
  fileName: string,
  buffer: Buffer,
  declaredMime?: string
): { valid: boolean; type?: TypeFichier; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Fichier vide ou corrompu.' };
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'La taille du fichier ne doit pas dépasser 15 Mo.' };
  }

  const detectedType = detectMagicBytes(buffer);
  if (!detectedType) {
    return {
      valid: false,
      error: 'Format binaire non reconnu ou non autorisé. Seuls les fichiers PDF et images (JPG, PNG, HEIC) authentiques sont acceptés.',
    };
  }

  const extensionType = getCanonicalFileType(fileName, declaredMime);
  if (extensionType && extensionType !== detectedType) {
    // Rejet strict de toute tentative de déguisement de binaire en PDF
    if (detectedType === 'pdf' || extensionType === 'pdf') {
      return {
        valid: false,
        error: 'Incohérence critique entre l\'extension du fichier et sa signature binaire réelle.',
      };
    }
  }

  return { valid: true, type: detectedType };
}

