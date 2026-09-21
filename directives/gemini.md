# Directives pour Assistants IA & Développeurs — Annale229-MBH

Ce document définit les règles, contraintes techniques et standards de développement stricts que tout agent IA ou contributeur doit respecter lors de modifications sur ce référentiel.

---

## 1. Principes Fondamentaux & Stack Officielle

1. **Framework Principal** : Next.js 14 avec **App Router** (`app/`), Server Components par défaut, et TypeScript en mode strict.
2. **Base de Données** : **Neon Serverless PostgreSQL** (`@neondatabase/serverless`).
   - *Interdiction absolue* de réintroduire des dépendances vers Google Sheets API ou Google Drive v3 comme base de données.
3. **Stockage de Fichiers** : **Cloudinary v2** (`lib/storage/cloudinary.ts`).
4. **Authentification** : **NextAuth.js v4** (`lib/auth.ts`) combinant Google OAuth et Credentials Démo.
5. **Port Serveur de Développement** : Toujours exécuter sur le port **3005** (`npm run dev` lance `next dev -p 3005`).

---

## 2. Règle d'Or : Résilience & `DataService`

L'application est conçue selon un patron de **Double-Mode Résilient** :
- Tout accès aux données (épreuves, matières, utilisateurs, logs) doit impérativement transiter par `lib/data-service.ts` ou respecter l'aiguillage :
  - **Mode Live** : Actif si `process.env.DATABASE_URL` est présent $\rightarrow$ exécution des requêtes SQL Neon via `lib/db/queries.ts`.
  - **Mode Fallback / Mock** : Actif si `DATABASE_URL` est absent $\rightarrow$ exécution via `lib/db/mockStore.ts`.
- **Conséquence pour le code** : Si vous ajoutez une nouvelle opération sur les données (ex: suppression d'une matière, mise à jour de profil, édition des métadonnées d'une épreuve, ajout d'une correction, changement de rôle d'un utilisateur), vous **devez** implémenter à la fois :
  1. La méthode SQL dans `lib/db/queries.ts`.
  2. La méthode correspondante dans `lib/db/mockStore.ts`.
  3. L'exposition unifiée dans `lib/data-service.ts`.

---

## 3. Conventions TypeScript & App Router

### A. Rendu Côté Serveur vs Côté Client
- Conservez les pages et composants en **Server Components** dès que possible pour optimiser le SEO et la vitesse de chargement.
- N'ajoutez la directive `'use client'` que sur les composants qui en ont strictement besoin :
  - Composants utilisant des hooks React (`useState`, `useEffect`, `useCallback`...).
  - Composants avec gestionnaires d'événements utilisateur (`onClick`, `onChange`, `onSubmit`).
  - Composants utilisant `useSession()` de NextAuth.

### B. Typage Strict
- Tous les types de données fondamentaux doivent être importés depuis `types/index.ts`.
- Ne jamais utiliser le type `any`. Utilisez des types génériques, des types d'union ou `unknown` avec garde de type.

### C. Gestion des Réponses API
- Les Route Handlers (`app/api/**/route.ts`) doivent systématiquement retourner une instance de `NextResponse.json(...)` avec un code HTTP adapté :
  - `200 OK` : Lecture ou mise à jour réussie.
  - `201 Created` : Création de ressource.
  - `400 Bad Request` : Erreur de validation ou paramètres manquants.
  - `401 Unauthorized` : Utilisateur non authentifié.
  - `403 Forbidden` : Utilisateur authentifié mais sans droits suffisants (ex: non-admin sur `/api/admin/*`).
  - `500 Internal Server Error` : Erreur inattendue interceptée par un bloc `try / catch`.

---

## 3bis. Règle — Conversion & Fusion PDF

Tout fichier déposé (PDF, JPG, PNG, WebP, DOCX) est converti en PDF côté serveur avant l'upload Cloudinary définitif (`lib/utils/convert-to-pdf.ts`). Si une correction est fournie, elle est fusionnée à la suite du sujet en un seul PDF (`lib/utils/merge-pdf.ts`, `pdf-lib`) — c'est ce fichier fusionné, et lui seul, qui devient `cloudinary_public_id`/`cloudinary_url`. Ne jamais stocker le sujet et la correction comme deux téléchargements séparés côté étudiant.

## 3ter. Règle — Gestion des Comptes Administrateurs

L'onglet "Utilisateurs" du panel admin permet de promouvoir/rétrograder un compte via `PATCH /api/admin/utilisateurs`. Cette route vérifie côté serveur que l'appelant a `role='admin'` ET refuse toute tentative de rétrogradation de son propre email — jamais une simple désactivation de bouton côté client.

## 4. Sécurité & Bonnes Pratiques

> ⚠️ **`security-guidelines.md` est le document de référence contraignant en matière de sécurité.** Il doit être chargé en permanence au même titre que ce fichier. Les points ci-dessous en sont un résumé opérationnel, jamais un substitut.

1. **Injections SQL** : Toujours utiliser des requêtes paramétrées via le driver Neon. Ne jamais concaténer de chaînes non assainies dans du code SQL brut.
2. **Secrets d'Environnement** : Ne jamais préfixer des secrets par `NEXT_PUBLIC_`. Seuls les paramètres non sensibles (`NEXT_PUBLIC_APP_URL`) doivent être publics.
3. **Contrôle d'Accès** :
   - Protéger les actions administratives côté serveur en vérifiant la session de l'utilisateur contre `ADMIN_EMAIL` ou le rôle en base avant d'exécuter l'action.
4. **Validation des Fichiers Téléversés** :
   - Vérifier côté serveur l'extension, le type MIME et la taille maximale autorisée (15 Mo).

---

## 5. Respect du Design System

- Utiliser exclusivement les tokens Tailwind définis dans `tailwind.config.ts` :
  - Couleur primaire : `bg-brand-primary`, `text-brand-primary`, `hover:bg-brand-hover`.
  - Accent / Succès : `text-knowledge-accent`, `bg-knowledge-accent`.
  - Types d'épreuves : Utiliser les classes sémantiques ou les composants dédiés (`TypeSegmentedControl`, badges de couleur).
- Toujours privilégier les icônes de la bibliothèque **`lucide-react`**.
- Adhérer aux classes utilitaires de `app/globals.css` (`.glass-card`, `.glass-nav`, `.shimmer`).

---

## 6. Commandes et Scripts de Maintenance

- Lancer le serveur local :
  ```bash
  npm run dev
  ```
- Vérifier la configuration des variables d'environnement :
  ```bash
  npm run check-config
  ```
- Créer ou réinitialiser le schéma Neon PostgreSQL :
  ```bash
  npm run setup-db
  ```
- Compiler pour la production et tester le build :
  ```bash
  npm run build
  ```
