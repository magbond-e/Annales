# Directives Techniques Complètes — Annale229-MBH

Ce dossier rassemble l'ensemble des spécifications, de l'architecture, du modèle de données et des guides de développement pour la plateforme **Annale229-MBH** (Annales et ressources d'examen pour la filière **Maintenance Biomédicale et Hospitalière — MBH**, École Polytechnique d'Abomey-Calavi / EPAC, Université d'Abomey-Calavi, Bénin).

---

## 📚 Sommaire des Directives

| Document | Rôle & Contenu |
|---|---|
| [**PRD-Annale229-MBH-V1.md**](./PRD-Annale229-MBH-V1.md) | **Cahier des charges produit (PRD)** : Vision produit, cursus MBH EPAC (1ère à 3ème année), parcours d'onboarding, personas, fonctionnalités réelles et critères de succès. |
| [**architecture.md**](./architecture.md) | **Architecture technique globale** : Next.js 14 App Router, Neon PostgreSQL (`proud-lake-48133023`), Cloudinary v2 & Neon S3 (`annales229`), NextAuth (Google OAuth), DataService résilient, assemblage PDF (`pdf-lib`). |
| [**data-model.md**](./data-model.md) | **Modèle de données & Schéma SQL** : Tables Neon actives (`matieres`, `epreuves`, `profils`, `utilisateurs`, `connexions_log`), support des corrigés/barèmes, index GIN plein texte et pagination stricte. |
| [**build-plan.md**](./build-plan.md) | **Plan d'implémentation & Roadmap** : État d'avancement des fonctionnalités live, onboarding, pagination par 10, visionneuse native, dark mode et perspectives futures. |
| [**design-system.md**](./design-system.md) | **Charte graphique & UI Tokens** : Palette Deep Teal (`#0F4C5C`) & Emerald (`#10B981`), Dark Mode (`#0D1117`, `#161B22`, `#21262D`, `#30363D`), glassmorphism et micro-interactions. |
| [**user-flows.md**](./user-flows.md) | **Parcours utilisateurs détaillés** : Découverte landing page, connexion Google obligatoire, onboarding niveau, pagination par 10, multi-pages avec fusion PDF, partage mobile natif, et console admin. |
| [**landing-page.md**](./landing-page.md) | **Spécifications de la page d'accueil** : Structure Hero, navigation unifiée, aperçu interactif du catalogue, CTAs Google exclusifs, bascule Dark Mode et FAQ. |
| [**gemini.md**](./gemini.md) | **Règles & Directives pour agents IA** : Emplacements stricts des fichiers, intégrité Neon live, gestion des 3 niveaux MBH, règles Dark Mode et résilience. |

---

## ⚡ Stack Technologique Réelle & Infrastructure Active

- **Framework Web** : Next.js 14 (App Router, Server Components + Route Handlers).
- **Langage** : TypeScript en mode strict.
- **Base de données Live** : **Neon Serverless PostgreSQL** (Projet `proud-lake-48133023`, branche `production`, région AWS `us-east-2`, driver `@neondatabase/serverless`).
- **Stockage Fichiers (PDF & Images)** :
  - **Cloudinary v2** (Cloud Name `rg6py08a` — uploads signés et CDN sécurisé).
  - **Neon Object Storage** (Bucket S3 `annales229` configuré dans `neon.ts`, endpoint `https://br-winter-glade-ay3z1pgq.storage.c-5.us-east-2.aws.neon.tech`).
- **Assemblage & Fusion PDF** : `pdf-lib` (assemblage automatique de photos multi-pages et fusion Sujet + Corrigé).
- **Authentification & Accès** : **NextAuth.js v4** (Google OAuth 2.0 exclusif) + **Onboarding automatique** (`/onboarding`) pour mémoriser le niveau académique dès la première connexion.
- **Couche d'Abstraction Résiliente** : `DataService` (`lib/storage/data-service.ts`) & `AdminService` (`lib/storage/admin-service.ts`) avec basculement automatique sur `lib/storage/mock-store.ts` en cas d'indisponibilité réseau.
- **Thème & Design** : Thème Clair & Sombre (Dark Mode) avec stockage dans `localStorage` (`annale229-theme`), Tailwind CSS avec variables CSS réactives.
- **Partage Social** : Web Share API native (`navigator.share`) avec fallback presse-papier sur desktop.
- **Port de Développement Local** : **3005** (`npm run dev`).

---

## 🎯 Données Réelles Insérées & Cursus MBH

La base de données Neon en production contient d'ores et déjà :
- **8 Matières Fondamentales MBH** :
  1. `m_phys01` : *Physique Médicale*
  2. `m_elec02` : *Électronique Médicale*
  3. `m_imag03` : *Imagerie Médicale & Radiologie*
  4. `m_maint04` : *Maintenance des Équipements Hospitaliers*
  5. `m_anat05` : *Anatomie & Physiologie Humaine*
  6. `m_secu06` : *Sécurité & Normes Hospitalières*
  7. `m_inst07` : *Instrumentation Biomédicale*
  8. `m_tele08` : *Télémédecine & Systèmes d'Information*
- **Niveaux Académiques du Cursus EPAC** :
  - **Strictement : `1ère année`, `2ème année`, `3ème année`** (Cycle Licence MBH).
- **Types d'Épreuves Valides** :
  - `devoir` (Devoirs surveillés continus)
  - `rattrapage` (Sessions de rattrapage)
- **Compte Administrateur / Délégué Référent** :
  - `ulrrichmagbonde@gmail.com` (Ulrich MAGBONDE, rôle `admin`).

---

## 🚀 Démarrage & Configuration Locale

### 1. Cloner et installer les dépendances
```bash
npm install
```

### 2. Variables d'Environnement (`.env.local`)
Le fichier `.env.local` est configuré avec les services actifs :

```ini
# Port d'écoute et Authentification NextAuth
NEXTAUTH_URL=http://localhost:3005
NEXTAUTH_SECRET=<votre-secret-32-chars-min>
ADMIN_EMAIL=<email-administrateur-principal>
SUPER_ADMIN_EMAIL=<email-super-admin-fondateur>

# Google OAuth (Obligatoire pour l'accès complet)
GOOGLE_CLIENT_ID=<votre-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<votre-client-secret>

# Neon Serverless PostgreSQL
DATABASE_URL="postgresql://neondb_owner:<mdp>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:<mdp>@<host>.<region>.aws.neon.tech/neondb?sslmode=require"
NEON_BRANCH=production
NEON_DATA_API_URL=https://<host>.apirest.<region>.aws.neon.tech/neondb/rest/v1

# Cloudinary CDN
CLOUDINARY_CLOUD_NAME=<votre-cloud-name>
CLOUDINARY_API_KEY=<votre-api-key>
CLOUDINARY_API_SECRET=<votre-api-secret>

# Neon Object Storage (S3-compatible)
AWS_ACCESS_KEY_ID=nak_live_<votre-clé>
AWS_SECRET_ACCESS_KEY=nsk_live_<votre-clé>
AWS_ENDPOINT_URL_S3=https://<bucket-endpoint>.storage.<region>.aws.neon.tech
AWS_REGION=us-east-2
```

### 3. Commandes Utiles
- **Lancer l'application** : `npm run dev` (accessible sur `http://localhost:3005`).
- **Auditer la configuration** : `npm run check-config`.
- **Réinitialiser le schéma Neon** : `npm run setup-db`.
- **Espace Administrateur & Modération** : `http://localhost:3005/admin`.
