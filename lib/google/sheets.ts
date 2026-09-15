// @deprecated Module legacy Google Sheets (remplacé par Neon PostgreSQL)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const google: any = null;
import { Matiere, Epreuve, Profil, TypeEpreuve, TypeFichier } from '@/types';

function getSheetId(): string {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID n\'est pas configuré dans les variables d\'environnement.');
  }
  return sheetId;
}

function getSheetsApi(): any {
  return null;
}

// ==========================================
// ONGLET : Matieres
// ==========================================

export async function fetchMatieresFromSheet(): Promise<Matiere[]> {
  const sheets = getSheetsApi();
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Matieres!A2:D',
  });

  const rows = response.data.values || [];
  return rows.map((row) => ({
    id: row[0] || '',
    nom: row[1] || '',
    created_by_email: row[2] || '',
    created_at: row[3] || '',
  })).filter((m) => m.id && m.nom);
}

export async function appendMatiereToSheet(matiere: Matiere): Promise<void> {
  const sheets = getSheetsApi();
  const spreadsheetId = getSheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Matieres!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        matiere.id,
        matiere.nom,
        matiere.created_by_email,
        matiere.created_at,
      ]],
    },
  });
}

// ==========================================
// ONGLET : Epreuves
// ==========================================

export async function fetchEpreuvesFromSheet(): Promise<Epreuve[]> {
  const sheets = getSheetsApi();
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Epreuves!A2:O',
  });

  const rows = response.data.values || [];
  return rows.map((row) => ({
    id: row[0] || '',
    uploader_email: row[1] || '',
    uploader_nom: row[2] || '',
    matiere_id: row[3] || '',
    matiere_nom: row[4] || '',
    niveau: row[5] || '',
    annee_academique: row[6] || '',
    type: (row[7] || 'examen') as TypeEpreuve,
    titre: row[8] || undefined,
    drive_file_id: row[9] || '',
    drive_view_link: row[10] || '',
    taille_octets: parseInt(row[11] || '0', 10),
    type_fichier: (row[12] || 'pdf') as TypeFichier,
    nb_telechargements: parseInt(row[13] || '0', 10),
    created_at: row[14] || '',
  })).filter((e) => e.id);
}

export async function appendEpreuveToSheet(epreuve: Epreuve): Promise<void> {
  const sheets = getSheetsApi();
  const spreadsheetId = getSheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Epreuves!A:O',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        epreuve.id,
        epreuve.uploader_email,
        epreuve.uploader_nom,
        epreuve.matiere_id,
        epreuve.matiere_nom,
        epreuve.niveau,
        epreuve.annee_academique,
        epreuve.type,
        epreuve.titre || '',
        epreuve.drive_file_id,
        epreuve.drive_view_link,
        epreuve.taille_octets,
        epreuve.type_fichier,
        epreuve.nb_telechargements,
        epreuve.created_at,
      ]],
    },
  });
}

export async function incrementDownloadCountInSheet(epreuveId: string): Promise<void> {
  const sheets = getSheetsApi();
  const spreadsheetId = getSheetId();

  // Chercher la ligne correspondant à cet ID
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Epreuves!A:N',
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === epreuveId);

  if (rowIndex === -1) return;

  const currentCount = parseInt(rows[rowIndex][13] || '0', 10);
  const rowNumber = rowIndex + 1; // 1-indexed

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Epreuves!N${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[currentCount + 1]],
    },
  });
}

export async function deleteEpreuveFromSheet(epreuveId: string): Promise<boolean> {
  const sheets = getSheetsApi();
  const spreadsheetId = getSheetId();

  // Récupérer les métadonnées pour trouver le sheetId interne de l'onglet Epreuves
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const epreuvesSheet = meta.data.sheets?.find((s) => s.properties?.title === 'Epreuves');
  const internalSheetId = epreuvesSheet?.properties?.sheetId;

  if (internalSheetId === undefined) {
    throw new Error('Onglet Epreuves introuvable dans le Google Sheet.');
  }

  // Trouver l'index de la ligne
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Epreuves!A:A',
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === epreuveId);

  if (rowIndex === -1) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: internalSheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  return true;
}

// ==========================================
// ONGLET : Profils
// ==========================================

export async function fetchProfilFromSheet(email: string): Promise<Profil | null> {
  const sheets = getSheetsApi();
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Profils!A2:D',
  });

  const rows = response.data.values || [];
  const found = rows.find((r) => (r[0] || '').toLowerCase() === email.toLowerCase());

  if (!found) return null;

  return {
    email: found[0],
    nom: found[1] || '',
    niveau: found[2] || '',
    created_at: found[3] || '',
  };
}

export async function upsertProfilInSheet(profil: Profil): Promise<void> {
  const sheets = getSheetsApi();
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Profils!A:D',
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r) => (r[0] || '').toLowerCase() === profil.email.toLowerCase());

  if (rowIndex !== -1) {
    // Mise à jour de la ligne existante
    const rowNumber = rowIndex + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Profils!A${rowNumber}:D${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[profil.email, profil.nom, profil.niveau, rows[rowIndex][3] || profil.created_at]],
      },
    });
  } else {
    // Création d'une nouvelle ligne
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Profils!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[profil.email, profil.nom, profil.niveau, profil.created_at]],
      },
    });
  }
}
