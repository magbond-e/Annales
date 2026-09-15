import { Matiere, Epreuve, Profil, EpreuvesFilterParams, EpreuvesListResponse, StatutEpreuve, TypeEpreuve } from '@/types';
import { sql, isNeonConfigured } from '@/lib/db/neon';
import { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } from '@/lib/storage/cloudinary-client';
import {
  isNeonStorageConfigured,
  uploadToNeonStorage,
  deleteFromNeonStorage,
  buildEpreuveS3Key,
  buildCorrigeS3Key,
} from '@/lib/storage/s3-client';
import { isAdmin, isUserAdminAsync } from '@/lib/utils/admin';
import { mockStore } from './mock-store';
import { normalizeMatiereNom } from '@/lib/utils/validation';

// Helper : crée un client Neon dynamiquement à chaque appel
// (évite le problème de singleton initialisé avant les env vars)
async function getNeon() {
  const { neon } = await import('@neondatabase/serverless');
  const raw = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
  const url = raw.replace(/^["'](.*)[\"']$/, '$1').trim();
  if (!url) throw new Error('DATABASE_URL manquant');
  return neon(url);
}

// Helper : la config complète (DB + stockage) est-elle opérationnelle ?
function isFullyConfigured(): boolean {
  return isNeonConfigured() && isCloudinaryConfigured();
}

// ─── Mapping SQL → Epreuve ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEpreuve(row: any): Epreuve {
  return {
    id:                   row.id,
    uploader_email:       row.uploader_email,
    uploader_nom:         row.uploader_nom,
    matiere_id:           row.matiere_id,
    matiere_nom:          row.matiere_nom,
    niveau:               row.niveau,
    annee_academique:     row.annee_academique,
    type:                 row.type,
    titre:                row.titre || undefined,
    cloudinary_public_id: row.cloudinary_public_id,
    cloudinary_url:       row.cloudinary_url,
    taille_octets:        Number(row.taille_octets) || 0,
    type_fichier:         row.type_fichier,
    nb_telechargements:   Number(row.nb_telechargements) || 0,
    statut:               (row.statut as StatutEpreuve) || 'approuve',
    created_at:           row.created_at instanceof Date
                            ? row.created_at.toISOString()
                            : String(row.created_at),
    // Neon Object Storage
    s3_key:               row.s3_key || undefined,
    s3_url:               row.s3_url || undefined,
    // Corrigé & Barème
    has_corrige:          Boolean(row.has_corrige),
    corrige_url:          row.corrige_url || undefined,
    corrige_cloudinary_public_id: row.corrige_cloudinary_public_id || undefined,
    corrige_s3_key:       row.corrige_s3_key || undefined,
    corrige_type_fichier: row.corrige_type_fichier || undefined,
    corrige_taille_octets: Number(row.corrige_taille_octets) || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMatiere(row: any): Matiere {
  return {
    id:               row.id,
    nom:              row.nom,
    created_by_email: row.created_by_email,
    created_at:       row.created_at instanceof Date
                        ? row.created_at.toISOString()
                        : String(row.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfil(row: any): Profil {
  return {
    email:      row.email,
    nom:        row.nom,
    niveau:     row.niveau,
    created_at: row.created_at instanceof Date
                  ? row.created_at.toISOString()
                  : String(row.created_at),
  };
}

export class DataService {
  // ============================================================
  // MATIERES
  // ============================================================

  /**
   * Récupère toutes les matières triées alphabétiquement
   */
  static async getMatieres(): Promise<Matiere[]> {
    if (isNeonConfigured()) {
      try {
        const db = await getNeon();
        const rows = await db`
          SELECT id, nom, created_by_email, created_at
          FROM matieres
          ORDER BY nom ASC
        `;
        return rows.map(rowToMatiere);
      } catch (err) {
        console.error('Erreur Neon getMatieres, fallback mock:', err);
      }
    }

    return [...mockStore.matieres].sort((a, b) =>
      a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    );
  }

  /**
   * Cherche une matière par nom (insensible à la casse) ou en crée une nouvelle
   */
  static async findOrCreateMatiere(nom: string, createdByEmail: string): Promise<Matiere> {
    if (isNeonConfigured()) {
      try {
        const db = await getNeon();
        // Recherche insensible à la casse via LOWER()
        const existing = await db`
          SELECT id, nom, created_by_email, created_at
          FROM matieres
          WHERE LOWER(nom) = LOWER(${nom.trim()})
          LIMIT 1
        `;
        if (existing.length > 0) return rowToMatiere(existing[0]);

        // Création
        const { generateMatiereId } = await import('@/lib/utils/id');
        const newId = generateMatiereId();
        const inserted = await db`
          INSERT INTO matieres (id, nom, created_by_email)
          VALUES (${newId}, ${nom.trim()}, ${createdByEmail})
          RETURNING id, nom, created_by_email, created_at
        `;
        return rowToMatiere(inserted[0]);
      } catch (err) {
        console.error('Erreur Neon findOrCreateMatiere:', err);
      }
    }

    // Fallback mock
    const normalizedTarget = normalizeMatiereNom(nom);
    const existing = mockStore.matieres.find(
      (m) => normalizeMatiereNom(m.nom) === normalizedTarget
    );
    if (existing) return existing;

    const { generateMatiereId } = await import('@/lib/utils/id');
    const newMatiere: Matiere = {
      id: generateMatiereId(),
      nom: nom.trim(),
      created_by_email: createdByEmail,
      created_at: new Date().toISOString(),
    };
    mockStore.matieres.push(newMatiere);
    return newMatiere;
  }

  // ============================================================
  // EPREUVES
  // ============================================================

  /**
   * Récupère les épreuves avec filtres et pagination
   */
  static async getEpreuves(params: EpreuvesFilterParams): Promise<EpreuvesListResponse> {
    if (isNeonConfigured()) {
      try {
        return await DataService._getEpreuvesFromNeon(params);
      } catch (err) {
        console.error('Erreur Neon getEpreuves, fallback mock:', err);
      }
    }

    return DataService._getEpreuvesFromMock(params);
  }

  /** Requête Neon avec filtres SQL dynamiques */
  private static async _getEpreuvesFromNeon(params: EpreuvesFilterParams): Promise<EpreuvesListResponse> {
    // Construire les conditions dynamiquement
    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = [];
    let idx = 1;

    if (params.statut && params.statut !== 'all') {
      conditions.push(`statut = $${idx++}`);
      values.push(params.statut);
    } else if (!params.statut && !params.uploader_email) {
      // Par défaut, le catalogue public n'affiche que les épreuves approuvées
      conditions.push(`statut = $${idx++}`);
      values.push('approuve');
    }

    if (params.uploader_email) {
      conditions.push(`LOWER(uploader_email) = LOWER($${idx++})`);
      values.push(params.uploader_email);
    }
    if (params.niveau && params.niveau !== 'Tous les niveaux' && params.niveau !== 'all') {
      conditions.push(`LOWER(niveau) = LOWER($${idx++})`);
      values.push(params.niveau);
    }
    if (params.annee && params.annee !== 'all') {
      conditions.push(`annee_academique = $${idx++}`);
      values.push(params.annee);
    }
    if (params.type && params.type !== 'all' && params.type !== 'Tous') {
      conditions.push(`LOWER(type) = LOWER($${idx++})`);
      values.push(params.type);
    }
    if (params.matiere) {
      const matieresList = Array.isArray(params.matiere)
        ? params.matiere
        : params.matiere.split(',').map((s) => s.trim());
      const filtered = matieresList.filter(m => m && m !== 'all').map(m => m.toLowerCase());
      if (filtered.length > 0) {
        // On ajoute chaque matière comme paramètre une seule fois,
        // et on utilise le même placeholder pour matiere_id ET matiere_nom.
        const placeholders = filtered.map(() => `$${idx++}`).join(', ');
        conditions.push(`(LOWER(matiere_id) IN (${placeholders}) OR LOWER(matiere_nom) IN (${placeholders}))`);
        values.push(...filtered);
      }
    }
    if (params.q && params.q.trim()) {
      conditions.push(`(matiere_nom ILIKE $${idx++} OR titre ILIKE $${idx++})`);
      const qPattern = `%${params.q.trim()}%`;
      values.push(qPattern, qPattern);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Requête count
    const countQuery  = `SELECT COUNT(*) FROM epreuves ${where}`;
    // Requête data
    const page  = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 20);
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT *
      FROM epreuves
      ${where}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // @neondatabase/serverless ne supporte pas les requêtes paramétrées dynamiques directement
    // On utilise sql.query (interface bas niveau)
    const { neon } = await import('@neondatabase/serverless');
    const dbUrl = (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL)!;
    const db = neon(dbUrl);

    const [countResult, dataResult] = await Promise.all([
      db(countQuery, values),
      db(dataQuery, values),
    ]);

    const total      = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      epreuves: dataResult.map(rowToEpreuve),
      total,
      page,
      totalPages,
      limit,
    };
  }

  /** Fallback mock avec filtres en mémoire */
  private static _getEpreuvesFromMock(params: EpreuvesFilterParams): EpreuvesListResponse {
    let filtered = [...mockStore.epreuves].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (params.statut && params.statut !== 'all') {
      filtered = filtered.filter((e) => e.statut === params.statut);
    } else if (!params.statut && !params.uploader_email) {
      filtered = filtered.filter((e) => e.statut === 'approuve');
    }

    if (params.uploader_email) {
      filtered = filtered.filter(
        (e) => e.uploader_email.toLowerCase() === params.uploader_email!.toLowerCase()
      );
    }
    if (params.niveau && params.niveau !== 'Tous les niveaux' && params.niveau !== 'all') {
      filtered = filtered.filter((e) => e.niveau.toLowerCase() === params.niveau!.toLowerCase());
    }
    if (params.matiere) {
      const matieresList = Array.isArray(params.matiere)
        ? params.matiere
        : params.matiere.split(',').map((s) => s.trim());
      if (matieresList.length > 0 && !matieresList.includes('all')) {
        filtered = filtered.filter((e) =>
          matieresList.some(
            (m) =>
              m.toLowerCase() === e.matiere_id.toLowerCase() ||
              m.toLowerCase() === e.matiere_nom.toLowerCase()
          )
        );
      }
    }
    if (params.annee && params.annee !== 'all') {
      filtered = filtered.filter((e) => e.annee_academique === params.annee);
    }
    if (params.type && params.type !== 'all' && params.type !== 'Tous') {
      filtered = filtered.filter((e) => e.type.toLowerCase() === params.type!.toLowerCase());
    }
    if (params.q && params.q.trim()) {
      const qLower = params.q.trim().toLowerCase();
      filtered = filtered.filter((e) => {
        const inMatiere = e.matiere_nom.toLowerCase().includes(qLower);
        const inTitre   = e.titre ? e.titre.toLowerCase().includes(qLower) : false;
        return inMatiere || inTitre;
      });
    }

    const page   = Math.max(1, params.page || 1);
    const limit  = Math.max(1, params.limit || 20);
    const total  = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return { epreuves: paginated, total, page, totalPages, limit };
  }

  /**
   * Récupère le détail d'une épreuve par ID
   */
  static async getEpreuveById(id: string): Promise<Epreuve | null> {
    if (isNeonConfigured()) {
      try {
        const rows = await sql`
          SELECT * FROM epreuves WHERE id = ${id} LIMIT 1
        `;
        return rows.length > 0 ? rowToEpreuve(rows[0]) : null;
      } catch (err) {
        console.error('Erreur Neon getEpreuveById:', err);
      }
    }
    return mockStore.epreuves.find((e) => e.id === id) || null;
  }

  /**
   * Crée une épreuve complète : upload Cloudinary + insertion Neon
   */
  static async createEpreuve(params: {
    matiereNom:      string;
    niveau:          string;
    anneeAcademique: string;
    type:            string;
    titre?:          string;
    fileBuffer:      Buffer;
    fileName:        string;
    mimeType:        string;
    uploaderEmail:   string;
    uploaderNom:     string;
  }): Promise<Epreuve> {
    const { generateEpreuveId } = await import('@/lib/utils/id');
    const { getCanonicalFileType } = await import('@/lib/utils/validation');

    const matiere    = await this.findOrCreateMatiere(params.matiereNom, params.uploaderEmail);
    const epreuveId  = generateEpreuveId();
    const typeFichier = getCanonicalFileType(params.fileName, params.mimeType) || 'pdf';
    const fileSize   = params.fileBuffer.length;

    // Upload Cloudinary — obligatoire en production
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary non configuré. Vérifiez les variables CLOUDINARY_* dans votre environnement.');
    }

    let cloudinaryPublicId: string;
    let cloudinaryUrl: string;

    try {
      const result = await uploadToCloudinary({
        buffer:          params.fileBuffer,
        originalFilename: params.fileName,
        mimeType:        params.mimeType,
        anneeAcademique: params.anneeAcademique,
        matiereNom:      matiere.nom,
        epreuveId,
        type:            params.type as any,
      });
      cloudinaryPublicId = result.publicId;
      cloudinaryUrl      = result.url;
    } catch (err) {
      console.error('Erreur upload Cloudinary:', err);
      throw new Error(`Échec du téléversement sur Cloudinary : ${err instanceof Error ? err.message : String(err)}`);
    }

    // Mirror S3 (Neon Object Storage) — non-bloquant si échec
    let s3Key: string | undefined;
    let s3Url: string | undefined;
    if (isNeonStorageConfigured()) {
      try {
        const key = buildEpreuveS3Key(epreuveId, params.fileName);
        const s3Result = await uploadToNeonStorage({
          buffer: params.fileBuffer,
          key,
          contentType: params.mimeType || 'application/octet-stream',
        });
        s3Key = s3Result.key;
        s3Url = s3Result.url;
      } catch (err) {
        console.error('Erreur miroir Neon Object Storage (non-bloquant):', err);
      }
    }

    const isAuthorAdmin = await isUserAdminAsync(params.uploaderEmail);
    const initialStatut: StatutEpreuve = isAuthorAdmin ? 'approuve' : 'en_attente';

    const newEpreuve: Epreuve = {
      id:                   epreuveId,
      uploader_email:       params.uploaderEmail,
      uploader_nom:         params.uploaderNom,
      matiere_id:           matiere.id,
      matiere_nom:          matiere.nom,
      niveau:               params.niveau,
      annee_academique:     params.anneeAcademique,
      type:                 params.type as any,
      titre:                params.titre?.trim() || undefined,
      cloudinary_public_id: cloudinaryPublicId,
      cloudinary_url:       cloudinaryUrl,
      taille_octets:        fileSize,
      type_fichier:         typeFichier,
      nb_telechargements:   0,
      statut:               initialStatut,
      created_at:           new Date().toISOString(),
      s3_key:               s3Key,
      s3_url:               s3Url,
      has_corrige:          false,
    };

    // Insertion Neon
    if (isNeonConfigured()) {
      try {
        await sql`
          INSERT INTO epreuves (
            id, uploader_email, uploader_nom,
            matiere_id, matiere_nom, niveau, annee_academique,
            type, titre,
            cloudinary_public_id, cloudinary_url,
            taille_octets, type_fichier, nb_telechargements, statut,
            s3_key, s3_url
          ) VALUES (
            ${newEpreuve.id}, ${newEpreuve.uploader_email}, ${newEpreuve.uploader_nom},
            ${newEpreuve.matiere_id}, ${newEpreuve.matiere_nom}, ${newEpreuve.niveau}, ${newEpreuve.annee_academique},
            ${newEpreuve.type}, ${newEpreuve.titre || null},
            ${newEpreuve.cloudinary_public_id}, ${newEpreuve.cloudinary_url},
            ${newEpreuve.taille_octets}, ${newEpreuve.type_fichier}, 0, ${newEpreuve.statut},
            ${newEpreuve.s3_key || null}, ${newEpreuve.s3_url || null}
          )
        `;
        return newEpreuve;
      } catch (err) {
        console.error('Erreur Neon INSERT epreuve:', err);
        throw new Error(`Erreur base de données lors de l'enregistrement : ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Fallback mock (dev uniquement, sans connexion DB)
    mockStore.epreuves.unshift(newEpreuve);
    return newEpreuve;
  }

  /**
   * Incrémente le compteur de téléchargements
   */
  static async incrementDownloadCount(id: string): Promise<void> {
    if (isNeonConfigured()) {
      try {
        await sql`
          UPDATE epreuves
          SET nb_telechargements = nb_telechargements + 1
          WHERE id = ${id}
        `;
        return;
      } catch (err) {
        console.error('Erreur Neon incrementDownloadCount:', err);
        return;
      }
    }

    const epreuve = mockStore.epreuves.find((e) => e.id === id);
    if (epreuve) epreuve.nb_telechargements += 1;
  }

  /**
   * Supprime une épreuve (Cloudinary + Neon)
   */
  static async deleteEpreuve(id: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    const epreuve = await this.getEpreuveById(id);
    if (!epreuve) {
      return { success: false, error: 'Épreuve introuvable.' };
    }
    if (epreuve.uploader_email.toLowerCase() !== userEmail.toLowerCase()) {
      return { success: false, error: 'Non autorisé : vous n\'êtes pas l\'auteur de cette épreuve.' };
    }

    // Suppression Cloudinary
    if (isCloudinaryConfigured() && epreuve.cloudinary_public_id && !epreuve.cloudinary_public_id.startsWith('mock_')) {
      try {
        await deleteFromCloudinary(epreuve.cloudinary_public_id);
      } catch (err) {
        console.error('Erreur suppression Cloudinary:', err);
      }
    }

    // Suppression Neon
    if (isNeonConfigured()) {
      try {
        await sql`DELETE FROM epreuves WHERE id = ${id}`;
        return { success: true };
      } catch (err) {
        console.error('Erreur Neon DELETE epreuve:', err);
        return { success: false, error: 'Erreur lors de la suppression en base de données.' };
      }
    }

    // Suppression locale mock (dev sans DB)
    const index = mockStore.epreuves.findIndex((e) => e.id === id);
    if (index !== -1) mockStore.epreuves.splice(index, 1);

    return { success: true };
  }

  // ============================================================
  // GESTION & MODÉRATION ADMIN
  // ============================================================

  /**
   * Met à jour le statut d'une épreuve (admin: approuve, rejete, en_attente)
   */
  static async updateEpreuveStatut(id: string, statut: StatutEpreuve): Promise<boolean> {
    if (isNeonConfigured()) {
      try {
        await sql`UPDATE epreuves SET statut = ${statut} WHERE id = ${id}`;
        return true;
      } catch (err) {
        console.error('Erreur Neon updateEpreuveStatut:', err);
        return false;
      }
    }
    const epreuve = mockStore.epreuves.find((e) => e.id === id);
    if (epreuve) {
      epreuve.statut = statut;
      return true;
    }
    return false;
  }

  /**
   * Met à jour les métadonnées d'une épreuve (admin)
   */
  static async updateEpreuveMetadata(
    id: string,
    updates: {
      matiereNom?: string;
      niveau?: string;
      anneeAcademique?: string;
      type?: TypeEpreuve;
      titre?: string;
    }
  ): Promise<boolean> {
    if (isNeonConfigured()) {
      try {
        const epreuve = await this.getEpreuveById(id);
        if (!epreuve) return false;

        let matiereId = epreuve.matiere_id;
        let matiereNom = epreuve.matiere_nom;

        if (updates.matiereNom && updates.matiereNom !== epreuve.matiere_nom) {
          const mat = await this.findOrCreateMatiere(updates.matiereNom, epreuve.uploader_email);
          matiereId = mat.id;
          matiereNom = mat.nom;
        }

        await sql`
          UPDATE epreuves
          SET matiere_id = ${matiereId},
              matiere_nom = ${matiereNom},
              niveau = ${updates.niveau ?? epreuve.niveau},
              annee_academique = ${updates.anneeAcademique ?? epreuve.annee_academique},
              type = ${updates.type ?? epreuve.type},
              titre = ${updates.titre !== undefined ? updates.titre : (epreuve.titre || null)}
          WHERE id = ${id}
        `;
        return true;
      } catch (err) {
        console.error('Erreur Neon updateEpreuveMetadata:', err);
        return false;
      }
    }

    const epreuve = mockStore.epreuves.find((e) => e.id === id);
    if (epreuve) {
      if (updates.matiereNom) epreuve.matiere_nom = updates.matiereNom;
      if (updates.niveau) epreuve.niveau = updates.niveau;
      if (updates.anneeAcademique) epreuve.annee_academique = updates.anneeAcademique;
      if (updates.type) epreuve.type = updates.type;
      if (updates.titre !== undefined) epreuve.titre = updates.titre;
      return true;
    }
    return false;
  }

  /**
   * Suppression forcée par un administrateur (Cloudinary + Neon)
   */
  static async deleteEpreuveAdmin(id: string): Promise<boolean> {
    let epreuve: Epreuve | null = null;
    try {
      epreuve = await this.getEpreuveById(id);
    } catch (err) {
      console.warn('Erreur getEpreuveById avant suppression admin:', err);
    }

    if (epreuve && isCloudinaryConfigured() && epreuve.cloudinary_public_id && !epreuve.cloudinary_public_id.startsWith('mock_')) {
      try {
        await deleteFromCloudinary(epreuve.cloudinary_public_id);
      } catch (err) {
        console.error('Erreur suppression Cloudinary (admin):', err);
      }
      // Suppression du corrigé Cloudinary s'il existe
      if (epreuve.corrige_cloudinary_public_id) {
        try {
          await deleteFromCloudinary(epreuve.corrige_cloudinary_public_id);
        } catch (err) {
          console.error('Erreur suppression Cloudinary corrigé (admin):', err);
        }
      }
    }

    // Nettoyage S3
    if (isNeonStorageConfigured()) {
      if (epreuve?.s3_key) {
        deleteFromNeonStorage(epreuve.s3_key).catch(console.error);
      }
      if (epreuve?.corrige_s3_key) {
        deleteFromNeonStorage(epreuve.corrige_s3_key).catch(console.error);
      }
    }

    if (isNeonConfigured()) {
      try {
        const deletedRows = await sql`DELETE FROM epreuves WHERE id = ${id} RETURNING id;`;
        return deletedRows.length > 0;
      } catch (err) {
        console.error('Erreur Neon DELETE epreuve (admin):', err);
        return false;
      }
    }

    const index = mockStore.epreuves.findIndex((e) => e.id === id);
    if (index !== -1) {
      mockStore.epreuves.splice(index, 1);
      return true;
    }

    return Boolean(epreuve);
  }

  /**
   * Suppression en masse par un administrateur (Cloudinary + Neon)
   */
  static async deleteEpreuvesAdminBulk(ids: string[]): Promise<{
    successCount: number;
    failCount: number;
    results: { id: string; success: boolean; error?: string }[];
  }> {
    if (!ids || ids.length === 0) {
      return { successCount: 0, failCount: 0, results: [] };
    }

    // 1. Récupération des Cloudinary public_ids et clés S3
    let publicIds: string[] = [];
    let s3Keys: string[] = [];
    if (isNeonConfigured()) {
      try {
        const rows = await sql`SELECT id, cloudinary_public_id, corrige_cloudinary_public_id, s3_key, corrige_s3_key FROM epreuves WHERE id = ANY(${ids});`;
        publicIds = rows.flatMap((r: any) => [
          r.cloudinary_public_id,
          r.corrige_cloudinary_public_id,
        ]).filter(Boolean);
        s3Keys = rows.flatMap((r: any) => [
          r.s3_key,
          r.corrige_s3_key,
        ]).filter(Boolean);
      } catch (err) {
        console.warn('Erreur récupération public_ids pour suppression en masse:', err);
      }
    }

    // Nettoyage Cloudinary en arrière-plan
    if (isCloudinaryConfigured() && publicIds.length > 0) {
      Promise.allSettled(
        publicIds
          .filter((pid) => pid && !pid.startsWith('mock_'))
          .map((pid) => deleteFromCloudinary(pid))
      ).catch((err) => console.error('Erreur nettoyage Cloudinary bulk:', err));
    }

    // Nettoyage S3 en arrière-plan
    if (isNeonStorageConfigured() && s3Keys.length > 0) {
      Promise.allSettled(s3Keys.map((key) => deleteFromNeonStorage(key)))
        .catch((err) => console.error('Erreur nettoyage S3 bulk:', err));
    }

    // 2. Suppression atomique SQL dans Neon
    const deletedIds = new Set<string>();
    if (isNeonConfigured()) {
      try {
        const deletedRows = await sql`DELETE FROM epreuves WHERE id = ANY(${ids}) RETURNING id;`;
        deletedRows.forEach((r: any) => deletedIds.add(r.id));
      } catch (err) {
        console.error('Erreur Neon DELETE bulk epreuves:', err);
      }
    } else {
      // 3. Suppression dans mockStore (fallback dev sans DB)
      ids.forEach((id) => {
        const idx = mockStore.epreuves.findIndex((e) => e.id === id);
        if (idx !== -1) {
          mockStore.epreuves.splice(idx, 1);
          deletedIds.add(id);
        }
      });
    }

    const results = ids.map((id) => ({
      id,
      success: deletedIds.has(id),
      ...(!deletedIds.has(id) ? { error: 'Épreuve introuvable ou déjà supprimée.' } : {}),
    }));

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return { successCount, failCount, results };
  }

  /**
   * Mise à jour en masse du statut par un administrateur
   */
  static async updateEpreuvesStatutBulk(ids: string[], statut: StatutEpreuve): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    let count = 0;
    if (isNeonConfigured()) {
      try {
        const res = await sql`
          UPDATE epreuves SET statut = ${statut} WHERE id = ANY(${ids}) RETURNING id;
        `;
        count = res.length;
      } catch (err) {
        console.error('Erreur Neon updateEpreuvesStatutBulk:', err);
      }
    }

    ids.forEach((id) => {
      const item = mockStore.epreuves.find((e) => e.id === id);
      if (item) {
        item.statut = statut;
        if (!isNeonConfigured()) count++;
      }
    });

    return count;
  }

  // ============================================================
  // CORRIGÉS & BARÈMES
  // ============================================================

  /**
   * Attache un corrigé (fichier) à une épreuve existante
   */
  static async addCorrige(params: {
    epreuveId:   string;
    fileBuffer:  Buffer;
    fileName:    string;
    mimeType:    string;
    fileSize:    number;
  }): Promise<Epreuve> {
    const { getCanonicalFileType } = await import('@/lib/utils/validation');
    const typeFichier = getCanonicalFileType(params.fileName, params.mimeType) || 'pdf';

    let corrigeUrl = '';
    let corrigePublicId: string | undefined;

    // Upload Cloudinary
    if (isCloudinaryConfigured()) {
      try {
        const cld = await import('@/lib/storage/cloudinary-client');
        const result = await cld.uploadToCloudinary({
          buffer: params.fileBuffer,
          originalFilename: params.fileName,
          mimeType: params.mimeType,
          anneeAcademique: 'corriges',
          matiereNom: 'corriges',
          epreuveId: params.epreuveId,
          type: 'devoir' as any,
        });
        corrigeUrl = result.url;
        corrigePublicId = result.publicId;
      } catch (err) {
        console.error('Erreur upload corrigé Cloudinary:', err);
        throw new Error('Impossible de téléverser le corrigé.');
      }
    }

    // Mirror S3 (non-bloquant)
    let corrigeS3Key: string | undefined;
    if (isNeonStorageConfigured()) {
      try {
        const key = buildCorrigeS3Key(params.epreuveId, params.fileName);
        await uploadToNeonStorage({
          buffer: params.fileBuffer,
          key,
          contentType: params.mimeType || 'application/octet-stream',
        });
        corrigeS3Key = key;
      } catch (err) {
        console.error('Erreur miroir S3 corrigé (non-bloquant):', err);
      }
    }

    // Mise à jour en base
    if (isNeonConfigured()) {
      try {
        const rows = await sql`
          UPDATE epreuves SET
            has_corrige = TRUE,
            corrige_url = ${corrigeUrl},
            corrige_cloudinary_public_id = ${corrigePublicId || null},
            corrige_s3_key = ${corrigeS3Key || null},
            corrige_type_fichier = ${typeFichier},
            corrige_taille_octets = ${params.fileSize}
          WHERE id = ${params.epreuveId}
          RETURNING *;
        `;
        if (rows.length > 0) return rowToEpreuve(rows[0]);
      } catch (err) {
        console.error('Erreur Neon addCorrige:', err);
        throw new Error('Erreur de base de données lors de l\'ajout du corrigé.');
      }
    }

    // Fallback mock
    const mockItem = mockStore.epreuves.find((e) => e.id === params.epreuveId);
    if (mockItem) {
      mockItem.has_corrige = true;
      mockItem.corrige_url = corrigeUrl;
      mockItem.corrige_type_fichier = typeFichier;
      mockItem.corrige_taille_octets = params.fileSize;
      return mockItem;
    }
    throw new Error('Épreuve introuvable pour l\'ajout du corrigé.');
  }

  /**
   * Supprime le corrigé d'une épreuve
   */
  static async deleteCorrige(epreuveId: string): Promise<void> {
    let epreuve: Epreuve | null = null;
    try {
      epreuve = await this.getEpreuveById(epreuveId);
    } catch { /* ignore */ }

    // Nettoyage Cloudinary
    if (epreuve?.corrige_cloudinary_public_id && isCloudinaryConfigured()) {
      deleteFromCloudinary(epreuve.corrige_cloudinary_public_id).catch(console.error);
    }
    // Nettoyage S3
    if (epreuve?.corrige_s3_key && isNeonStorageConfigured()) {
      deleteFromNeonStorage(epreuve.corrige_s3_key).catch(console.error);
    }

    if (isNeonConfigured()) {
      try {
        await sql`
          UPDATE epreuves SET
            has_corrige = FALSE,
            corrige_url = NULL,
            corrige_cloudinary_public_id = NULL,
            corrige_s3_key = NULL,
            corrige_type_fichier = NULL,
            corrige_taille_octets = 0
          WHERE id = ${epreuveId};
        `;
        return;
      } catch (err) {
        console.error('Erreur Neon deleteCorrige:', err);
        throw err;
      }
    }

    const mockItem = mockStore.epreuves.find((e) => e.id === epreuveId);
    if (mockItem) {
      mockItem.has_corrige = false;
      delete mockItem.corrige_url;
      delete mockItem.corrige_cloudinary_public_id;
      delete mockItem.corrige_s3_key;
      delete mockItem.corrige_type_fichier;
      mockItem.corrige_taille_octets = 0;
    }
  }

  /**
   * Récupère les statistiques de la plateforme pour l'administration
   */
  static async getAdminStats(): Promise<{
    totalEpreuves: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalDownloads: number;
    contributorsCount: number;
  }> {
    if (isNeonConfigured()) {
      try {
        const stats = await sql`
          SELECT
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE statut = 'en_attente')::int as pending,
            COUNT(*) FILTER (WHERE statut = 'approuve')::int as approved,
            COUNT(*) FILTER (WHERE statut = 'rejete')::int as rejected,
            COALESCE(SUM(nb_telechargements), 0)::int as downloads,
            COUNT(DISTINCT uploader_email)::int as contributors
          FROM epreuves;
        `;
        const s = stats[0] || {};
        return {
          totalEpreuves: Number(s.total || 0),
          pendingCount: Number(s.pending || 0),
          approvedCount: Number(s.approved || 0),
          rejectedCount: Number(s.rejected || 0),
          totalDownloads: Number(s.downloads || 0),
          contributorsCount: Number(s.contributors || 0),
        };
      } catch (err) {
        console.error('Erreur Neon getAdminStats:', err);
      }
    }

    // Fallback mock
    const total = mockStore.epreuves.length;
    const pending = mockStore.epreuves.filter((e) => e.statut === 'en_attente').length;
    const approved = mockStore.epreuves.filter((e) => e.statut === 'approuve').length;
    const rejected = mockStore.epreuves.filter((e) => e.statut === 'rejete').length;
    const downloads = mockStore.epreuves.reduce((acc, e) => acc + (e.nb_telechargements || 0), 0);
    const contributors = new Set(mockStore.epreuves.map((e) => e.uploader_email.toLowerCase())).size;

    return {
      totalEpreuves: total,
      pendingCount: pending,
      approvedCount: approved,
      rejectedCount: rejected,
      totalDownloads: downloads,
      contributorsCount: contributors,
    };
  }

  // ============================================================
  // PROFILS
  // ============================================================

  /**
   * Récupère le profil d'un utilisateur par email
   */
  static async getProfil(email: string): Promise<Profil | null> {
    if (!email) return null;

    if (isNeonConfigured()) {
      try {
        const rows = await sql`
          SELECT email, nom, niveau, created_at
          FROM profils
          WHERE LOWER(email) = LOWER(${email})
          LIMIT 1
        `;
        return rows.length > 0 ? rowToProfil(rows[0]) : null;
      } catch (err) {
        console.error('Erreur Neon getProfil:', err);
      }
    }

    return mockStore.profils.find((p) => p.email.toLowerCase() === email.toLowerCase()) || null;
  }

  /**
   * Crée ou met à jour un profil utilisateur (upsert)
   */
  static async upsertProfil(profil: Profil): Promise<void> {
    if (isNeonConfigured()) {
      try {
        await sql`
          INSERT INTO profils (email, nom, niveau)
          VALUES (${profil.email}, ${profil.nom}, ${profil.niveau})
          ON CONFLICT (email)
          DO UPDATE SET nom = EXCLUDED.nom, niveau = EXCLUDED.niveau
        `;
        return;
      } catch (err) {
        console.error('Erreur Neon upsertProfil:', err);
      }
    }

    const index = mockStore.profils.findIndex(
      (p) => p.email.toLowerCase() === profil.email.toLowerCase()
    );
    if (index !== -1) {
      mockStore.profils[index] = profil;
    } else {
      mockStore.profils.push(profil);
    }
  }
}
