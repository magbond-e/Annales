/**
 * Script de vérification de la configuration Annale229
 * Utilisation : node scripts/check-config.js
 */

const fs   = require('fs');
const path = require('path');

// ─── Chargement du .env.local ───────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌  Fichier .env.local introuvable. Copiez .env.example → .env.local et remplissez-le.');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // Retirer les guillemets ou apostrophes entourant la valeur
  val = val.replace(/^["'](.*)["']$/, '$1').trim();
  if (val && !process.env[key]) process.env[key] = val;
}

// ─── Couleurs ────────────────────────────────────────────────────────────────
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

function check(label, value, required = true) {
  if (value && value.trim()) {
    console.log(`  ${green('✓')} ${label}`);
    return true;
  } else if (required) {
    console.log(`  ${red('✗')} ${label} ${red('← MANQUANT')}`);
    return false;
  } else {
    console.log(`  ${yellow('○')} ${label} ${yellow('(optionnel)')}`);
    return false;
  }
}

// ─── Affichage ───────────────────────────────────────────────────────────────
console.log('\n' + bold(cyan('═══════════════════════════════════════════════════')));
console.log(bold(cyan('   Annale229 MBH — Vérification de Configuration')));
console.log(bold(cyan('═══════════════════════════════════════════════════')) + '\n');

let ok = true;

console.log(bold('🔒 NextAuth'));
ok = check('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET) && ok;
ok = check('NEXTAUTH_URL',    process.env.NEXTAUTH_URL)    && ok;

console.log('\n' + bold('🔐 Google Sign-In (connexion étudiants — optionnel)'));
const hasGoogleSignIn = check('GOOGLE_CLIENT_ID',     process.env.GOOGLE_CLIENT_ID,     false);
                        check('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET, false);
if (!hasGoogleSignIn) {
  console.log(`     ${yellow('→ Seule la connexion rapide (démo) sera disponible')}`);
}

console.log('\n' + bold('🗄️  Neon PostgreSQL (base de données)'));
const rawNeonUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const neonUrl = rawNeonUrl ? rawNeonUrl.replace(/^["'](.*)["']$/, '$1').trim() : '';
const hasNeon = check('DATABASE_URL / NEON_DATABASE_URL', neonUrl, false);
if (!hasNeon) {
  console.log(`     ${yellow('→ Créez un projet sur neon.tech (gratuit, sans carte)')}`);
  console.log(`     ${yellow('→ Mode MOCK actif (données simulées en mémoire)')}`);
}

console.log('\n' + bold('🖼️  Cloudinary (stockage fichiers)'));
const hasCloudinary = check('CLOUDINARY_CLOUD_NAME', process.env.CLOUDINARY_CLOUD_NAME, false)
                    & check('CLOUDINARY_API_KEY',     process.env.CLOUDINARY_API_KEY,     false)
                    & check('CLOUDINARY_API_SECRET',  process.env.CLOUDINARY_API_SECRET,  false);
if (!hasCloudinary) {
  console.log(`     ${yellow('→ Créez un compte sur cloudinary.com (gratuit, sans carte)')}`);
  console.log(`     ${yellow('→ Les fichiers uploadés seront en mode simulé')}`);
}

// ─── Mode actif ──────────────────────────────────────────────────────────────
console.log('\n' + bold('📊 Mode actif'));
if (hasNeon && hasCloudinary) {
  console.log(`  ${green('✓')} Mode ${bold('PRODUCTION')} — Neon DB + Cloudinary`);
} else if (hasNeon) {
  console.log(`  ${yellow('⚡')} Mode ${bold('NEON ONLY')} — DB réelle, fichiers simulés`);
} else {
  console.log(`  ${yellow('○')} Mode ${bold('MOCK')} — Tout simulé en mémoire (non persisté)`);
}

// ─── Test de connexion Neon ──────────────────────────────────────────────────
if (hasNeon) {
  console.log('\n' + bold('🔗 Test de connexion Neon...'));
  try {
    let neon;
    try {
      neon = require('@neondatabase/serverless').neon;
    } catch {
      // Pas encore installé via npm install
    }

    if (neon) {
      const sql = neon(neonUrl);
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
        .then((rows) => {
          const tables = rows.map((r) => r.table_name);
          console.log(`  ${green('✓')} Connexion Neon OK`);
          if (tables.length === 0) {
            console.log(`  ${yellow('!')} Aucune table trouvée → exécutez \`npm run setup-db\` ou collez lib/db/schema.sql sur Neon`);
          } else {
            console.log(`  ${green('✓')} Tables trouvées : ${tables.join(', ')}`);
            const required = ['matieres', 'epreuves', 'profils'];
            const missing = required.filter((t) => !tables.includes(t));
            if (missing.length > 0) {
              console.log(`  ${red('✗')} Tables manquantes : ${missing.join(', ')} → exécutez \`npm run setup-db\``);
            } else {
              console.log(`  ${green('✓')} Les tables requises sont bien présentes`);
            }
          }
          printFinal();
        })
        .catch((err) => {
          console.log(`  ${red('✗')} Connexion échouée : ${err.message}`);
          printFinal();
        });
    } else {
      console.log(`  ${yellow('!')} @neondatabase/serverless pas encore installé — lancez d'abord \`npm install\``);
      printFinal();
    }
  } catch (err) {
    console.log(`  ${red('✗')} URL Neon invalide : ${err.message}`);
    printFinal();
  }
} else {
  printFinal();
}

function printFinal() {
  if (!ok) {
    console.log('\n' + red('⚠️  Des variables obligatoires (NEXTAUTH_*) manquent.'));
  } else if (hasNeon && hasCloudinary) {
    console.log('\n' + green(bold('🎉 Configuration complète ! Lance `npm run dev` pour démarrer.')) + '\n');
  } else {
    console.log('\n' + yellow('ℹ️  Configuration partielle — mode mock actif.'));
    console.log(yellow('   Pour activer le mode réel : remplissez NEON_DATABASE_URL + CLOUDINARY_*') + '\n');
  }
}
