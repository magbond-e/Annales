-- ==============================================================
-- Annale229 MBH — Schéma PostgreSQL (Neon)
-- Exécuter dans la console SQL de neon.tech
-- ==============================================================

-- ─── Table : matieres ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matieres (
  id               TEXT        PRIMARY KEY,
  nom              TEXT        NOT NULL,
  created_by_email TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contrainte d'unicité sur le nom normalisé (insensible à la casse)
CREATE UNIQUE INDEX IF NOT EXISTS idx_matieres_nom_lower
  ON matieres (LOWER(nom));

-- ─── Table : epreuves ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS epreuves (
  id                   TEXT        PRIMARY KEY,
  uploader_email       TEXT        NOT NULL,
  uploader_nom         TEXT        NOT NULL,
  matiere_id           TEXT        NOT NULL REFERENCES matieres(id) ON DELETE RESTRICT,
  matiere_nom          TEXT        NOT NULL,
  niveau               TEXT        NOT NULL,
  annee_academique     TEXT        NOT NULL,
  type                 TEXT        NOT NULL CHECK (type IN ('devoir', 'rattrapage')),
  titre                TEXT,
  cloudinary_public_id TEXT        NOT NULL,
  cloudinary_url       TEXT        NOT NULL,
  taille_octets        INTEGER     NOT NULL DEFAULT 0,
  type_fichier         TEXT        NOT NULL,
  nb_telechargements   INTEGER     NOT NULL DEFAULT 0,
  statut               TEXT        NOT NULL DEFAULT 'approuve' CHECK (statut IN ('en_attente', 'approuve', 'rejete')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Neon Object Storage (miroir S3)
  s3_key               TEXT,
  s3_url               TEXT,
  -- Corrigé & Barème
  has_corrige          BOOLEAN     NOT NULL DEFAULT FALSE,
  corrige_url          TEXT,
  corrige_cloudinary_public_id TEXT,
  corrige_s3_key       TEXT,
  corrige_type_fichier TEXT,
  corrige_taille_octets INTEGER    NOT NULL DEFAULT 0
);

-- Index de performances pour les filtres courants
CREATE INDEX IF NOT EXISTS idx_epreuves_matiere_id   ON epreuves (matiere_id);
CREATE INDEX IF NOT EXISTS idx_epreuves_niveau        ON epreuves (niveau);
CREATE INDEX IF NOT EXISTS idx_epreuves_annee         ON epreuves (annee_academique);
CREATE INDEX IF NOT EXISTS idx_epreuves_type          ON epreuves (type);
CREATE INDEX IF NOT EXISTS idx_epreuves_uploader      ON epreuves (uploader_email);
CREATE INDEX IF NOT EXISTS idx_epreuves_statut        ON epreuves (statut);
CREATE INDEX IF NOT EXISTS idx_epreuves_created_at    ON epreuves (created_at DESC);

-- Index de recherche textuelle sur matiere_nom et titre
CREATE INDEX IF NOT EXISTS idx_epreuves_matiere_nom_search
  ON epreuves USING gin(to_tsvector('french', matiere_nom));
CREATE INDEX IF NOT EXISTS idx_epreuves_titre_search
  ON epreuves USING gin(to_tsvector('french', COALESCE(titre, '')));

-- ─── Table : profils ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profils (
  email      TEXT        PRIMARY KEY,
  nom        TEXT        NOT NULL,
  niveau     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table : utilisateurs ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  email      TEXT        PRIMARY KEY,
  nom        TEXT        NOT NULL,
  image      TEXT,
  role       TEXT        NOT NULL DEFAULT 'etudiant' CHECK (role IN ('admin', 'etudiant')),
  niveau     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table : connexions_log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS connexions_log (
  id         TEXT        PRIMARY KEY,
  user_email TEXT        NOT NULL,
  user_nom   TEXT,
  provider   TEXT        NOT NULL DEFAULT 'google',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connexions_user_email ON connexions_log (user_email);
CREATE INDEX IF NOT EXISTS idx_connexions_created_at ON connexions_log (created_at DESC);

-- ─── Données initiales : Matières MBH ─────────────────────────
INSERT INTO matieres (id, nom, created_by_email, created_at) VALUES
  ('m_phys01', 'Physique Médicale',                        'system', '2025-01-10T08:00:00Z'),
  ('m_elec02', 'Électronique Médicale',                    'system', '2025-01-10T08:05:00Z'),
  ('m_imag03', 'Imagerie Médicale & Radiologie',           'system', '2025-01-10T08:10:00Z'),
  ('m_maint04','Maintenance des Équipements Hospitaliers', 'system', '2025-01-10T08:15:00Z'),
  ('m_anat05', 'Anatomie & Physiologie Humaine',           'system', '2025-01-10T08:20:00Z'),
  ('m_secu06', 'Sécurité & Normes Hospitalières',          'system', '2025-01-10T08:25:00Z'),
  ('m_inst07', 'Instrumentation Biomédicale',              'system', '2025-01-10T08:30:00Z'),
  ('m_tele08', 'Télémédecine & Systèmes d''Information',   'system', '2025-01-10T08:35:00Z')
ON CONFLICT DO NOTHING;
