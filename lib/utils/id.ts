import crypto from 'crypto';

/**
 * Génère une chaîne alphanumérique aléatoire de longueur donnée
 */
function randomAlphanumeric(length: number = 6): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Génère un identifiant pour une matière (ex: m_a1b2c3)
 */
export function generateMatiereId(): string {
  return `m_${randomAlphanumeric(6)}`;
}

/**
 * Génère un identifiant pour une épreuve (ex: e_f4g5h6)
 */
export function generateEpreuveId(): string {
  return `e_${randomAlphanumeric(6)}`;
}
