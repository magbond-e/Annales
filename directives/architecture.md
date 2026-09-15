# Architecture Technique Complète — Annale229-MBH

Ce document décrit l'architecture logicielle, les flux de données, l'infrastructure cloud, la sécurité et les couches applicatives de la plateforme **Annale229-MBH**.

---

## 1. Vue d'Ensemble & Diagramme Système

Annale229-MBH repose sur **Next.js 14** (App Router) et s'articule autour d'une infrastructure cloud moderne combinant **Neon Serverless PostgreSQL**, **Cloudinary v2**, **Neon Object Storage S3**, **NextAuth.js** et **pdf-lib**.

```mermaid
graph TD
    User([Étudiant / Enseignant / Délégué]) -->|HTTPS / Navigateur| NextApp[Next.js 14 App Router - Port 3005]

    subgraph "Application Layer (Next.js 14)"
        Pages[Pages App Router<br/>/, /onboarding, /epreuves, /epreuves/:id, /deposer, /mes-depots, /admin]
        RouteHandlers[API Route Handlers<br/>/api/epreuves, /api/matieres, /api/profil, /api/admin/*]
        NextAuth[NextAuth.js v4<br/>Google OAuth 2.0 & Session]
        PDFLib[pdf-lib<br/>Assemblage Multi-pages & Fusion Sujet+Corrigé]
        ThemeEngine[Theme Engine<br/>localStorage 'annale229-theme' + class 'dark']
        
        subgraph "Business & Persistence Layer (lib/storage/)"
            DataService[DataService<br/>Recherche, Épreuves, Corrigés, Profils, Pagination]
            AdminService[AdminService<br/>Modération groupée, Audit, Gestion Matières]
            MockStore[(In-Memory MockStore<br/>Données de secours MBH)]
        end
    end

    subgraph "Infrastructure Cloud Active"
        NeonDB[(Neon PostgreSQL Live<br/>Branche: production - us-east-2)]
        Cloudinary[Cloudinary v2 CDN<br/>Uploads, PDF & Images signés]
        NeonS3[Neon Object Storage S3<br/>Bucket: annales229<br/>Stockage S3-Compatible]
    end

    Pages --> RouteHandlers
    Pages --> NextAuth
    Pages --> ThemeEngine
    RouteHandlers --> DataService
    RouteHandlers --> AdminService
    RouteHandlers --> PDFLib

    DataService -->|isNeonConfigured()| NeonDB
    DataService -->|Fallback sans DB| MockStore
    DataService -->|Stockage Médias| Cloudinary
    DataService -.->|Stockage Miroir S3| NeonS3

    AdminService --> NeonDB
```

---

## 2. Couches Applicatives & Arborescence

### A. Présentation & Rendu (`app/`, `components/`)

- **`app/page.tsx` (Landing Page)** :
  - Page d'accueil dynamique avec présentation du cursus MBH (1ère à 3ème année).
  - Orbes ambient et effet de parallaxe souris.
  - CTAs exclusifs vers la connexion Google OAuth (`signIn('google')`).
  - Mockup UI interactif du catalogue avec aperçu des devoirs et rattrapages.
  - Bouton de bascule de thème (`ThemeToggle`) intégré au header sticky.
- **`app/onboarding/page.tsx` (Onboarding Profil)** :
  - Redirection automatique pour les nouveaux étudiants connectés sans niveau renseigné.
  - Sélection tactile intuitive parmi les 3 niveaux : `1ère année`, `2ème année`, `3ème année` MBH.
  - Enregistrement immédiat via `POST /api/profil` dans la table `profils`.
- **`app/epreuves/page.tsx` (Catalogue & Moteur de Recherche)** :
  - Authentification requise (protection par session).
  - Pré-filtrage automatique selon le niveau mémorisé du profil étudiant.
  - **Pagination stricte par tranches de 10 épreuves** (`limit=10`, `page=1, 2, ...`).
  - Filtres combinés : Niveau, Matière, Type (`devoir`, `rattrapage`), Année académique (`AAAA-AAAA`), et présence de corrigé.
  - Téléchargement de pack d'annales en archive ZIP (`/api/epreuves/zip`).
- **`app/epreuves/[id]/page.tsx` (Détail, Visionneuse & Corrigé)** :
  - Visionneuse de document native haute lisibilité (PDF et images).
  - Contrôles de zoom (`+`, `-`, `100%`), bascule plein écran, téléchargement direct.
  - Double onglet **Sujet** / **Corrigé**.
  - Formulaire modal d'ajout de corrigé / barème.
  - Téléchargement avec fusion dynamique automatique Sujet + Corrigé via `pdf-lib`.
  - **Bouton de partage mobile natif (`navigator.share`)** avec ouverture de la feuille de partage WhatsApp/Telegram/etc.
- **`app/deposer/page.tsx` (Dépôt Collaboratif)** :
  - Saisie assistée avec `MatiereCombobox`.
  - Sélection multi-fichiers avec prévisualisation des pages numérotées, réorganisation ordonnée (Monter / Descendre) et suppression.
  - Assemblage automatique des pages en 1 seul PDF avant publication.
  - Section Corrigé avec choix binaire "Non" / "Oui, j'ai le corrigé !" et téléversement associé.
