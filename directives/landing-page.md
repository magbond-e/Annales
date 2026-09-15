# Spécifications de la Page d'Accueil (Landing Page) — Annale229-MBH

Ce document décrit la structure, les animations, les contenus et les interactions de la page d'accueil (`app/page.tsx`), calibrée pour la filière MBH de l'EPAC.

---

## 1. Objectifs & Rôle Stratégique

La page d'accueil d'Annale229-MBH a pour vocation de :
1. **Valoriser la filière MBH** : S'adresser aux étudiants du département Génie Biomédical de l'EPAC sur les 3 années de formation (1ère, 2ème et 3ème année).
2. **Convertir vers l'authentification Google** : Présenter la valeur du catalogue et inciter à la connexion sécurisée, l'accès aux annales étant réservé aux utilisateurs identifiés.
3. **Mettre en avant la rigueur académique** : Démontrer la supériorité d'une archive pérenne avec corrigés face aux photos éphémères sur WhatsApp.
4. **Offrir une expérience visuelle moderne** : Support parfait du thème clair et du thème sombre avec bascule immédiate depuis le header.

---

## 2. Structure Complète de la Page (`app/page.tsx`)

```mermaid
graph TD
    Header[1. Header Sticky Vitré<br/>Logo MBH, Nav links si connecté, ThemeToggle, CTA Connexion Google]
    Hero[2. Section Hero Dynamique<br/>Badge pulsant, Titre avec mot rotatif, Parallaxe souris, CTAs Google, Preuve sociale]
    Stats[3. Bandeau de Chiffres Clés Animés<br/>20+ Matières, 3 Niveaux L1-L3 MBH, 100% Vérifié, 0€ Accès gratuit]
    Preview[4. Aperçu Interactif du Catalogue<br/>Mockup UI fenêtre macOS, Recherche simulée, Cartes avec badges Devoir/Rattrapage/Corrigé]
    Why[5. Pourquoi Annale229 ?<br/>Recherche instantanée, Mémoire préservée, Entraide étudiante]
    Steps[6. Comment ça marche ? (3 Étapes)<br/>1. Connexion Google -> 2. Consultation/Téléchargement -> 3. Partage de devoirs]
    Matieres[7. Cursus Spécialisé & Matières MBH<br/>Badges interactifs des cours fondamentaux EPAC]
    FAQ[8. Foire Aux Questions Interactive<br/>Accordéon : Gratuité, Connexion Google, Dépôt, Gouvernance]
    CTAEnd[9. CTA Final Immersif<br/>Accès immédiat 1-clic avec compte Google]
    Footer[10. Pied de Page Institutionnel<br/>Mentions EPAC / UAC, Statut service, Auteur Magbondé K. Ulrich]

    Header --> Hero
    Hero --> Stats
    Stats --> Preview
    Preview --> Why
    Why --> Steps
    Steps --> Matieres
    Matieres --> FAQ
    FAQ --> CTAEnd
    CTAEnd --> Footer
```

---

## 3. Détail des Sections & Spécifications Visuelles

### 1. Header Sticky Vitré
- **Gauche** : Logo officiel Annale229 avec puce animée émeraude et mention "MBH • EPAC".
- **Centre (si connecté)** : Pilule de navigation rapide vers *Épreuves*, *Déposer* et *Mes dépôts*.
- **Droite** :
  - Composant `ThemeToggle` permettant de basculer instantanément entre Thème Clair et Thème Sombre.
  - Bouton **Connexion Google** (avec icône officielle Google) si non connecté, ou lien **Mon espace** si connecté.

### 2. Hero Dynamique & Immersif
- **Badge d'en-tête** : *"Plateforme officielle d'annales • Filière MBH (EPAC / UAC)"* avec puce pulsante.
- **Titre principal avec mot rotatif** :
  - Séquence de rotation dynamique : *"devoirs surveillés"*, *"examens officiels"*, *"sessions de rattrapage"*, *"corrigés & barèmes"*.
  - Soulignement animé en SVG dégradé émeraude/teal.
