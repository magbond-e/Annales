# Parcours Utilisateurs (User Flows) — Annale229-MBH

Ce document détaille les scénarios d'utilisation, les interactions entre composants et les flux de données réels sur la plateforme **Annale229-MBH**.

---

## 🧭 Matrice des Droits & Rôles

| Fonctionnalité | Visiteur Non Connecté | Étudiant Connecté (L1-L3) | Administrateur (`ulrrichmagbonde@gmail.com`) |
|---|:---:|:---:|:---:|
| Découverte de la Landing Page (`/`) | ✅ | ✅ | ✅ |
| Bascule Thème Clair / Sombre | ✅ | ✅ | ✅ |
| Connexion Google OAuth 2.0 | ✅ | ✅ | ✅ |
| Onboarding & Mémorisation du niveau (`/onboarding`) | ❌ (Exige session) | ✅ (À l'inscription) | ✅ |
| Consultation du Catalogue `/epreuves` | ❌ (Redirigé vers `/`) | ✅ | ✅ |
| Pagination stricte (10 épreuves par page) | ❌ | ✅ | ✅ |
| Visionneuse native (Sujet & Corrigé) | ❌ | ✅ | ✅ |
| Partage mobile natif (`navigator.share`) | ❌ | ✅ | ✅ |
| Téléchargement épreuve / Pack ZIP | ❌ | ✅ | ✅ |
| Déposer une épreuve multi-pages (`/deposer`) | ❌ | ✅ | ✅ |
| Suivre & supprimer ses dépôts (`/mes-depots`) | ❌ | ✅ | ✅ |
| Console d'administration & modération (`/admin`) | ❌ | ❌ | ✅ |
| Téléversement en lot (`BulkUploadManager`) | ❌ | ❌ | ✅ |

---

## 📌 Parcours 1 : Découverte & Authentification Google

```mermaid
sequenceDiagram
    actor Visiteur as Étudiant MBH (Visiteur)
    participant LP as Landing Page (/)
    participant Auth as NextAuth (Google OAuth)
    participant DB as Neon PostgreSQL
    participant Onboarding as Page /onboarding
    participant Cat as Catalogue /epreuves

    Visiteur->>LP: Accède à la page d'accueil (/)
    LP-->>Visiteur: Vitrine, mockup interactif, stats, FAQ
    Visiteur->>LP: Clique sur "Se connecter avec Google" ou "Accéder aux annales"
    LP->>Auth: signIn('google', { callbackUrl: '/epreuves' })
    Auth->>Visiteur: Consentement Google OAuth
    Visiteur->>Auth: Valide son compte Google
    Auth->>DB: Enregistre / met à jour utilisateurs & connexions_log
    Auth->>DB: Vérifie si un niveau existe dans profils(email)

    alt Première connexion (Niveau non renseigné)
        Auth-->>Onboarding: Redirection vers /onboarding
        Visiteur->>Onboarding: Choisit son niveau (1ère, 2ème ou 3ème année)
        Onboarding->>DB: POST /api/profil -> INSERT INTO profils
        Onboarding-->>Cat: Redirection vers /epreuves?niveau=...
    else Profil déjà existant
        Auth-->>Cat: Redirection directe vers /epreuves?niveau=[profil.niveau]
    end
```

---

## 📌 Parcours 2 : Onboarding & Mémorisation du Niveau (`/onboarding`)

1. **Déclenchement automatique** : Si l'utilisateur connecté n'a pas encore de niveau dans la table `profils`, il est orienté vers `/onboarding`.
2. **Interface tactile optimisée** :
   - Sélection parmi les 3 niveaux : **1ère année**, **2ème année**, ou **3ème année** MBH.
3. **Persistance synchrone** :
   - Requête `POST /api/profil` enregistrant le choix dans Neon.
   - Redirection immédiate vers le catalogue pré-filtré avec le niveau choisi.
   - Ce choix évite d'avoir à re-sélectionner son niveau lors des visites ultérieures.

---

## 📌 Parcours 3 : Consultation du Catalogue & Pagination Stricte (`/epreuves`)

```mermaid
sequenceDiagram
    actor Etudiant as Étudiant Connecté
    participant UI as Catalogue (/epreuves)
    participant API as Route /api/epreuves
    participant Svc as DataService
    participant DB as Neon PostgreSQL

    Etudiant->>UI: Accède au catalogue
    UI->>API: GET /api/epreuves?page=1&limit=10&statut=approuve
    API->>Svc: getEpreuves({ page: 1, limit: 10, ... })
    Svc->>DB: SELECT * FROM epreuves WHERE statut='approuve' ORDER BY created_at DESC LIMIT 10 OFFSET 0
    Svc->>DB: SELECT COUNT(*) FROM epreuves WHERE statut='approuve'
    DB-->>Svc: Données paginées + total
    Svc-->>API: { epreuves, total, page: 1, totalPages: 4, limit: 10 }
    API-->>UI: Affiche exactement les 10 premières épreuves

    Etudiant->>UI: Clique sur "Page 2" ou "Suivant"
    UI->>API: GET /api/epreuves?page=2&limit=10
    API-->>UI: Affiche les 10 épreuves suivantes (sans les précédentes)
```

---

## 📌 Parcours 4 : Consultation d'un Document, Visionneuse & Partage Mobile (`/epreuves/[id]`)

1. **Visionneuse Native Haute Performance** :
   - Chargement direct et net des PDF et images (PNG, JPG, HEIC, WebP).
   - Outils de barre supérieure : Zoom avant, Zoom arrière, réinitialisation (100%), bascule plein écran.
2. **Double Onglet Sujet & Corrigé** :
   - Clic sur l'onglet **Sujet** $\rightarrow$ affichage de l'épreuve.
   - Clic sur l'onglet **Corrigé** $\rightarrow$ affichage de la solution / barème officiel.
   - Si aucun corrigé n'existe, bouton d'ouverture de la modale "Déposer un corrigé".
3. **Téléchargement Sécurisé** :
   - Bouton de téléchargement unifié : si un corrigé est présent, `pdf-lib` fusionne automatiquement le sujet et le corrigé en un unique fichier PDF.
4. **Partage Mobile Natif (`Web Share API`)** :
   - L'étudiant clique sur **"Partager ce sujet"**.
   - Sur smartphone, ouverture de la feuille de partage native du téléphone (permettant d'envoyer directement le lien vers une conversation WhatsApp, un groupe Telegram, ou par email).
   - Sur desktop, copie instantanée du lien dans le presse-papier avec notification toast.

---

## 📌 Parcours 5 : Dépôt Collaboratif Multi-pages & Corrigé (`/deposer`)

```mermaid
sequenceDiagram
    actor Etudiant as Étudiant Contributeur
    participant Form as Page /deposer
    participant PDFLib as pdf-lib (Assemblage)
    participant API as /api/epreuves
    participant CDN as Cloudinary (rg6py08a)
    participant DB as Neon PostgreSQL

    Etudiant->>Form: Accède à /deposer
    Etudiant->>Form: Sélectionne la matière (MatiereCombobox), le niveau (1ère, 2ème ou 3ème) et le type
    Etudiant->>Form: Sélectionne plusieurs photos du sujet (ex: page 1, 2 et 3)
    Form-->>Etudiant: Affiche la liste des pages réorganisables (flèches Monter / Descendre)
    Etudiant->>Form: Ajuste l'ordre des pages si nécessaire
    
    Etudiant->>Form: Active "Oui, j'ai le corrigé !" et dépose le fichier solution
    Etudiant->>Form: Clique sur "Publier l'épreuve sur Annale229"
    Form->>PDFLib: Assemble les 3 pages d'images en un document PDF unique
    Form->>API: POST /api/epreuves (Multipart: sujet PDF + corrigé)
    API->>CDN: uploadToCloudinary(sujetBuffer, 'epreuves')
    API->>CDN: uploadToCloudinary(corrigeBuffer, 'corriges')
    API->>DB: INSERT INTO epreuves (..., has_corrige=true, corrige_url=...)
    DB-->>API: Confirmation
    API-->>Form: 201 Created
    Form-->>Etudiant: Notification de succès et redirection
```

---

## 📌 Parcours 6 : Espace Personnel Contributeur (`/mes-depots`)

1. L'étudiant connecté ouvre `/mes-depots` depuis le menu de profil.
2. Le tableau de bord affiche :
   - Le total de ses dépôts et son badge contributeur.
   - Pour chaque épreuve : titre, matière, niveau, année, et badge d'état de modération (*En ligne*, *En attente de validation*, *Non retenue*).
   - Bouton **Consulter** vers la page de l'épreuve.
   - Bouton **Supprimer** ouvrant la modale de confirmation `ConfirmModal` pour retirer définitivement le sujet de la base et du stockage cloud.

---

## 📌 Parcours 7 : Console d'Administration & Modération Groupée (`/admin`)

Réservé exclusivement à `ulrrichmagbonde@gmail.com` :

```mermaid
graph TD
    Admin([Ulrich Magbonde - Admin]) --> Access[/admin]
    Access --> CheckAdmin{Session Admin ?}
    CheckAdmin -->|Non| 403[Accès Refusé]
    CheckAdmin -->|Oui| Panel[Tableau de Bord /admin]

    subgraph "Opérations Administratives"
        Panel --> TabModeration[1. Modération des Épreuves]
        Panel --> TabBulk[2. Import Massif - BulkUploadManager]
        Panel --> TabMatieres[3. Gestion des Matières MBH]
        Panel --> TabAudits[4. Journal des Connexions]
    end

    TabModeration --> MultiSelect{Sélection Multiple}
    MultiSelect -->|Valider le lot| ApproveAll[UPDATE epreuves SET statut='approuve']
    MultiSelect -->|Supprimer le lot| DeleteAll[DELETE FROM epreuves + Nettoyage Cloudinary & S3]
    MultiSelect -->|Pack ZIP de la sélection| ZipExport[POST /api/epreuves/zip]

    TabBulk --> BatchQueue[File d'attente intelligente & Envoi séquentiel]
    TabMatieres --> CrudMatieres[Ajout / Édition / Suppression de cours MBH]
```

---

## 📌 Parcours 8 : Bascule Thème Clair / Thème Sombre

1. L'utilisateur (visiteur ou connecté) clique sur le bouton `ThemeToggle` dans le header ou le menu de profil.
2. Le thème bascule instantanément :
   - Mode Clair $\rightarrow$ Mode Sombre (classe `.dark` ajoutée à `<html>`).
   - Mode Sombre $\rightarrow$ Mode Clair (classe `.dark` retirée de `<html>`).
3. La valeur (`'light'` ou `'dark'`) est enregistrée de manière synchrone dans `localStorage.getItem('annale229-theme')`.
4. Tous les composants, cartes, visionneuse et arrière-plans adaptent leurs contrastes sans scintillement ni rechargement.
