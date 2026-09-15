# Plan d'Implémentation & Feuille de Route — Annale229-MBH

Ce document retrace l'état d'avancement des fonctionnalités, l'intégration des services cloud en production et la feuille de route des évolutions de la plateforme **Annale229-MBH**.

---

## 📊 Tableau d'Avancement des Fonctionnalités (V1.2)

| Composant / Fonctionnalité | Statut | Infrastructure & Technologies Associées |
|---|:---:|---|
| **Base de Données Relationnelle** | ✅ Opérationnel | Neon Serverless PostgreSQL (`proud-lake-48133023`) — 5 tables actives |
| **8 Matières Fondamentales MBH** | ✅ Alimenté | Table `matieres` initialisée (`m_phys01` à `m_tele08`) |
| **Périmètre Académique 3 Niveaux** | ✅ Opérationnel | Strictement 1ère, 2ème et 3ème année (Cycle Licence MBH) |
| **Authentification Google OAuth** | ✅ Opérationnel | NextAuth.js v4 avec accès sécurisé réservé aux utilisateurs connectés |
| **Onboarding Étudiant** (`/onboarding`) | ✅ Opérationnel | Enregistrement et mémorisation du niveau d'étude dès l'inscription |
| **Stockage Médias Primaire** | ✅ Opérationnel | Cloudinary v2 (`rg6py08a`) via `cloudinary-client.ts` |
| **Stockage Médias Alternatif** | ✅ Opérationnel | Neon Object Storage S3 (`annales229`) via `neon.ts` |
| **Assemblage Multi-Pages PDF** | ✅ Opérationnel | `pdf-lib` : fusion automatique des photos de sujets en 1 seul PDF |
| **Gestion des Corrigés & Barèmes** | ✅ Opérationnel | Choix binaire, onglets Sujet/Corrigé, téléchargement unifié ou distinct |
| **Pagination Stricte (10 par page)** | ✅ Opérationnel | Découpage par lots de 10 épreuves (`limit=10`, `page=1, 2, ...`) |
| **Visionneuse Native de Documents** | ✅ Opérationnel | Rendu net et direct (PDF/images) avec zoom, plein écran et téléchargement |
| **Partage Mobile Natif** | ✅ Opérationnel | Web Share API (`navigator.share`) vers WhatsApp/Telegram + fallback desktop |
| **Thème Clair & Sombre (Dark Mode)** | ✅ Opérationnel | Support intégral, bascule `ThemeToggle` et persistance `localStorage` |
| **Navigation & Profil Unifié** | ✅ Opérationnel | Menu desktop vitré, profil unifié avec fermeture au clic extérieur |
| **Console d'Administration** (`/admin`) | ✅ Opérationnel | Modération unitaire & en lot, `BulkUploadManager`, audit des connexions |
| **Pack d'Annales ZIP** (`/api/epreuves/zip`) | ✅ Opérationnel | Téléchargement groupé public selon filtres + export admin de sélections |
| **Résilience & Mock Store** | ✅ Opérationnel | `lib/storage/mock-store.ts` pour exécution hors-ligne |

---

## 🛠️ Détail des Réalisations Récentes

### 1. Cursus MBH Calibré & Onboarding Automatique
- Limitation stricte aux 3 promotions de la formation : **1ère année**, **2ème année** et **3ème année** (`VALID_NIVEAUX_PREDEFINIS`).
- Création du parcours d'onboarding sur `/onboarding` : dès sa première connexion Google, l'étudiant définit son niveau qui est enregistré dans la table `profils`.
- Le catalogue applique automatiquement le niveau de l'étudiant par défaut lors de chaque session.

### 2. Refonte de l'Authentification & Protection du Catalogue
- La landing page (`/`) est une vitrine de présentation accessible à tous.
- Tous les boutons d'action déclenchent l'authentification Google OAuth (`signIn('google')`).
- Sans être connecté, l'accès au catalogue (`/epreuves`), au dépôt (`/deposer`) et aux détails (`/epreuves/[id]`) est automatiquement redirigé vers l'accueil.

### 3. Logique de Pagination Stricte (10 Épreuves par Page)
- Remplacement du défilement infini ou des listes statiques par une vraie pagination serveur/client.
- Affichage de 10 épreuves par page exactement : navigation via *Précédent*, numéros de pages directes, *Suivant*, et compteur global.

### 4. Visionneuse Native & Téléchargement Unifié
- Abandon des iframes Google Docs sujettes aux dysfonctionnements.
- Visionneuse native robuste et épurée supportant PDF et images avec outils de zoom et mode plein écran.
- Onglets ergonomiques **Sujet** / **Corrigé**.
- Fusion dynamique automatique du sujet et du corrigé en un seul PDF téléchargeable grâce à `pdf-lib`.

### 5. Dépôt Multi-Pages avec Fusion Automatique
- Prise en charge de la sélection multiple de photos (recto/verso d'un sujet d'examen).
- Interface de réorganisation ordonnée des pages avec flèches de déplacement et suppression.
- Assemblage automatique en un document PDF unique avant téléversement.

### 6. Partage Mobile Natif
- Implémentation de la Web Share API (`navigator.share`).
- Sur téléphone portable, clic sur "Partager ce sujet" ouvrant directement le tiroir d'applications (WhatsApp, Telegram, Gmail, etc.).
- Fallback automatique avec copie dans le presse-papier et message toast sur ordinateur.

### 7. Système Thème Sombre & Ergonomie Visuelle
- Refonte complète des contrastes pour éliminer tout texte blanc sur fond clair.
- Palette sombre : `#0D1117` (fond), `#161B22` (cartes), `#21262D` (contrôles), `#30363D` (bordures), `#F0F6FC` (textes).
- Mémorisation du choix de thème dans le cache local (`annale229-theme`).
- Fusion du menu hamburger et du menu de profil en un composant unifié avec fermeture automatique au clic à l'extérieur.

---

## 🔮 Feuille de Route Future (Version 2.0)

- [ ] **Mode Hors-Ligne Avancé (PWA)** : Mise en cache locale des épreuves consultées pour réviser sans connexion internet.
- [ ] **Système de Commentaires & Entraide** : Fil de discussion académique sous chaque épreuve pour échanger sur la résolution des exercices.
- [ ] **Notifications de Modération** : Alerte email à l'étudiant lorsque son épreuve déposée est validée par l'administrateur.
- [ ] **Statistiques d'Apprentissage** : Suivi personnel des annales révisées et des matières maîtrisées.
