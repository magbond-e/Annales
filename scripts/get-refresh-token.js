/**
 * Script d'aide pour obtenir le GOOGLE_REFRESH_TOKEN du compte applicatif (fondateur).
 *
 * Utilisation :
 * 1. Créer des identifiants OAuth de type "Application Web" ou "Application de bureau" dans Google Cloud Console.
 *    - Ajouter comme URI de redirection autorisée : http://localhost:3333/oauth2callback
 * 2. Définir GOOGLE_APP_CLIENT_ID et GOOGLE_APP_CLIENT_SECRET dans .env.local
 * 3. Exécuter : npm run get-token (ou node scripts/get-refresh-token.js)
 * 4. Ouvrir le lien généré, se connecter avec le compte Google du fondateur, autoriser l'accès.
 * 5. Le refresh token s'affichera directement dans la console à copier dans .env.local.
 */

const http = require('http');
const url = require('url');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Lecture de base de .env.local si existant
const envPath = path.resolve(process.cwd(), '.env.local');
let clientId = process.env.GOOGLE_APP_CLIENT_ID;
let clientSecret = process.env.GOOGLE_APP_CLIENT_SECRET;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...vals] = trimmed.split('=');
    const val = vals.join('=').trim();
    if (key === 'GOOGLE_APP_CLIENT_ID' && val) clientId = val;
    if (key === 'GOOGLE_APP_CLIENT_SECRET' && val) clientSecret = val;
  }
}

if (!clientId || !clientSecret) {
  console.error('\x1b[31m%s\x1b[0m', 'Erreur : GOOGLE_APP_CLIENT_ID ou GOOGLE_APP_CLIENT_SECRET manquant dans .env.local.');
  console.log('Veuillez renseigner ces deux identifiants avant de lancer ce script.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3333/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // Force la délivrance d'un refresh_token
  scope: scopes,
});

console.log('\x1b[36m%s\x1b[0m', '=== Obtention du GOOGLE_REFRESH_TOKEN pour Annale229 ===\n');
console.log('1. Ouvrez ce lien dans votre navigateur et connectez-vous avec le compte du fondateur :\n');
console.log('\x1b[34m%s\x1b[0m\n', authUrl);
console.log('En attente de l\'autorisation sur le port 3333...');

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === '/oauth2callback') {
      const code = parsedUrl.query.code;
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h3>Erreur : Aucun code d\'autorisation reçu.</h3>');
        return;
      }

      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center; color: #0F4C5C;">
          <h1>Autorisation réussie !</h1>
          <p>Vous pouvez fermer cet onglet et revenir à votre terminal.</p>
        </div>
      `);

      console.log('\n\x1b[32m%s\x1b[0m', '=== SUCCÈS ! ===');
      console.log('Votre GOOGLE_REFRESH_TOKEN :');
      console.log('\x1b[33m%s\x1b[0m\n', tokens.refresh_token);
      console.log('Copiez cette valeur dans votre fichier .env.local :');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

      server.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('Erreur lors de l\'échange de jeton :', error);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h3>Erreur lors de la récupération du refresh token.</h3>');
    server.close();
    process.exit(1);
  }
});

server.listen(3333);
