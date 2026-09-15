import { sql, isNeonConfigured } from '@/lib/db/neon';
import { ensureAdminTablesExist } from '@/lib/db/schema-init';
import { Matiere, Epreuve, StatutEpreuve, TypeEpreuve } from '@/types';
import { normalizeMatiereNom } from '@/lib/utils/validation';
import { isAdmin } from '@/lib/utils/admin';

export interface UserAccount {
  email: string;
  nom: string;
  image?: string;
  role: 'admin' | 'etudiant';
  niveau?: string;
  created_at: string;
  last_login: string;
  total_depots: number;
}

export interface ConnexionLog {
  id: string;
  user_email: string;
  user_nom?: string;
  provider: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface MatiereWithStats {
  id: string;
  nom: string;
  created_by_email: string;
  created_at: string;
  total_epreuves: number;
}

export class AdminService {
  /**
   * Enregistre un événement de connexion
   */
  static async logConnection(params: {
    email: string;
    nom?: string;
    image?: string;
    provider?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    if (!isNeonConfigured()) return;
    await ensureAdminTablesExist();

    try {
      const email = params.email.trim().toLowerCase();
      const nom = params.nom?.trim() || 'Étudiant MBH';
      const provider = params.provider || 'google';
      const userShouldBeAdmin = isAdmin(email);

      // 1. Mettre à jour ou insérer l'utilisateur (avec rôle admin si autorisé)
      if (userShouldBeAdmin) {
        await sql`
          INSERT INTO utilisateurs (email, nom, image, role, last_login)
          VALUES (${email}, ${nom}, ${params.image || null}, 'admin', NOW())
          ON CONFLICT (email) DO UPDATE 
          SET 
            nom = EXCLUDED.nom,
            image = COALESCE(EXCLUDED.image, utilisateurs.image),
            role = 'admin',
            last_login = NOW();
        `;
      } else {
        await sql`
          INSERT INTO utilisateurs (email, nom, image, last_login)
          VALUES (${email}, ${nom}, ${params.image || null}, NOW())
          ON CONFLICT (email) DO UPDATE 
          SET 
            nom = EXCLUDED.nom,
            image = COALESCE(EXCLUDED.image, utilisateurs.image),
            last_login = NOW();
        `;
      }


      // 2. Insérer dans l'historique des connexions
      const logId = 'log_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      await sql`
        INSERT INTO connexions_log (id, user_email, user_nom, provider, ip_address, user_agent, created_at)
        VALUES (
          ${logId},
          ${email},
          ${nom},
          ${provider},
          ${params.ip || null},
          ${params.userAgent ? params.userAgent.substring(0, 255) : null},
          NOW()
        );
      `;
    } catch (err) {
      console.error('Erreur AdminService.logConnection:', err);
    }
  }

  /**
   * Récupère la liste de tous les utilisateurs inscrits avec statistiques
   */
  static async getUsersList(): Promise<UserAccount[]> {
    if (!isNeonConfigured()) return [];
    await ensureAdminTablesExist();

    try {
      const rows = await sql`
        SELECT 
          u.email,
          u.nom,
          u.image,
          u.role,
          u.niveau,
          u.created_at,
          u.last_login,
          COUNT(e.id)::int AS total_depots
        FROM utilisateurs u
        LEFT JOIN epreuves e ON LOWER(e.uploader_email) = LOWER(u.email)
        GROUP BY u.email, u.nom, u.image, u.role, u.niveau, u.created_at, u.last_login
        ORDER BY u.last_login DESC;
      `;

      return rows.map((r) => ({
        email: r.email,
        nom: r.nom,
        image: r.image || undefined,
        role: (r.role === 'admin' ? 'admin' : 'etudiant'),
        niveau: r.niveau || undefined,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        last_login: r.last_login instanceof Date ? r.last_login.toISOString() : String(r.last_login),
        total_depots: Number(r.total_depots) || 0,
      }));
    } catch (err) {
      console.error('Erreur AdminService.getUsersList:', err);
      return [];
    }
  }

  /**
   * Met à jour le rôle d'un utilisateur (promouvoir ou rétrograder admin)
   */
  static async setUserRole(email: string, role: 'admin' | 'etudiant'): Promise<boolean> {
    if (!isNeonConfigured()) return false;
    await ensureAdminTablesExist();

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await sql`
        INSERT INTO utilisateurs (email, nom, role, last_login)
        VALUES (${normalizedEmail}, ${normalizedEmail.split('@')[0]}, ${role}, NOW())
        ON CONFLICT (email) DO UPDATE SET role = ${role};
      `;
      return true;
    } catch (err) {
      console.error('Erreur AdminService.setUserRole:', err);
      return false;
    }
  }

  /**
   * Vérifie si un email est administrateur dans la base
   */
  static async isEmailAdmin(email?: string | null): Promise<boolean> {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    
    // Vérification de la whitelist d'administrateurs statiques / env
    if (isAdmin(normalized)) {
      return true;
    }


    if (!isNeonConfigured()) return false;
    await ensureAdminTablesExist();

    try {
      const res = await sql`
        SELECT role FROM utilisateurs WHERE LOWER(email) = ${normalized} LIMIT 1;
      `;
      return res.length > 0 && res[0].role === 'admin';
    } catch {
      return false;
    }
  }

  /**
   * Récupère l'historique des connexions (avec filtre optionnel par utilisateur)
   */
  static async getLoginHistory(userEmail?: string, limit: number = 50): Promise<ConnexionLog[]> {
    if (!isNeonConfigured()) return [];
    await ensureAdminTablesExist();

    try {
      let rows;
      if (userEmail?.trim()) {
        rows = await sql`
          SELECT id, user_email, user_nom, provider, ip_address, user_agent, created_at
          FROM connexions_log
          WHERE LOWER(user_email) = ${userEmail.trim().toLowerCase()}
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
      } else {
        rows = await sql`
          SELECT id, user_email, user_nom, provider, ip_address, user_agent, created_at
          FROM connexions_log
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
      }

      return rows.map((r) => ({
        id: r.id,
        user_email: r.user_email,
        user_nom: r.user_nom || undefined,
        provider: r.provider,
        ip_address: r.ip_address || undefined,
        user_agent: r.user_agent || undefined,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      }));
    } catch (err) {
      console.error('Erreur AdminService.getLoginHistory:', err);
      return [];
    }
  }

  /**
   * Récupère toutes les matières avec le nombre d'épreuves rattachées
   */
  static async getMatieresWithStats(): Promise<MatiereWithStats[]> {
    if (!isNeonConfigured()) return [];
    try {
      const rows = await sql`
        SELECT 
          m.id,
          m.nom,
          m.created_by_email,
          m.created_at,
          COUNT(e.id)::int AS total_epreuves
        FROM matieres m
        LEFT JOIN epreuves e ON e.matiere_id = m.id
        GROUP BY m.id, m.nom, m.created_by_email, m.created_at
        ORDER BY m.nom ASC;
      `;

      return rows.map((r) => ({
        id: r.id,
        nom: r.nom,
        created_by_email: r.created_by_email,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        total_epreuves: Number(r.total_epreuves) || 0,
      }));
    } catch (err) {
      console.error('Erreur AdminService.getMatieresWithStats:', err);
      return [];
    }
  }

  /**
   * Crée une nouvelle matière depuis l'espace admin
   */
  static async addMatiere(nom: string, adminEmail: string): Promise<Matiere> {
    if (!isNeonConfigured()) {
      throw new Error('Neon DB non configuré');
    }

    const trimmed = nom.trim();
    if (trimmed.length < 2) {
      throw new Error('Le nom de la matière doit comporter au moins 2 caractères.');
    }

    // Vérifier si elle existe déjà
    const existing = await sql`
      SELECT id, nom, created_by_email, created_at
      FROM matieres
      WHERE LOWER(nom) = LOWER(${trimmed})
      LIMIT 1;
    `;

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        nom: existing[0].nom,
        created_by_email: existing[0].created_by_email,
        created_at: existing[0].created_at instanceof Date ? existing[0].created_at.toISOString() : String(existing[0].created_at),
      };
    }

    const id = 'm_' + Math.random().toString(36).substring(2, 8);
    const rows = await sql`
      INSERT INTO matieres (id, nom, created_by_email, created_at)
      VALUES (${id}, ${trimmed}, ${adminEmail.toLowerCase()}, NOW())
      RETURNING id, nom, created_by_email, created_at;
    `;

    return {
      id: rows[0].id,
      nom: rows[0].nom,
      created_by_email: rows[0].created_by_email,
      created_at: rows[0].created_at instanceof Date ? rows[0].created_at.toISOString() : String(rows[0].created_at),
    };
  }

  /**
   * Supprime une matière si aucune épreuve n'y est rattachée
   */
  static async deleteMatiere(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isNeonConfigured()) return { success: false, error: 'DB indisponible' };

    try {
      const epreuvesCount = await sql`
        SELECT COUNT(*)::int AS count FROM epreuves WHERE matiere_id = ${id};
      `;

      if (Number(epreuvesCount[0]?.count) > 0) {
        return {
          success: false,
          error: `Impossible de supprimer : ${epreuvesCount[0].count} épreuve(s) y sont rattachée(s).`,
        };
      }

      await sql`DELETE FROM matieres WHERE id = ${id};`;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la suppression' };
    }
  }

  /**
   * Met à jour en détail une soumission d'épreuve (admin)
   */
  static async updateEpreuveDetails(
    id: string,
    updates: {
      titre?: string;
      matiereNom?: string;
      niveau?: string;
      anneeAcademique?: string;
      type?: TypeEpreuve;
      statut?: StatutEpreuve;
      uploaderNom?: string;
      uploaderEmail?: string;
    }
  ): Promise<Epreuve | null> {
    if (!isNeonConfigured()) return null;

    try {
      // 1. Si une matière est fournie, retrouver ou créer son ID
      let matiereId: string | undefined;
      let finalMatiereNom = updates.matiereNom?.trim();

      if (finalMatiereNom) {
        const matieres = await sql`
          SELECT id, nom FROM matieres WHERE LOWER(nom) = LOWER(${finalMatiereNom}) LIMIT 1;
        `;
        if (matieres.length > 0) {
          matiereId = matieres[0].id;
          finalMatiereNom = matieres[0].nom;
        } else {
          matiereId = 'm_' + Math.random().toString(36).substring(2, 8);
          await sql`
            INSERT INTO matieres (id, nom, created_by_email, created_at)
            VALUES (${matiereId}, ${finalMatiereNom}, ${updates.uploaderEmail?.toLowerCase() || 'system'}, NOW())
            ON CONFLICT DO NOTHING;
          `;
        }
      }

      // 2. Mettre à jour l'épreuve
      const rows = await sql`
        UPDATE epreuves
        SET
          matiere_id       = COALESCE(${matiereId || null}, matiere_id),
          matiere_nom      = COALESCE(${finalMatiereNom || null}, matiere_nom),
          niveau           = COALESCE(${updates.niveau || null}, niveau),
          annee_academique = COALESCE(${updates.anneeAcademique || null}, annee_academique),
          type             = COALESCE(${updates.type || null}, type),
          titre            = COALESCE(${updates.titre !== undefined ? updates.titre : null}, titre),
          statut           = COALESCE(${updates.statut || null}, statut),
          uploader_nom     = COALESCE(${updates.uploaderNom || null}, uploader_nom),
          uploader_email   = COALESCE(${updates.uploaderEmail || null}, uploader_email)
        WHERE id = ${id}
        RETURNING *;
      `;

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        uploader_email: row.uploader_email,
        uploader_nom: row.uploader_nom,
        matiere_id: row.matiere_id,
        matiere_nom: row.matiere_nom,
        niveau: row.niveau,
        annee_academique: row.annee_academique,
        type: row.type,
        titre: row.titre || undefined,
        cloudinary_public_id: row.cloudinary_public_id,
        cloudinary_url: row.cloudinary_url,
        taille_octets: Number(row.taille_octets) || 0,
        type_fichier: row.type_fichier,
        nb_telechargements: Number(row.nb_telechargements) || 0,
        statut: row.statut as StatutEpreuve,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      };
    } catch (err) {
      console.error('Erreur AdminService.updateEpreuveDetails:', err);
      return null;
    }
  }

  /**
   * Statistiques complètes pour le tableau de bord
   */
  static async getFullAdminStats() {
    if (!isNeonConfigured()) {
      return {
        totalEpreuves: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalDownloads: 0,
        contributorsCount: 0,
        totalUsers: 0,
        totalAdmins: 0,
        totalLogins: 0,
        totalMatieres: 0,
      };
    }

    await ensureAdminTablesExist();

    try {
      const [epreuvesRes, usersRes, loginsRes, matieresRes] = await Promise.all([
        sql`
          SELECT 
            COUNT(*)::int AS total,
            COUNT(CASE WHEN statut = 'en_attente' THEN 1 END)::int AS pending,
            COUNT(CASE WHEN statut = 'approuve' THEN 1 END)::int AS approved,
            COUNT(CASE WHEN statut = 'rejete' THEN 1 END)::int AS rejected,
            COALESCE(SUM(nb_telechargements), 0)::int AS downloads,
            COUNT(DISTINCT uploader_email)::int AS contributors
          FROM epreuves;
        `,
        sql`
          SELECT 
            COUNT(*)::int AS total_users,
            COUNT(CASE WHEN role = 'admin' THEN 1 END)::int AS total_admins
          FROM utilisateurs;
        `,
        sql`
          SELECT COUNT(*)::int AS total_logins FROM connexions_log;
        `,
        sql`
          SELECT COUNT(*)::int AS total_matieres FROM matieres;
        `,
      ]);

      const eRow = epreuvesRes[0] || {};
      const uRow = usersRes[0] || {};
      const lRow = loginsRes[0] || {};
      const mRow = matieresRes[0] || {};

      return {
        totalEpreuves: Number(eRow.total) || 0,
        pendingCount: Number(eRow.pending) || 0,
        approvedCount: Number(eRow.approved) || 0,
        rejectedCount: Number(eRow.rejected) || 0,
        totalDownloads: Number(eRow.downloads) || 0,
        contributorsCount: Number(eRow.contributors) || 0,
        totalUsers: Number(uRow.total_users) || 0,
        totalAdmins: Number(uRow.total_admins) || 0,
        totalLogins: Number(lRow.total_logins) || 0,
        totalMatieres: Number(mRow.total_matieres) || 0,
      };
    } catch (err) {
      console.error('Erreur getFullAdminStats:', err);
      return {
        totalEpreuves: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalDownloads: 0,
        contributorsCount: 0,
        totalUsers: 0,
        totalAdmins: 0,
        totalLogins: 0,
        totalMatieres: 0,
      };
    }
  }
}
