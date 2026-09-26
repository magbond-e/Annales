'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { ScrollScrub } from '@/components/scroll-scrub/scroll-scrub';
import { getScrollScrubScenes, scrollScrubTheme } from './scroll-scrub-scenes';
import { useAnnaleReveal } from './annale-motion';
import { Menu, X } from 'lucide-react';

const topics = [
  'Physique médicale & rayonnements',
  'Électronique médicale & capteurs',
  'Maintenance des équipements hospitaliers',
  'Anatomie & physiologie',
  'Instrumentation biomédicale',
  'Sécurité & normes hospitalières',
  'Thermodynamique appliquée',
  'Télémédecine & systèmes d’information',
  'Traitement du signal biomédical',
  'Anglais technique & communication',
];

const faq = [
  {
    question: 'L’accès aux épreuves est-il gratuit ?',
    answer:
      'Oui, l’accès est 100% libre et gratuit. L’archive est conçue comme un bien commun ouvert à tous les étudiants de la filière MBH et de l’EPAC.',
  },
  {
    question: 'Dois-je me connecter pour utiliser le site ?',
    answer:
      'La connexion avec votre compte Google universitaire permet d’accéder aux épreuves, déposer des sujets et suivre vos dépôts pour enrichir l’archive.',
  },
  {
    question: 'Comment ajouter une épreuve à l’archive ?',
    answer:
      'Cliquez sur « Déposer une épreuve », sélectionnez la matière, le niveau académique, l’année et glissez simplement votre fichier (PDF ou photos de sujets). Le document sera instantanément indexé.',
  },
  {
    question: 'À qui s’adresse Annale229 ?',
    answer:
      'Annale229 est dédiée aux étudiants, enseignants et passionnés de la filière Maintenance Biomédicale et Hospitalière (MBH) de l’EPAC (Université d’Abomey-Calavi, Bénin).',
  },
];

