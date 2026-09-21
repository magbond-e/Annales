/**
 * Helper d'autorisation administrateur pour Annale229 MBH
 *
 * La liste des administrateurs est gérée UNIQUEMENT via les variables d'environnement :
 *   ADMIN_EMAIL  — un email admin principal
 *   ADMIN_EMAILS — liste d'emails admins séparés par virgule
 *   SUPER_ADMIN_EMAIL — email du super-admin fondateur (ne peut pas être rétrogradé)
 *
 * ⚠️ Ne jamais hardcoder d'emails dans ce fichier.
 */

/**
 * Récupère l'ensemble des adresses emails administrateurs configurées via env vars.
 */
export function getStaticAdminEmails(): Set<string> {
  const emails = new Set<string>();

  // ADMIN_EMAIL simple
  if (process.env.ADMIN_EMAIL) {
    emails.add(process.env.ADMIN_EMAIL.trim().toLowerCase());
  }

  // ADMIN_EMAILS séparés par virgule
  if (process.env.ADMIN_EMAILS) {
    process.env.ADMIN_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => emails.add(e));
  }

  // SUPER_ADMIN_EMAIL
  if (process.env.SUPER_ADMIN_EMAIL) {
    emails.add(process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase());
  }

  return emails;
}

/**
 * Vérifie si un compte est un Super Admin fondateur (ne peut pas être rétrogradé).
 * Vérifie SUPER_ADMIN_EMAIL, SUPER_ADMIN_EMAILS (liste),
 * et ADMIN_EMAIL comme dernier recours.
 */
export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  // Construire la liste complète des super-admins depuis les variables d'env
  const superAdminEmails = new Set<string>();

  // Variable unique
  const single = process.env.SUPER_ADMIN_EMAIL;
  if (single) {
    superAdminEmails.add(single.trim().toLowerCase());
  }

  // Variable liste séparée par virgule (optionnel)
  if (process.env.SUPER_ADMIN_EMAILS) {
    process.env.SUPER_ADMIN_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => superAdminEmails.add(e));
  }

  // ADMIN_EMAIL comme dernier recours si rien d'autre n'est défini
  if (superAdminEmails.size === 0 && process.env.ADMIN_EMAIL) {
    superAdminEmails.add(process.env.ADMIN_EMAIL.trim().toLowerCase());
  }

  return superAdminEmails.has(normalized);
}

/**
 * Vérifie de manière synchrone si une adresse email fait partie des administrateurs statiques.
 */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getStaticAdminEmails().has(normalized);
}

/**
 * Vérifie de manière asynchrone (liste statique ou rôle 'admin' en base de données Neon).
 */
export async function isUserAdminAsync(email?: string | null): Promise<boolean> {
  if (isAdmin(email)) return true;
  try {
    const { AdminService } = await import('@/lib/storage/admin-service');
    return await AdminService.isEmailAdmin(email);
  } catch (err) {
    console.error('Erreur isUserAdminAsync:', err);
    return false;
  }
}
