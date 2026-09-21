# Directives Techniques — Annale229-MBH

Ce dossier rassemble l'ensemble des spécifications, de l'architecture, du modèle de données et des guides de développement pour la plateforme **Annale229-MBH** (Annales et ressources d'examen pour la filière MBH — Maintenance Biomédicale et Hospitalière, EPAC / Bénin).

---

## 📚 Sommaire des Directives

| Document | Rôle & Contenu |
|---|---|
| [**PRD-Annale229-MBH-V1.md**](./PRD-Annale229-MBH-V1.md) | **Cahier des charges produit (PRD)** : Problématique, vision, persona étudiant/délégué/admin, fonctionnalités clés et critères de succès. |
| [**architecture.md**](./architecture.md) | **Architecture technique globale** : Next.js 14 App Router, Neon PostgreSQL, Cloudinary, NextAuth.js, DataService avec fallback résilient, et panel d'administration. |
| [**data-model.md**](./data-model.md) | **Modèle de données & Schéma SQL** : Tables Neon PostgreSQL (`matieres`, `epreuves`, `profils`, `utilisateurs`, `connexions_log`), types TypeScript et store de secours. |
| [**build-plan.md**](./build-plan.md) | **Plan d'implémentation & Roadmap** : État d'avancement des phases V1 (fondations, authentification, dépôt, consultation, modération) et backlog V1.1 / V2. |
| [**design-system.md**](./design-system.md) | **Charte graphique & UI Tokens** : Palette Deep Teal (`#0F4C5C`) & Emerald (`#10B981`), typographies, micro-animations, glassmorphism, et composants réutilisables. |
| [**user-flows.md**](./user-flows.md) | **Parcours utilisateurs détaillés** : De la découverte à la consultation, au dépôt d'épreuve, au mode démo, jusqu'à la modération et gestion admin. |
| [**landing-page.md**](./landing-page.md) | **Spécifications de la page d'accueil** : Structure du Hero, navigation vitrée, modal de connexion démo, aperçu interactif des annales et FAQ. |
| [**legal-pages.md**](./legal-pages.md) | **Pages légales** : modèles de départ pour Mentions légales, CGU, Politique de confidentialité et Politique de cookies — à faire valider par un juriste. |
| [**security-guidelines.md**](./security-guidelines.md) | **Directives de sécurité contraignantes** : modèle de menace, gestion des secrets, contrôle d'accès, validation des uploads, dépendances, en-têtes HTTP et checklist de mise en production. À charger en permanence dans l'IDE. |
| [**security-audit-prompt.md**](./security-audit-prompt.md) | **Prompt d'audit de sécurité complet** : 10 axes d'audit, format de rapport attendu, prompt de correction et tests manuels de vérification. |
| [**gemini.md**](./gemini.md) | **Règles & Directives pour agents IA** : Bonnes pratiques de code, règles strictes d'architecture, sécurité, gestion des erreurs et conventions TypeScript/React. |

---

## ⚡ Stack Technologique Réelle

- **Framework** : Next.js 14 (App Router, Server Components + API Routes).
- **Langage** : TypeScript (mode strict).
- **Base de données** : **Neon Serverless PostgreSQL** (driver `@neondatabase/serverless` avec pooling SSL et recherche plein texte en français).
- **Stockage Fichiers (PDF & Images)** : **Cloudinary v2** (Cloudinary Node.js SDK avec uploads signés et URLs sécurisées).
- **Authentification** : **NextAuth.js v4** (Google OAuth 2.0 + Provider Credentials Démo pour revues et tests locaux).
- **Couche d'abstraction résiliente** : `DataService` (`lib/data-service.ts`) assurant un basculement automatique et transparent vers un mock store en mémoire (`mockStore.ts` & `mockStorage.ts`) lorsque la base ou Cloudinary n'est pas configuré.
- **Styling** : Tailwind CSS avec variables CSS HSL, typographie Google Fonts (*Inter* + *Plus Jakarta Sans*), effets de glassmorphism et composants animés.
- **Icônes** : Lucide React.

---

## 🚀 Démarrage Rapide

### 1. Cloner le projet et installer les dépendances
```bash
npm install
```

### 2. Configuration des Variables d'Environnement
Créez un fichier `.env.local` à la racine à partir de `.env.example` :

```ini
# Base de Données (Neon Serverless PostgreSQL)
DATABASE_URL="postgres://user:password@ep-cool-project-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Stockage Fichiers (Cloudinary)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Authentification NextAuth
NEXTAUTH_URL="http://localhost:3005"
NEXTAUTH_SECRET="votre-secret-robuste-genere-via-openssl"

# Google OAuth
GOOGLE_CLIENT_ID="votre-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="votre-client-secret"

# Rôles Administrateurs (emails séparés par des virgules)
ADMIN_EMAIL="ulrrichmagbonde@gmail.com,elon.epac@gmail.com"

# URL publique de l'application
NEXT_PUBLIC_APP_URL="http://localhost:3005"
```

> **Note de Résilience :** Même sans identifiants Neon ou Cloudinary fournis, l'application fonctionne immédiatement en mode démo / mock store en mémoire pour le développement UI !

### 3. Initialiser la Base de Données (Optionnel si Neon connecté)
Pour appliquer le schéma SQL et injecter les matières officielles de MBH :
```bash
npm run setup-db
```
Pour vérifier l'état de votre configuration :
```bash
npm run check-config
```

### 4. Lancer le Serveur de Développement
L'application est configurée pour tourner sur le port **3005** :
```bash
npm run dev
# Accès sur http://localhost:3005
```

---

## 🛡️ Modération & Administration

Un espace d'administration est disponible sur `/admin` pour les utilisateurs dont l'email figure dans la variable `ADMIN_EMAIL` ou possède le rôle `admin` dans la table `utilisateurs` :
- Validation ou rejet des épreuves soumises par les étudiants avec motifs.
- Édition des métadonnées d'un dépôt existant et ajout a posteriori d'une correction manquante (fusion PDF automatique).
- Ajout, modification et suppression des matières académiques.
- Gestion des comptes administrateurs : promotion/rétrogradation d'un compte (onglet Utilisateurs), jamais sur son propre compte.
- Métriques clés (total épreuves, contributeurs, téléchargements, vues, taux d'approbation, courbe des dépôts).
- Suivi des profils étudiants et logs des connexions récentes.

Tout fichier déposé (PDF, image ou DOCX) est converti automatiquement en PDF avant stockage ; si une correction est fournie, elle est fusionnée avec le sujet en un seul document.
