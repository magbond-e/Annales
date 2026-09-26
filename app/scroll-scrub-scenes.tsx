import React from 'react';
import Link from 'next/link';
import type { ScrollScrubScene, ScrollScrubTheme } from '@/components/scroll-scrub/scroll-scrub';

const poster = '/assets/annale/study-room.svg';

export const scrollScrubTheme: ScrollScrubTheme = {
  accent: '#10B981',
  background: '#0D1117',
  ink: '#F8FAFC',
  muted: '#D6E0E5',
};

export function getScrollScrubScenes(
  onEpreuvesClick?: (e: React.MouseEvent) => void,
  onDeposerClick?: (e: React.MouseEvent) => void
): ScrollScrubScene[] {
  return [
    {
      body: 'Les sujets de la filière MBH rassemblés dans une archive claire, pensée pour les étudiants de l’EPAC.',
      clip: '',
      id: 'focus',
      kicker: 'L’archive vivante · 01 / 04',
      label: 'Rassembler',
      mobileClip: '',
      mobilePoster: poster,
      poster,
      scroll: 1,
      tags: ['MBH', 'EPAC · Bénin'],
      title: 'Les annales MBH, enfin réunies.',
      actions: (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="annale-button annale-button--light shadow-lg shadow-emerald-950/40"
            href="/epreuves"
            onClick={onEpreuvesClick}
          >
            Voir les épreuves <span aria-hidden="true">↗</span>
          </Link>
          <Link
            className="annale-button annale-button--outline"
            href="/deposer"
            onClick={onDeposerClick}
          >
            Déposer une épreuve <span aria-hidden="true">↗</span>
          </Link>
        </div>
      ),
    },
    {
      body: 'De la physique médicale à la maintenance hospitalière, retrouve les thèmes qui comptent pour ta formation.',
      clip: '',
      id: 'find',
      kicker: 'L’archive vivante · 02 / 04',
      label: 'Retrouver',
      mobileClip: '',
      mobilePoster: poster,
      poster,
      scroll: 1,
      tags: ['Matières', 'Niveaux L1—L3'],
      title: 'Le bon sujet, au bon endroit.',
    },
    {
      body: 'Travaille avec les devoirs, les examens et les corrigés disponibles pour consolider ta préparation.',
      clip: '',
      id: 'revise',
      kicker: 'L’archive vivante · 03 / 04',
      label: 'Réviser',
      mobileClip: '',
      mobilePoster: poster,
      poster,
      scroll: 1,
      tags: ['Devoirs', 'Examens', 'Corrigés'],
      title: 'Comprendre avant le jour J.',
      align: 'right',
    },
    {
      body: 'Une épreuve bien rangée aujourd’hui peut aider quelqu’un à mieux réviser demain.',
      clip: '',
      id: 'share',
      kicker: 'L’archive vivante · 04 / 04',
      label: 'Transmettre',
      mobileClip: '',
      mobilePoster: poster,
      poster,
      scroll: 1,
      tags: ['Étudier', 'Partager'],
      title: 'Laisser une meilleure archive.',
    },
  ];
}

export const scrollScrubScenes = getScrollScrubScenes();
