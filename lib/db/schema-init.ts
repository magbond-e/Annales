import { sql, isNeonConfigured } from './neon';

let initialized = false;

export async function ensureAdminTablesExist() {
  if (initialized || !isNeonConfigured()) return;

  try {
    // 1. Table des utilisateurs
    await sql`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        email TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        image TEXT,
        role TEXT NOT NULL DEFAULT 'etudiant',
        niveau TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 2. Table des historiques de connexions
    await sql`
      CREATE TABLE IF NOT EXISTS connexions_log (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        user_nom TEXT,
        provider TEXT NOT NULL DEFAULT 'google',
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_connexions_user_email ON connexions_log(user_email);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_connexions_created_at ON connexions_log(created_at DESC);
    `;

    // S'assurer que le compte administrateur principal est enregistré comme admin
    const adminEmail = process.env.ADMIN_EMAIL || 'ulrrichmagbonde@gmail.com';
    await sql`
      INSERT INTO utilisateurs (email, nom, role, last_login)
      VALUES (${adminEmail.toLowerCase()}, 'Ulrrich Magbonde (Admin)', 'admin', NOW())
      ON CONFLICT (email) DO UPDATE SET role = 'admin';
    `;

    initialized = true;
    console.log('✅ Tables utilisateurs et connexions_log vérifiées avec succès sur Neon.');
  } catch (err) {
    console.error('Erreur ensureAdminTablesExist:', err);
  }
}
