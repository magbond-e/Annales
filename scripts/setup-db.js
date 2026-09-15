/**
 * Script d'initialisation automatique de la base de données Neon PostgreSQL
 * Exécute lib/db/schema.sql directement via votre NEON_DATABASE_URL
 *
 * Utilisation : node scripts/setup-db.js
 */

const fs = require('fs');
const path = require('path');

// 1. Chargement de .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    val = val.replace(/^["'](.*)["']$/, '$1').trim();
    if (val && !process.env[key]) process.env[key] = val;
  }
}

const rawConn = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const connectionString = rawConn ? rawConn.replace(/^["'](.*)["']$/, '$1').trim() : '';

if (!connectionString) {
  console.error('\x1b[31m%s\x1b[0m', '❌ DATABASE_URL ou NEON_DATABASE_URL est manquante dans .env.local.');
  console.log('\x1b[33m%s\x1b[0m', 'Créez un projet gratuit sur https://neon.tech et copiez l\'URL de connexion.');
  process.exit(1);
}

// 2. Lecture du fichier schema.sql
const schemaPath = path.resolve(process.cwd(), 'lib', 'db', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('\x1b[31m%s\x1b[0m', `❌ Schéma introuvable à : ${schemaPath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(schemaPath, 'utf8');

async function runMigration() {
  console.log('\x1b[36m%s\x1b[0m', '\n=================================================');
  console.log('\x1b[36m%s\x1b[0m', '   Initialisation de la Base de Données Neon');
  console.log('\x1b[36m%s\x1b[0m', '=================================================\n');

  console.log('Connexion à Neon PostgreSQL en cours...');

  let neon;
  try {
    const neonPkg = require('@neondatabase/serverless');
    neon = neonPkg.neon;
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Le package @neondatabase/serverless n\'est pas encore installé.');
    console.log('Veuillez d\'abord lancer : npm install');
    process.exit(1);
  }

  try {
    const sql = neon(connectionString);

    // Découper les commandes SQL proprement (séparées par des points-virgules)
    // On retire les commentaires
    const cleanedSql = sqlContent
      .replace(/--.*$/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Exécution de ${cleanedSql.length} instructions SQL...`);

    for (let i = 0; i < cleanedSql.length; i++) {
      const statement = cleanedSql[i];
      process.stdout.write(`  [${i + 1}/${cleanedSql.length}] Exécution... `);
      await sql(statement);
      console.log('\x1b[32mOK\x1b[0m');
    }

    // Vérifier les tables créées
    const tablesRes = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tables = tablesRes.map((r) => r.table_name);

    // Compter les matières
    const matieresCount = await sql`SELECT count(*) as count FROM matieres;`;

    console.log('\n\x1b[32m%s\x1b[0m', '✅ Schéma initialisé avec succès sur Neon !');
    console.log(`📊 Tables actives : ${tables.join(', ')}`);
    console.log(`📚 Matières insérées : ${matieresCount[0]?.count || 0}`);
    console.log('\nVous pouvez maintenant lancer : \x1b[1m\x1b[32mnpm run dev\x1b[0m\n');
  } catch (err) {
    console.error('\n\x1b[31m%s\x1b[0m', `❌ Erreur lors de l'exécution du schéma : ${err.message}`);
    console.log('\nConseil : vous pouvez aussi copier-coller directement le contenu de');
    console.log('  \x1b[33mlib/db/schema.sql\x1b[0m dans l\'éditeur SQL de la console https://neon.tech');
    process.exit(1);
  }
}

runMigration();
