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
