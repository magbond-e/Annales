/**
 * auth-client.ts
 *
 * Conservé pour compatibilité — les fonctions Google Sheets/Drive
 * ont été remplacées par Neon + Cloudinary.
 *
 * Seule `isGoogleConfigured()` est maintenue comme stub retournant
 * toujours false, pour éviter toute erreur d'import résiduel.
 */

/** @deprecated Utiliser isNeonConfigured() depuis lib/db/neon.ts */
export function isGoogleConfigured(): boolean {
  return false;
}

/** @deprecated Plus utilisé — l'auth applicative passe par Neon + Cloudinary */
export function getGoogleAuthClient() {
  return null;
}
