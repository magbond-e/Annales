# PRD — Annale229-MBH (Spécification Produit & Métier V1.2)

*Document de Référence Produit (PRD) officiel aligné sur l'infrastructure de production Neon, Cloudinary, le cursus MBH de l'EPAC et les fonctionnalités réelles de la plateforme.*

**Porteur du projet & Administrateur :** Ulrich MAGBONDE (`ulrrichmagbonde@gmail.com`) — Filière Maintenance Biomédicale et Hospitalière (MBH), Département Génie Biomédical (GBM), École Polytechnique d'Abomey-Calavi (EPAC), Université d'Abomey-Calavi (UAC), Bénin  
**Nature :** Portail Académique Sécurisé d'Annales & Ressources d'Examens  
**Stack Active :** Next.js 14 App Router + Neon Serverless PostgreSQL (`proud-lake-48133023`) + Cloudinary v2 (`rg6py08a`) + Neon Object Storage S3 (`annales229`) + NextAuth.js (Google OAuth) + `pdf-lib`  
**Port Local de Développement :** 3005  

---

## 1. Vision & Opportunité Produit

La filière **Maintenance Biomédicale et Hospitalière (MBH)** de l'EPAC forme les techniciens supérieurs et ingénieurs biomédicaux chargés de la gestion, de la maintenance, de la métrologie et de la conformité des équipements médico-hospitaliers (imagerie médicale, dialyse, monitoring, respirateurs, autoclaves, blocs opératoires).

### Le Défi Initial :
- Les épreuves d'examens et devoirs surveillés se transmettaient de manière précaire et dispersée sur des groupes WhatsApp éphémères.
- Les documents étaient souvent des photos floues prises à la hâte, avec perte des rectos/versos et disparition des archives à chaque rentrée.
- Aucun corrigé type ni barème officiel n'était conservé de manière structurée.

### La Solution Annale229-MBH :
Une plateforme numérique centralisée, élégante, collaborative et pérenne :
1. **Accès authentifié sécurisé (Google OAuth)** réservé aux étudiants et membres de la communauté EPAC.
2. **Onboarding personnalisé** demandant et mémorisant le niveau d'étude dès la première inscription pour un catalogue sur-mesure.
3. **Périmètre ciblé sur les 3 années de formation (1ère, 2ème et 3ème année MBH)**.
4. **Assemblage multi-pages automatique** transformant les photos successives d'un sujet en un unique document PDF net et ordonné.
5. **Gestion dédiée des Corrigés & Barèmes** avec onglets intuitifs et téléchargement unifié ou distinct.
6. **Navigation paginée fluide par tranches de 10 épreuves**.
7. **Partage mobile natif** vers WhatsApp et les réseaux via l'API Web Share.
8. **Double thème clair/sombre haute lisibilité** avec sauvegarde des préférences utilisateur.

---

## 2. Périmètre Cible & Cursus MBH

Le périmètre de la plateforme est rigoureusement calibré sur le cycle de formation MBH de l'EPAC :
- **Années académiques couvertes** : **Strictement `1ère année`, `2ème année`, `3ème année`** (Cycle Licence Professionnelle MBH).
- **Les 8 Matières Fondamentales Actives en Base** :
  1. *Physique Médicale* (`m_phys01`)
  2. *Électronique Médicale* (`m_elec02`)
  3. *Imagerie Médicale & Radiologie* (`m_imag03`)
  4. *Maintenance des Équipements Hospitaliers* (`m_maint04`)
  5. *Anatomie & Physiologie Humaine* (`m_anat05`)
  6. *Sécurité & Normes Hospitalières* (`m_secu06`)
  7. *Instrumentation Biomédicale* (`m_inst07`)
  8. *Télémédecine & Systèmes d'Information* (`m_tele08`)
- **Types d'Épreuves Valides** :
  - **`devoir`** (Devoirs surveillés continus)
  - **`rattrapage`** (Sessions de rattrapage)

---

