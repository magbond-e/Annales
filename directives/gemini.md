# Directives pour Assistants IA & Développeurs — Annale229-MBH

Ce document définit les règles impératives, contraintes techniques et standards de développement que tout assistant IA ou développeur doit scrupuleusement respecter sur ce projet.

---

## 1. Stack Officielle & Infrastructure Active

1. **Framework** : Next.js 14 (App Router, Server Components par défaut, TypeScript strict).
2. **Base de Données en Production** : **Neon Serverless PostgreSQL** (configurée via `DATABASE_URL`, branche `production`).
   - *Règle critique* : La base Neon contient des données réelles et des épreuves actives. **Ne jamais exécuter de commandes destructives (`DROP TABLE`, `TRUNCATE`)**.
3. **Stockage Fichiers & Médias** :
   - **Cloudinary v2** via `lib/storage/cloudinary-client.ts` (configuré via `CLOUDINARY_*`).
   - **Neon Object Storage S3** via `neon.ts` et `lib/storage/s3-client.ts` (configuré via `AWS_*`).
4. **Assemblage & Manipulation PDF** : `pdf-lib` pour l'assemblage multi-pages et la fusion Sujet + Corrigé.
5. **Authentification** : NextAuth.js v4 (`lib/auth.ts`) avec Google OAuth 2.0. L'accès au catalogue et aux fonctionnalités applicatives nécessite une session active.
6. **Port de Développement Local** : Toujours exécuter sur le port **3005** (`npm run dev`).

---

## 2. Emplacements des Fichiers & Structure Obligatoire

Ne jamais inventer d'arborescence alternative. Respecter les chemins existants du projet :

- **Couche Données Métier** : `lib/storage/data-service.ts`
- **Couche Administration & Logs** : `lib/storage/admin-service.ts`
- **Store de Données de Secours** : `lib/storage/mock-store.ts`
- **Client Cloudinary** : `lib/storage/cloudinary-client.ts`
- **Client SQL Neon** : `lib/db/neon.ts`
- **Schéma SQL & DDL** : `lib/db/schema.sql` et `lib/db/schema-init.ts`
- **Config Neon (Auth & S3)** : `neon.ts`
- **Typages Globaux** : `types/index.ts`
- **Règles de Validation** : `lib/utils/validation.ts`
- **Gestion du Thème** : `app/providers.tsx` et `components/ThemeToggle.tsx`

---

## 3. Règle d'Or : Résilience via `DataService`

Toute manipulation de données (consultation, création d'épreuve, mise à jour de statut, ajout de matière, profil) doit obligatoirement passer par `DataService` (`lib/storage/data-service.ts`) :
- Si Neon est configuré $\rightarrow$ exécution de la requête SQL paramétrée via le client `sql` de `lib/db/neon.ts`.
- Si Neon est indisponible $\rightarrow$ basculement automatique sur `mockStore` (`lib/storage/mock-store.ts`).
- **Conséquence** : Toute nouvelle méthode ajoutée dans `DataService` doit implémenter les deux branches (Neon SQL et MockStore).

---

## 4. Règles Métier Spécifiques au Cursus MBH

1. **Niveaux Académiques Stricts** :
   - Le cursus MBH EPAC sur cette plateforme est calibré **exclusivement sur 3 années** :
     `VALID_NIVEAUX_PREDEFINIS = ['1ère année', '2ème année', '3ème année']`.
   - Ne jamais réintroduire de 4ème ou 5ème année.
2. **Types d'Épreuves Autorisés** :
   - Strictement `'devoir'` et `'rattrapage'` (`VALID_TYPES = ['devoir', 'rattrapage']`). Le type examen général a été fusionné/retiré.
3. **Formats de Fichiers & Poids** :
   - `'pdf'`, `'jpg'`, `'png'`, `'heic'` avec un plafond strict de **15 Mo** (`MAX_FILE_SIZE_BYTES`).
4. **Pagination Stricte du Catalogue** :
   - Les requêtes et affichages du catalogue doivent respecter la pagination par tranches de **10 épreuves** (`limit=10`).
   - Ne jamais charger la totalité des épreuves en mémoire d'un bloc.
5. **Administrateur Référent** :
   - L'email administrateur est configuré via la variable d'environnement `ADMIN_EMAIL`.
   - Le super-admin fondateur (non rétrôgradable) est configuré via `SUPER_ADMIN_EMAIL`.
   - Toute route administrative (`/api/admin/*`) doit vérifier que la session correspond à un admin enregistré en base (`isUserAdminAsync()`) ou dans les env vars.

---

## 5. Système de Thème (Dark Mode)

1. **Bascule de thème** :
   - Le bouton `ThemeToggle` est accessible dans la barre de navigation principale (côté droit).
   - Il n'est **pas** présent dans le menu déroulant du profil utilisateur.
2. **Zéro Texte Illisible en Mode Sombre** :
   - Ne **jamais** utiliser de classes statiques `bg-white`, `bg-slate-50`, `text-slate-900` sans leur équivalent sombre (`dark:bg-[#161B22]`, `dark:bg-[#21262D]`, `dark:text-[#F0F6FC]`, `dark:border-[#30363D]`).
3. **Palette Sombre Homogène** :
   - Fond d'écran global : `#0D1117`
   - Cartes et panneaux : `#161B22`
   - Contrôles, sélecteurs et inputs : `#21262D`
   - Bordures et séparateurs : `#30363D`
   - Textes primaires / titres : `#F0F6FC`
   - Textes secondaires : `slate-300` / `slate-400`
4. **Persistance dans le Cache Local** :
   - Toujours conserver la clé `annale229-theme` dans `localStorage` pour une transition synchrone sans scintillement.

---

## 6. Bonnes Pratiques TypeScript & Next.js

1. **Server vs Client Components** :
   - Garder les composants en Server Components par défaut.
   - N'ajouter `'use client'` qu'en cas d'utilisation de hooks (`useState`, `useEffect`) ou d'événements interactifs.
2. **Sécurité SQL** :
   - Utiliser systématiquement les tagged template literals `sql` de `@neondatabase/serverless` pour prévenir toute injection SQL.
3. **Gestion des Erreurs API** :
   - Encapsuler les traitements des Route Handlers dans des blocs `try/catch` et retourner des réponses JSON typées avec codes HTTP appropriés (200, 201, 400, 401, 403, 500).