- **Arrière-plan ambient** : Orbes dégradés réagissant avec une légère parallaxe aux mouvements du curseur souris.
- **Boutons d'action (CTAs)** :
  - Bouton principal : *« Se connecter avec Google »* $\rightarrow$ redirection immédiate vers `signIn('google')`.
  - Bouton secondaire : *« Déposer une épreuve »* $\rightarrow$ redirection Google avec callback vers `/deposer`.
- **Preuve sociale & note** : Avatars des délégués, note 4.9/5 étoiles et mention *"Recommandé par les délégués et étudiants MBH de l'EPAC"*.

### 3. Bandeau de Statistiques Animées
Compteurs numériques incrémentés à l'entrée dans le champ de vision (Intersection Observer) :
- **20+** : Matières répertoriées.
- **3** : Niveaux d'études couverts (L1, L2, L3 MBH).
- **100%** : Contenu vérifié et validé.
- **0€** : Accès et téléchargements totalement gratuits.

### 4. Aperçu Catalogue (Mockup UI macOS)
- Simulation fidèle de l'interface catalogue dans un cadre de fenêtre façon macOS (boutons rouge, ambre, vert).
- Barre de recherche factice pré-remplie ("Physique médicale, Imagerie...").
- Pilules de niveaux : *Tous*, *1ère année*, *2ème année*, *3ème année*.
- Échantillon de cartes représentatives avec puces sémantiques Devoir, Rattrapage et badge Corrigé émeraude.

### 5. Section "Pourquoi Annale229 ?"
Comparatif mettant en lumière les atouts de la plateforme :
1. **Recherche instantanée** : Filtres rapides par matière et niveau au lieu d'heures perdues sur les réseaux.
2. **Mémoire préservée** : Archivage pérenne sur Neon & Cloudinary pour que chaque promotion bénéficie des acquis de la précédente.
3. **Entraide étudiante** : Numérisation et mutualisation collective des épreuves récentes.

### 6. Processus "Comment ça marche ?" (3 Étapes)
- **Étape 1** : Connexion en 1 clic avec son compte Google sans mot de passe à créer.
- **Étape 2** : Consultation native et téléchargement direct des sujets et corrigés PDF.
- **Étape 3** : Partage de ses propres devoirs en photos ou PDF via le formulaire de dépôt.

### 7. Cursus Spécialisé & Matières Fondamentales MBH
Badges interactifs pour les matières officielles du cursus EPAC :
- *Physique Médicale*, *Électronique Médicale*, *Imagerie & Radiologie*, *Maintenance Hospitalière*, *Anatomie & Physiologie*, *Sécurité & Normes Hospitalières*, *Instrumentation Biomédicale*, *Télémédecine & Systèmes d'Information*.

### 8. FAQ Interactive (Accordéon)
Réponses claires aux interrogations fréquentes :
1. **L'accès aux annales est-il vraiment gratuit ?** $\rightarrow$ Oui, 100% gratuit, aucun abonnement ni carte bancaire.
2. **Pourquoi dois-je me connecter avec Google ?** $\rightarrow$ Pour sécuriser l'accès à la communauté EPAC et mémoriser votre niveau d'études.
3. **Comment déposer une épreuve ou un corrigé ?** $\rightarrow$ Via la page `/deposer`, en glissant un PDF ou des photos de devoirs.
4. **Qui gère et maintient Annale229 ?** $\rightarrow$ Plateforme conçue et développée par Magbondé Kadoukpè Ulrich, étudiant en Génie Biomédical à l'EPAC.

### 9. Pied de Page Institutionnel
- Rappel du cadre académique : Filière Maintenance Biomédicale et Hospitalière (MBH), EPAC, Université d'Abomey-Calavi (Bénin).
- Indicateur de service en ligne opérationnel (voyant vert pulsant).
- Copyright et signature du porteur de projet.