## 3. Personas Utilisateurs

### P1 — Mahugnon, Étudiant en révision d'examen (Consultant)
- **Profil** : Étudiant en 2ème année MBH, révise la veille d'une épreuve.
- **Besoin** : « Je veux ouvrir l'application, être directement positionné sur les épreuves de ma 2ème année, consulter le sujet d'Électronique Médicale avec son corrigé officiel sans chercher pendant des heures. »
- **Parcours** : Se connecte avec Google, le catalogue affiche automatiquement la 2ème année mémorisée, consulte la visionneuse native avec zoom, bascule sur l'onglet Corrigé, et partage le lien à son groupe via le bouton de partage natif.

### P2 — Aïcha, Étudiante contributrice (Déposante)
- **Profil** : Étudiante de 1ère année ayant pris en photo les 3 pages du devoir de Physique Médicale d'hier.
- **Besoin** : « Je veux sélectionner mes 3 photos du recto/verso, les mettre dans le bon ordre, ajouter la proposition de corrigé du professeur, et laisser le système créer le PDF automatiquement. »
- **Parcours** : Ouvre `/deposer`, sélectionne la matière et son niveau, ajoute ses 3 fichiers images, ajuste l'ordre des pages, active l'option "Oui, j'ai le corrigé !" et glisse le fichier solution. La plateforme assemble le tout en PDF et publie l'épreuve.

### P3 — Ulrich Magbonde, Délégué & Administrateur (Modérateur & Référent)
- **Profil** : Administrateur de la plateforme (`ulrrichmagbonde@gmail.com`).
- **Besoin** : « Je dois valider les nouveaux dépôts, vérifier leur conformité, exporter des packs d'annales en ZIP pour la promotion et enrichir le catalogue de matières. »
- **Parcours** : Accède à `/admin`, examine les épreuves en attente, valide en masse par sélection multiple, téléverse des archives via `BulkUploadManager` et suit les statistiques d'usage.

---

## 4. Fonctionnalités & Spécifications Détaillées

### 4.1 Authentification Obligatoire & Onboarding (`/onboarding`)
- **Landing Page Publique (`/`)** : Vitrine interactive présentant le cursus, les avantages, les statistiques réelles et la FAQ. Les boutons d'action déclenchent tous l'authentification Google OAuth.
- **Onboarding Automatique** : Lors de sa toute première connexion, l'étudiant est redirigé vers `/onboarding` pour sélectionner son niveau actuel (`1ère année`, `2ème année`, `3ème année`).
- **Persistance du Profil** : Le niveau est stocké dans la table `profils` et le cache navigateur pour pré-filtrer automatiquement le catalogue lors des sessions futures.

### 4.2 Catalogue des Épreuves & Pagination Stricte (`/epreuves`)
- **Accès réservé aux utilisateurs connectés** (redirection automatique si non authentifié).
- **Pagination stricte par 10 épreuves** : L'utilisateur navigue page par page (`page=1`, `page=2`, etc.) avec affichage exact des 10 épreuves du lot sans accumulation ni scroll infini encombrant.
- **Filtres multicritères réactifs** :
  - Niveau (1ère, 2ème, 3ème année).
  - Matières MBH (multi-sélection possible).
  - Type d'épreuve (`Tous`, `Devoirs`, `Rattrapages`).
  - Année académique (format `AAAA-AAAA`).
  - Filtre "Avec corrigé uniquement".
- **Recherche plein texte** : Indexation GIN PostgreSQL sur le titre et le nom de la matière.
- **Pack d'annales ZIP** (`/api/epreuves/zip`) : Téléchargement groupé de l'ensemble des annales correspondant aux filtres en une archive `.zip`.

### 4.3 Visionneuse Native & Partage Mobile (`/epreuves/[id]`)
- **Visionneuse de document intégrée** :
  - Affichage direct haute performance pour PDF et images.
  - Outils intégrés : Zoom avant (`+`), Zoom arrière (`-`), réinitialisation (100%), plein écran et téléchargement.