- **`app/mes-depots/page.tsx` (Espace Contributeur)** :
  - Tableau de bord des contributions de l'étudiant avec statuts de modération (`en_attente`, `approuve`, `rejete`).
  - Actions rapides : consultation et suppression définitive de ses propres documents.
- **`app/admin/page.tsx` (Console d'Administration & Modération)** :
  - Contrôle d'accès strict (`ulrrichmagbonde@gmail.com` ou rôle `admin`).
  - Modération par sélection multiple : approbation, rejet ou suppression groupée atomique SQL.
  - `BulkUploadManager` : import massif avec application en 1 clic des propriétés sur tout le lot.
  - Gestion du référentiel des matières MBH et audit des connexions (`connexions_log`).

### B. Composants Clés & Design System (`components/`)

| Composant | Description & Responsabilité |
|---|---|
| `Navbar.tsx` | En-tête principal responsive avec menu pilule central (desktop), profil unifié (fermeture au clic extérieur), bascule de thème et badge admin. |
| `ThemeToggle.tsx` | Bascule fluide clair/sombre avec icônes Sun/Moon et sauvegarde dans `localStorage`. |
| `EpreuveCard.tsx` | Carte d'épreuve avec badges colorés (Devoir, Rattrapage, Corrigé), métadonnées et actions. |
| `SearchBar.tsx` | Champ de recherche avec raccourci clavier `Ctrl+K` et bouton d'effacement rapide. |
| `TypeSegmentedControl.tsx` | Sélecteur segmenté Tous / Devoirs / Rattrapages. |
| `FilterChips.tsx` | Filtres flottants avec panneaux déroulants pour le niveau, l'année académique et les matières. |
| `MatiereCombobox.tsx` | Recherche prédictive parmi les 8 cours MBH et ajout dynamique de nouvelle matière. |
| `ConfirmModal.tsx` | Modale de confirmation sécurisée (ex: suppression d'épreuve). |
| `BottomNavCTA.tsx` | Bouton flottant d'accès rapide au dépôt sur mobile. |

### C. Couche Métier & Résilience (`lib/storage/`)

- **`DataService` (`lib/storage/data-service.ts`)** :
  - Point d'accès unique pour les requêtes de consultation, filtres, pagination, et insertion.
  - Détection automatique de l'état de la connexion Neon via `isNeonConfigured()`.
  - Basculement transparent vers `MockStore` (`lib/storage/mock-store.ts`) en cas d'indisponibilité.
- **`AdminService` (`lib/storage/admin-service.ts`)** :
  - Gestion des rôles utilisateurs, vérification des privilèges administrateur.
  - Journalisation des accès (`connexions_log`).
  - Modération groupée et suppression en cascade (base Neon + Cloudinary + Neon S3).

---

## 3. Données & Schéma PostgreSQL (`lib/db/`)

- **Moteur** : Neon Serverless PostgreSQL.
- **Pilote** : `@neondatabase/serverless` avec tagged template literals `sql` immunisés contre les injections SQL.
- **Indexation de performance** :
  - Index B-tree sur clés étrangères et filtres : `matiere_id`, `niveau`, `annee_academique`, `type`, `statut`, `created_at`.
  - Index GIN plein texte français pour la recherche instantanée :
    ```sql
    CREATE INDEX idx_epreuves_matiere_nom_search ON epreuves USING gin(to_tsvector('french', matiere_nom));
    CREATE INDEX idx_epreuves_titre_search ON epreuves USING gin(to_tsvector('french', COALESCE(titre, '')));
    ```

---

## 4. Stockage des Fichiers & Fusion PDF

1. **Cloudinary v2 (`lib/storage/cloudinary-client.ts`)** :
   - Traitement des images et documents PDF avec URL sécurisées HTTPS et CDN haute vitesse.
2. **Neon Object Storage S3 (`lib/storage/s3-client.ts`)** :
   - Bucket S3 `annales229` en réplication miroir pour la redondance et la pérennité des archives.
3. **pdf-lib (`lib/utils/pdf-merger.ts` & Route Handlers)** :
   - Conversion des photos de téléversement (JPG, PNG, HEIC) en pages PDF standardisées.
   - Assemblage multi-pages ordonné selon la séquence validée par l'étudiant.
   - Concaténation dynamique du sujet et du corrigé lors du téléchargement groupé.

---

## 5. Système de Thème & Design Tokens

- **Architecture réactive** :
  - Contexte React `ThemeProvider` dans `app/providers.tsx`.
  - Détection initiale de la préférence système (`prefers-color-scheme: dark`) ou lecture de `localStorage.getItem('annale229-theme')`.
  - Application de la classe `.dark` sur la balise `<html>`.
- **Palette Dark Mode Haute Lisibilité** :
  - Fond global : `#0D1117`
  - Cartes & conteneurs : `#161B22`
  - Contrôles, sélecteurs, inputs : `#21262D`
  - Bordures & séparateurs : `#30363D`
  - Textes : `#F0F6FC` (titres / fort contraste), `slate-300` / `slate-400` (secondaires).
