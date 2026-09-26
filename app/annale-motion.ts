'use client';

import { useEffect } from 'react';

export function useAnnaleReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = [...document.querySelectorAll<HTMLElement>('.reveal')];

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );

    targets.forEach((target) => observer.observe(target));
    document.documentElement.classList.add('annale-motion-ready');

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('annale-motion-ready');
    };
  }, []);
}