- **Double onglet Sujet / Corrigé** :
  - Bascule instantanée entre le document du sujet et celui du corrigé / barème.
  - Modale d'ajout de corrigé pour les épreuves qui n'en disposent pas encore.
  - **Téléchargement unifié** : Téléchargement du sujet seul, du corrigé seul, ou fusion automatique des deux en un document unique via `pdf-lib`.
- **Partage Mobile Natif (`Web Share API`)** :
  - Sur mobile, le bouton "Partager ce sujet" ouvre directement la feuille de partage du smartphone (`navigator.share`) pour envoyer le lien vers WhatsApp, Telegram, Gmail, etc.
  - Sur ordinateur, copie automatique du lien dans le presse-papier avec feedback toast.

### 4.4 Module de Dépôt Collaboratif (`/deposer`)
- **Sélection de Matière assistée** : `MatiereCombobox` avec recherche instantanée parmi les matières officielles et création à la volée.
- **Assemblage Multi-Pages** :
  - Téléversement d'un document PDF ou de multiples images (photos successives d'un sujet).
  - Réorganisation manuelle de l'ordre des pages (flèches Monter / Descendre) et suppression unitaire.
  - Fusion automatique côté serveur/client en un document PDF unique.
- **Section Corrigé / Barème** :
  - Boutons de choix binaire "Non" / "Oui, j'ai le corrigé !".
  - Zone de drop dédiée au document de corrigé.
- **Sécurisation des formats et tailles** : PDF, JPG, PNG, HEIC jusqu'à 15 Mo.

### 4.5 Espace Contributeur (`/mes-depots`)
- Tableau de bord personnel de l'étudiant avec compteur de contributions.
- Suivi du statut de chaque épreuve déposée : *En ligne* (approuvée), *En attente de validation*, *Non retenue*.
- Actions directes : consultation de l'épreuve ou suppression définitive de ses propres documents.

### 4.6 Console d'Administration & Modération (`/admin`)
- Accessible exclusivement à `ulrrichmagbonde@gmail.com` ou aux utilisateurs ayant le rôle `admin`.
- **Modération par sélection multiple** : Validation, rejet ou suppression groupée atomique.
- **Téléversement massif d'archives (`BulkUploadManager`)** : Détection heuristique des métadonnées selon le nom de fichier et application de propriétés en lot.
- **Export ZIP de sélection** et gestion dynamique des matières officielles.
- **Journal d'audit des connexions (`connexions_log`)**.

### 4.7 Système de Thème Clair & Sombre (Dark Mode)
- Intégration complète sur l'ensemble des pages et composants :
  - Fond sombre : `#0D1117`
  - Cartes et panneaux : `#161B22`
  - Contrôles et inputs : `#21262D`
  - Bordures : `#30363D`
  - Textes : `#F0F6FC` (contraste fort), `slate-300` / `slate-400` (secondaires).
- Bouton de bascule `ThemeToggle` dans le header et le menu profil.
- Sauvegarde de la préférence dans `localStorage` (`annale229-theme`).

---

## 5. Indicateurs Clés de Succès (KPIs)

| Métrique | Cible V1.2 | Suivi Technique |
|---|:---:|---|
| **Adoption de la Filière** | ≥ 80% des étudiants MBH | Compteur d'utilisateurs distincts connectés (`connexions_log`) |
| **Couverture des 3 Niveaux** | 100% (1ère, 2ème, 3ème année) | Présence d'épreuves sur chaque niveau dans Neon |
| **Couverture des Matières** | ≥ 2 épreuves par matière officielle | Requête SQL d'agrégation `COUNT(epreuves.id) GROUP BY matiere_id` |
| **Taux de Corrigés Disponibles** | ≥ 40% des épreuves | `COUNT(epreuves) WHERE has_corrige = true` |
| **Temps de Recherche Moyen** | < 15 secondes | Filtrage instantané côté client et index GIN sur Neon |
