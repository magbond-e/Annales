/**
 * Calcule et retourne la liste dynamique des 5 dernières années académiques (ex: 2024-2025).
 * Basé sur l'année courante : si on est après juillet, l'année courante est l'année de rentrée.
 */
export function getAcademicYears(count: number = 5): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = janvier, 6 = juillet
  
  // Une année académique commence généralement en septembre/octobre
  const baseStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  
  const years: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = baseStartYear - i;
    const end = start + 1;
    years.push(`${start}-${end}`);
  }
  return years;
}

/**
 * Formate une date ISO en durée relative en français (ex: "il y a 3 jours", "aujourd'hui")
 */
export function formatRelativeDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "À l'instant";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Il y a ${diffInHours} h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "Hier";
  }
  if (diffInDays < 7) {
    return `Il y a ${diffInDays} jours`;
  }
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `Il y a ${weeks} sem.`;
  }

  // Au-delà d'un mois, affichage date courte
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formate les octets en Ko ou Mo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Ko';
  const k = 1024;
  if (bytes < k * 1024) {
    return `${Math.round(bytes / k)} Ko`;
  }
  const mb = bytes / (k * 1024);
  return `${mb.toFixed(1)} Mo`;
}
