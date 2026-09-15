# Système de Design & Charte Graphique — Annale229-MBH

Ce document décrit les composants d'interface, les tokens de design, les spécifications Dark Mode et la charte visuelle de la plateforme **Annale229-MBH**.

---

## 1. Principes & Identité Visuelle

L'interface d'Annale229-MBH est spécialement conçue pour les étudiants et enseignants de la filière Maintenance Biomédicale et Hospitalière (MBH) de l'EPAC :
- **Rigueur biomédicale** : Dominante Deep Teal (`#0F4C5C`) évoquant les technologies médicales et l'ingénierie hospitalière.
- **Dynamisme & Validation** : Accent Vert Émeraude (`#10B981`) pour les actions de succès, les badges de corrigés et les indicateurs d'approbation.
- **Glassmorphism moderne** : Surfaces dépolies semi-transparentes avec flou d'arrière-plan (`backdrop-blur-xl`) sur la barre de navigation et les menus flottants.
- **Thème Sombre Haute Lisibilité (Dark Mode)** : Palette GitHub/Linear contrastée (`#0D1117`, `#161B22`, `#21262D`, `#30363D`) évitant toute fatigue visuelle lors des révisions nocturnes.
- **Micro-animations & États** : Effets de parallaxe, particules ambiantes discrètes, retours tactiles (`active:scale-95`) et transitions fluides.

---

## 2. Tokens de Couleurs & Variables CSS

### A. Thème Clair (:root) vs Thème Sombre (.dark)

| Variable CSS | Rôle & Sémantique | Valeur Thème Clair | Valeur Thème Sombre |
|---|---|---|---|
| `--bg-main` | Arrière-plan de page global | `#F8FAFC` (Slate 50) | `#0D1117` (Dark Canvas) |
| `--bg-card` | Cartes, conteneurs, modales | `#FFFFFF` (Blanc pur) | `#161B22` (Dark Card) |
| `--bg-subtle` | Inputs, contrôles, hover | `#F1F5F9` (Slate 100) | `#21262D` (Dark Control) |
| `--text-main` | Titres, textes primaires | `#0F172A` (Slate 900) | `#F0F6FC` (White Smoke) |
| `--text-secondary` | Descriptions, sous-titres | `#475569` (Slate 600) | `#8B949E` (Slate 400) |
| `--text-muted` | Métadonnées, labels discrets | `#94A3B8` (Slate 400) | `#6E7681` (Slate 500) |
| `--border-color` | Bordures et séparateurs | `#E2E8F0` (Slate 200) | `#30363D` (Dark Border) |
| `--brand-primary` | Couleur d'action identitaire | `#0F4C5C` (Deep Teal) | `#38BDF8` / `#10B981` |

### B. Badges Sémantiques des Épreuves

| Badge | Mode Clair | Mode Sombre | Indicateur Visuel |
|---|---|---|:---:|
| **Devoir** | `bg-blue-50 text-blue-700 border-blue-200` | `bg-blue-950/60 text-blue-300 border-blue-800` | Puce bleue |
| **Rattrapage** | `bg-amber-50 text-amber-700 border-amber-200` | `bg-amber-950/60 text-amber-300 border-amber-800` | Puce ambre |
| **Corrigé disponible** | `bg-emerald-50 text-emerald-700 border-emerald-200` | `bg-emerald-950/60 text-emerald-300 border-emerald-800` | Icône check verte |
| **Niveau / Année** | `bg-slate-100 text-slate-700` | `bg-[#21262D] text-slate-300 border-[#30363D]` | Puce grise |

---

## 3. Typographie

- **Titres & En-têtes (`font-heading`)** : `Plus Jakarta Sans`
  - Graisses : 600 (Semi-Bold), 700 (Bold), 800 (Extra-Bold), 900 (Black).
  - Espacement : `-0.025em`.
- **Corps de texte & Interfaces (`font-sans`)** : `Inter`
  - Graisses : 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold).

---

## 4. Composants Clés & Spécifications Visuelles

### A. Navigation Supérieure (`components/Navbar.tsx`)
- **Disposition Desktop** :
  - **Gauche** : Logo officiel avec puce pulsante et sous-titre "MBH • EPAC".
  - **Centre** : Conteneur pilule flottant (`glass-nav`) avec liens *Épreuves*, *Déposer*, *Mes dépôts* et *Console Admin*.
  - **Droite** : Bouton `ThemeToggle` et menu de profil unifié (avatar, niveau actuel, bascule de thème, déconnexion).
- **Fermeture intelligente** : Le menu déroulant se ferme automatiquement lors d'un clic en dehors (`useRef` + event listener).

### B. Bascule de Thème (`components/ThemeToggle.tsx`)
- Icône `Sun` (ambre) en mode sombre avec micro-rotation au survol.
- Icône `Moon` (slate) en mode clair.
- Persistance synchrone dans `localStorage.getItem('annale229-theme')`.

### C. Contrôle Segmenté (`components/TypeSegmentedControl.tsx`)
- Bascule instantanée entre :
  - **Tous** : Affiche devoirs et rattrapages.
  - **Devoirs** : Filtrage exclusif des devoirs surveillés continus.
  - **Rattrapages** : Filtrage exclusif des sessions de rattrapage.
- Onglet actif doté d'une ombre subtile et d'une transition glissante.

### D. Combobox des Matières (`components/MatiereCombobox.tsx`)
- Saisie prédictive insensible à la casse filtrant parmi les 8 matières fondamentales.
- Option interactive *« + Ajouter [nom] comme nouvelle matière »* permettant l'enrichissement continu.

### E. Carte d'Épreuve (`components/EpreuveCard.tsx`)
- En-tête : Type d'épreuve, niveau (1ère à 3ème année), année académique et badge de présence de corrigé.
- Corps : Nom de la matière et titre spécifique.
- Pied de carte : Format de fichier (PDF/Image), taille en Mo/Ko, compteur de téléchargements et bouton direct d'accès.

### F. Visionneuse Native de Document (`/epreuves/[id]`)
- Rendu direct et fluide des PDF et images (PNG, JPG, HEIC, WebP).
- Barre d'outils dédiée : Zoom `+`, Zoom `-`, réinitialisation, plein écran, et téléchargement unifié avec fusion Sujet + Corrigé (`pdf-lib`).
- Onglets ergonomiques **Sujet** / **Corrigé** pour basculer sans rechargement.

### G. Composant de Pagination Stricte (`app/epreuves/page.tsx`)
- Découpage par lots stricts de 10 épreuves.
- Barre de pagination : Bouton *Précédent*, numéros de page cliquables avec mise en avant de la page active, bouton *Suivant*, et compteur total.

### H. Partage Mobile Natif
- Bouton "Partager ce sujet" avec appel à l'API `navigator.share`.
- Ouvre la feuille de partage du smartphone (WhatsApp, Telegram, etc.) pour un partage instantané entre étudiants.
