'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut, signIn } from 'next-auth/react';
import { 
  BookOpen, 
  Upload, 
  FolderArchive, 
  LogOut, 
  GraduationCap,
  ChevronDown,
  ShieldAlert
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path || (path !== '/' && pathname?.startsWith(path + '/'));
  const userIsAdmin = Boolean(
    session?.user?.isAdmin || session?.user?.role === 'admin'
  );


  // Fermer le menu au clic extérieur ou touche Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Fermer le menu au changement de route
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Charger le nombre d'épreuves en attente pour l'admin
  useEffect(() => {
    if (!userIsAdmin) return;
    fetch('/api/admin/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.pendingCount !== undefined) setPendingCount(data.pendingCount); })
      .catch(() => {});
  }, [userIsAdmin]);

  return (
    <header className="sticky top-0 z-40 glass-nav transition-all duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Filière Branding */}
          <Link href="/epreuves" className="flex items-center gap-3 group shrink-0">
            <div className="relative group-hover:scale-105 transition-all duration-200">
              <img
                src="/logo.svg"
                alt="Annale229 Logo"
                className="w-10 h-10 rounded-xl shadow-md shadow-emerald-950/20 object-contain"
              />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-[#F0F6FC] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-heading">
                  Annale<span className="text-emerald-500">229</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full uppercase tracking-wider">
                  MBH · EPAC
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 hidden sm:block font-mono">
                Maintenance Biomédicale &amp; Hospitalière
              </span>
            </div>
          </Link>

          {/* Centre : Liens de navigation desktop */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 dark:bg-[#161B22] p-1.5 rounded-2xl border border-slate-200/70 dark:border-[#30363D]">
            <Link
              href="/epreuves"
              onClick={(e) => {
                if (status === 'unauthenticated') {
                  e.preventDefault();
                  signIn('google', { callbackUrl: '/epreuves' });
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive('/epreuves') && !isActive('/epreuves/')
                  ? 'bg-white dark:bg-[#21262D] text-brand dark:text-emerald-400 shadow-sm shadow-slate-200/80 dark:shadow-none'
                  : 'text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${isActive('/epreuves') ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span>Épreuves</span>
            </Link>

            <Link
              href="/deposer"
              onClick={(e) => {
                if (status === 'unauthenticated') {
                  e.preventDefault();
                  signIn('google', { callbackUrl: '/deposer' });
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive('/deposer')
                  ? 'bg-white dark:bg-[#21262D] text-brand dark:text-emerald-400 shadow-sm shadow-slate-200/80 dark:shadow-none'
                  : 'text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Upload className={`w-4 h-4 ${isActive('/deposer') ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
              <span>Déposer</span>
            </Link>

            <Link
              href="/mes-depots"
              onClick={(e) => {
                if (status === 'unauthenticated') {
                  e.preventDefault();
                  signIn('google', { callbackUrl: '/mes-depots' });
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive('/mes-depots')
                  ? 'bg-white dark:bg-[#21262D] text-brand dark:text-emerald-400 shadow-sm shadow-slate-200/80 dark:shadow-none'
                  : 'text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
              }`}
            >
              <FolderArchive className={`w-4 h-4 ${isActive('/mes-depots') ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
              <span>Mes dépôts</span>
            </Link>

            {/* Lien Admin */}
            {userIsAdmin && (
              <Link
                href="/admin"
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive('/admin')
                    ? 'bg-white dark:bg-[#21262D] text-red-700 dark:text-red-400 shadow-sm shadow-red-100 dark:shadow-none'
                    : 'text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/40'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin</span>
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full shadow-sm animate-pulse">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
            )}
          </nav>

          {/* Right side: Theme toggle + Profile menu or Connexion button */}
          <div className="flex items-center gap-2">
            {/* Bouton thème — toujours visible */}
            <ThemeToggle />
            {status === 'loading' ? (
              <div className="w-9 h-9 rounded-full bg-slate-200/80 animate-shimmer" />
            ) : session ? (
              /* ── Menu Profil unifié (toutes tailles d'écran) ── */
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-200 hover:shadow-subtle transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand/20"
                  aria-label="Menu profil utilisateur"
                  aria-expanded={menuOpen}
                >
                  <div className="relative">
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'Profil'}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        className="w-8 h-8 rounded-full object-cover border border-slate-100 shadow-xs"
                      />
                    ) : null}
                    <div
                      style={{ display: session.user?.image ? 'none' : 'flex' }}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-teal-700 text-white items-center justify-center text-xs font-bold shadow-xs"
                    >
                      {(session.user?.name?.[0] || 'E').toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>

                  <span className="hidden sm:block text-xs font-semibold text-ink-primary max-w-[120px] truncate">
                    {session.user?.name?.split(' ')[0] || 'Étudiant'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown unifié */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-72 glass-dropdown rounded-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* En-tête utilisateur */}
                    <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 rounded-xl mb-1.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-ink-primary truncate">
                          {session.user?.name || 'Étudiant MBH'}
                        </p>
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 rounded-badge uppercase tracking-wider shrink-0">
                          Actif
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary truncate">
                        {session.user?.email}
                      </p>
                    </div>

                    {/* Liens de navigation principaux */}
                    <div className="space-y-0.5 py-1">
                      <Link
                        href="/epreuves"
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                          isActive('/epreuves') && !isActive('/epreuves/')
                            ? 'bg-brand-50 dark:bg-brand/20 text-brand'
                            : 'text-ink-primary hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand'
                        }`}
                      >
                        <BookOpen className={`w-4 h-4 ${isActive('/epreuves') ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Consulter les épreuves</span>
                      </Link>

                      <Link
                        href="/deposer"
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                          isActive('/deposer')
                            ? 'bg-brand-50 dark:bg-brand/20 text-brand'
                            : 'text-ink-primary hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand'
                        }`}
                      >
                        <Upload className={`w-4 h-4 ${isActive('/deposer') ? 'text-teal-600' : 'text-slate-400'}`} />
                        <span>Déposer une épreuve</span>
                      </Link>

                      <Link
                        href="/mes-depots"
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                          isActive('/mes-depots')
                            ? 'bg-brand-50 dark:bg-brand/20 text-brand'
                            : 'text-ink-primary hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand'
                        }`}
                      >
                        <FolderArchive className={`w-4 h-4 ${isActive('/mes-depots') ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span>Mes dépôts</span>
                      </Link>

                      {/* Lien Admin — visible uniquement pour l'administrateur */}
                      {userIsAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className={`relative flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                            isActive('/admin')
                              ? 'bg-red-50 text-red-700'
                              : 'text-red-600 hover:bg-red-50/80 hover:text-red-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <ShieldAlert className="w-4 h-4" />
                            <span>Administration</span>
                          </div>
                          {pendingCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full shadow-sm animate-pulse">
                              {pendingCount > 99 ? '99+' : pendingCount}
                            </span>
                          )}
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 my-1.5" />

                    {/* Changer de niveau */}
                    <Link
                      href="/onboarding"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-ink-secondary hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand dark:hover:text-emerald-400 rounded-xl transition-colors"
                    >
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      <span>Changer mon niveau (1ère à 3ème année)</span>
                    </Link>

                    <div className="border-t border-slate-100 dark:border-slate-700 my-1.5" />

                    {/* Déconnexion */}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Bouton connexion (non authentifié) */
              <button
                onClick={() => signIn('google')}
                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-brand bg-brand-50 hover:bg-brand-100/80 px-4 py-2 rounded-xl border border-brand-200/80 transition-all shadow-subtle hover:scale-[1.02]"
              >
                <span>Connexion avec Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