function LandingContent() {
  useAnnaleReveal();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Si l'utilisateur a été redirigé vers l'accueil avec un callbackUrl (tentative d'accès non connecté)
  useEffect(() => {
    const callbackUrl = searchParams.get('callbackUrl');
    if (callbackUrl && status === 'unauthenticated') {
      signIn('google', { callbackUrl });
    }
  }, [searchParams, status]);

  // Redirection d'authentification pour les utilisateurs non connectés
  const handleEpreuvesClick = (e: React.MouseEvent) => {
    if (status !== 'authenticated') {
      e.preventDefault();
      signIn('google', { callbackUrl: '/epreuves' });
    }
  };

  const handleDeposerClick = (e: React.MouseEvent) => {
    if (status !== 'authenticated') {
      e.preventDefault();
      signIn('google', { callbackUrl: '/deposer' });
    }
  };

  const dynamicScenes = useMemo(
    () => getScrollScrubScenes(handleEpreuvesClick, handleDeposerClick),
    [status]
  );

  return (
    <div className="annale">
      {/* ── En-tête Sticky & Glassmorphism (Fidèle à landing2) ── */}
      <header className="annale-header">
        <a
          className="annale-brand"
          href="#accueil"
          onClick={closeMobileMenu}
          aria-label="Annale229, accueil"
        >
          <img
            className="brand-icon"
            src="/logo.svg"
            alt=""
            aria-hidden="true"
            width={34}
            height={34}
          />
          <span className="brand-wordmark">Annale229</span>
        </a>

        {/* Navigation Desktop */}
        <nav aria-label="Navigation principale" className="annale-nav">
          <a href="#archive">L’archive</a>
          <a href="#parcours">Comment ça marche</a>
          <a href="#programme">La filière MBH</a>
          <a href="#questions">Questions</a>
        </nav>

        {/* Action Header — Exactement le bouton Explorer de landing2, sans icône parasite */}
        <div className="flex items-center gap-3">
          <a
            className="annale-header-action"
            href="/epreuves"
            onClick={handleEpreuvesClick}
          >
            Explorer <span aria-hidden="true">↗</span>
          </a>

          {/* Bouton Hamburger Mobile */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="annale-mobile-toggle"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-emerald-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* ── Tiroir de Navigation Mobile ── */}
      <div
        className={`annale-mobile-menu ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="annale-mobile-nav">
          <a
            href="#archive"
            onClick={closeMobileMenu}
            className="annale-mobile-link"
          >
            <span>01 / L’archive</span>
            <span>INDEX</span>
          </a>
          <a
            href="#parcours"
            onClick={closeMobileMenu}
            className="annale-mobile-link"
          >
            <span>02 / Comment ça marche</span>
            <span>CYCLE</span>
          </a>
          <a
            href="#programme"
            onClick={closeMobileMenu}
            className="annale-mobile-link"
          >
            <span>03 / La filière MBH</span>
            <span>EPAC</span>
          </a>
          <a
            href="#questions"
            onClick={closeMobileMenu}
            className="annale-mobile-link"
          >
            <span>04 / Questions fréquentes</span>
            <span>FAQ</span>
          </a>
        </div>

        <div className="annale-mobile-actions">
          <a
            href="/epreuves"
            onClick={(e) => {
              closeMobileMenu();
              handleEpreuvesClick(e);
            }}
            className="annale-button annale-button--light w-full"
          >
            Explorer les épreuves <span aria-hidden="true">↗</span>
          </a>
          <a
            href="/deposer"
            onClick={(e) => {
              closeMobileMenu();
              handleDeposerClick(e);
            }}
            className="annale-button annale-button--outline w-full"
          >
            Déposer une épreuve <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      {/* ── Contenu Principal ── */}
      <main id="accueil">
        {/* Hero Interactif ScrollScrub */}
        <ScrollScrub scenes={dynamicScenes} theme={scrollScrubTheme} />

        {/* Section 01 : L’archive MBH */}
        <section aria-labelledby="archive-title" className="archive-section" id="archive">
          <div className="section-shell archive-layout">
            <div className="archive-intro reveal">
              <p className="eyebrow">
                <span>01</span> L’archive MBH
              </p>
              <h2 id="archive-title">
                Une matière après l’autre.
                <br />
                <em>Tout au même endroit.</em>
              </h2>
              <p className="section-copy">
                Quand les anciens sujets sont dispersés entre photos et fichiers, réviser prend plus
                de temps. Annale229 leur donne un point de ralliement.
              </p>
              <a
                className="text-link"
                href="/epreuves"
                onClick={handleEpreuvesClick}
              >
                Parcourir les épreuves <span aria-hidden="true">↗</span>
              </a>
              <div className="archive-index-mark" aria-hidden="true">
                <span>ANNALE</span>
                <strong>229</strong>
                <span>MBH · EPAC</span>
              </div>
            </div>

            <div
              className="archive-sheet reveal"
              aria-label="Exemples de matières de la filière MBH"
            >
              <div className="sheet-topline">
                <span>INDEX / MBH</span>
                <span>EPAC · BÉNIN</span>
              </div>
              <div className="sheet-title">
                <span>Répertoire des matières</span>
                <span className="sheet-seal">A</span>
              </div>
              <ul className="subject-index">
                {topics.slice(0, 6).map((topic, index) => (
                  <li key={topic}>
                    <span className="subject-number">0{index + 1}</span>
                    <a
                      href="/epreuves"
                      onClick={handleEpreuvesClick}
                      className="hover:underline cursor-pointer"
                    >
                      {topic}
                    </a>
                    <span className="subject-mark" aria-hidden="true">
                      ↗
                    </span>
                  </li>
                ))}
              </ul>
              <div className="sheet-footer">
                <span>DEVOIRS · EXAMENS · CORRIGÉS</span>
                <span>DÉFILEZ POUR DÉCOUVRIR</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 02 : Trouver sans détour (Wayfinding) */}
        <section aria-labelledby="find-title" className="find-section" id="recherche">
          <div className="section-shell">
            <div className="find-heading reveal">
              <p className="eyebrow eyebrow--light">
                <span>02</span> Trouver sans détour
              </p>
              <h2 id="find-title">
                Un chemin simple
                <br />
                vers <em>le bon document.</em>
              </h2>
              <p className="section-copy section-copy--light">
                Pars de ta matière, précise ton niveau, puis choisis le type d’épreuve.
              </p>
            </div>
            <div className="wayfinding reveal" aria-label="Étapes pour rechercher une épreuve">
              <div className="wayfinding-step">
                <span className="wayfinding-label">01 / Matière</span>
                <span className="wayfinding-value">Instrumentation biomédicale</span>
                <span className="wayfinding-caption">Choisis le thème de ta révision</span>
              </div>
              <div className="wayfinding-divider" aria-hidden="true">
                ＋
              </div>
              <div className="wayfinding-step">
                <span className="wayfinding-label">02 / Niveau</span>
                <span className="wayfinding-value">Licence 2</span>
                <span className="wayfinding-caption">L1, L2 ou L3</span>
              </div>
              <div className="wayfinding-divider" aria-hidden="true">
                ＋
              </div>
              <div className="wayfinding-step">
                <span className="wayfinding-label">03 / Document</span>
                <span className="wayfinding-value">Examen corrigé</span>
                <span className="wayfinding-caption">Devoir, examen, corrigé…</span>
              </div>
            </div>
            <a
              className="annale-button annale-button--green cursor-pointer"
              href="/epreuves"
              onClick={handleEpreuvesClick}
            >
              Voir les épreuves <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        {/* Section 03 : Un cycle utile à tous */}
        <section aria-labelledby="steps-title" className="steps-section" id="parcours">
          <div className="section-shell">
            <div className="steps-heading reveal">
              <p className="eyebrow">
                <span>03</span> Un cycle utile à tous
              </p>
              <h2 id="steps-title">
                Réviser. Retrouver.
                <br />
                <em>Faire circuler.</em>
              </h2>
            </div>
            <div className="steps-rail">
              <article
                className="step-row reveal cursor-pointer"
                onClick={() => {
                  if (status !== 'authenticated') {
                    signIn('google', { callbackUrl: '/epreuves' });
                  }
                }}
              >
                <span className="step-count">01</span>
                <span className="step-rule" aria-hidden="true"></span>
                <div>
                  <h3>Connecte-toi simplement</h3>
                  <p>
                    La connexion Google ouvre les fonctions personnelles du site, comme le dépôt
                    et le suivi de tes contributions.
                  </p>
                </div>
                <span className="step-side-note">ACCÈS</span>
              </article>
              <article
                className="step-row reveal cursor-pointer"
                onClick={handleEpreuvesClick}
              >
                <span className="step-count">02</span>
                <span className="step-rule" aria-hidden="true"></span>
                <div>
                  <h3>Consulte les ressources</h3>
                  <p>
                    Parcours les sujets par matière et niveau, puis ouvre le document qui correspond
                    à ta révision.
                  </p>
                </div>
                <span className="step-side-note">RÉVISION</span>
              </article>
              <article
                className="step-row reveal cursor-pointer"
                onClick={handleDeposerClick}
              >
                <span className="step-count">03</span>
                <span className="step-rule" aria-hidden="true"></span>
                <div>
                  <h3>Ajoute une épreuve utile</h3>
                  <p>
                    Transmets un sujet que tu as le droit de partager et aide la prochaine personne
                    à le retrouver.
                  </p>
                </div>
                <span className="step-side-note">PARTAGE</span>
              </article>
            </div>
            <a
              className="text-link cursor-pointer"
              href="/deposer"
              onClick={handleDeposerClick}
            >
              Déposer une épreuve <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        {/* Section 04 : La filière MBH */}
        <section aria-labelledby="program-title" className="program-section" id="programme">
          <div className="section-shell program-layout">
            <div className="program-stamp reveal" aria-hidden="true">
              <span>EPAC</span>
              <span className="stamp-orbit">MBH</span>
              <span>LICENCE · L1—L3</span>
            </div>
            <div className="program-content reveal">
              <p className="eyebrow">
                <span>04</span> La filière
              </p>
              <h2 id="program-title">
                La technique au service
                <br />
                du <em>soin.</em>
              </h2>
              <p className="section-copy">
                Maintenance Biomédicale et Hospitalière : une formation à l’interface des
                équipements, des systèmes et de l’environnement médical.
              </p>
              <ul className="program-list">
                {topics.slice(0, 8).map((topic, index) => (
                  <li key={topic}>
                    <span>0{index + 1}</span>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Section 05 : À l’origine du projet (Founder) */}
        <section aria-labelledby="origin-title" className="origin-section">
          <div className="section-shell origin-layout reveal">
            <p className="eyebrow eyebrow--light">
              <span>05</span> À l’origine du projet
            </p>
            <div className="origin-copy">
              <span aria-hidden="true" className="origin-quote">
                “
              </span>
              <h2 id="origin-title">
                Chaque sujet partagé rend la prochaine révision <em>un peu plus légère.</em>
              </h2>
              <p>
                Annale229 est une initiative de Magbondé Kadoukpè Ulrich, étudiant en Génie
                Biomédical à l’EPAC. L’idée est née d’un besoin concret : garder les épreuves
                accessibles, plutôt que perdues dans les discussions et les clés USB.
              </p>
              <span className="origin-signature">
                Magbondé Kadoukpè Ulrich <span>· Initiative Annale229</span>
              </span>
            </div>
          </div>
        </section>

        {/* Section 06 : Questions fréquentes (FAQ) */}
        <section aria-labelledby="faq-title" className="faq-section" id="questions">
          <div className="section-shell faq-layout">
            <div className="faq-heading reveal">
              <p className="eyebrow">
                <span>06</span> À savoir
              </p>
              <h2 id="faq-title">
                Questions
                <br />
                <em>fréquentes.</em>
              </h2>
            </div>
            <div className="faq-list reveal">
              {faq.map((item, index) => (
                <details className="faq-item" key={item.question}>
                  <summary>
                    <span className="faq-number">0{index + 1}</span>
                    <span>{item.question}</span>
                    <span className="faq-toggle" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Section de Clôture (Call to Action) */}
        <section aria-labelledby="closing-title" className="closing-section">
          <div className="section-shell closing-inner reveal">
            <p className="eyebrow eyebrow--light">
              <span>ANNALE229</span> Ta prochaine session commence ici
            </p>
            <h2 id="closing-title">
              Le sujet qu’il te faut
              <br />
              <em>est peut-être déjà là.</em>
            </h2>
            <div className="closing-actions">
              <a
                className="annale-button annale-button--light cursor-pointer"
                href="/epreuves"
                onClick={handleEpreuvesClick}
              >
                Voir les épreuves <span aria-hidden="true">↗</span>
              </a>
              <a
                className="annale-button annale-button--outline cursor-pointer"
                href="/deposer"
                onClick={handleDeposerClick}
              >
                Déposer une épreuve <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="closing-ornament" aria-hidden="true">
              MBH<span>✳</span>229
            </div>
          </div>
        </section>
      </main>

      {/* ── Pied de page ── */}
      <footer className="annale-footer">
        <a className="footer-brand" href="#accueil" aria-label="Annale229, accueil">
          <img className="brand-icon" src="/logo.svg" alt="" aria-hidden="true" width={34} height={34} />
          <span className="brand-wordmark">Annale229</span>
        </a>
        <span>Une archive étudiante pour la filière MBH · Bénin</span>
        <nav aria-label="Navigation de pied de page">
          <a href="/epreuves" onClick={handleEpreuvesClick}>Épreuves</a>
          <a href="/deposer" onClick={handleDeposerClick}>Déposer</a>
          <a
            href="/mes-depots"
            onClick={(e) => {
              if (status !== 'authenticated') {
                e.preventDefault();
                signIn('google', { callbackUrl: '/mes-depots' });
              }
            }}
          >
            Mes dépôts
          </a>
        </nav>
        <span className="footer-year">© 2026</span>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D1117]" />}>
      <LandingContent />
    </Suspense>
  );
}
