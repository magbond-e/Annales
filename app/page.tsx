'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import {
  Search,
  UploadCloud,
  Users,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Award,
  Star,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Activity,
  Download,
  CheckCircle2,
  Layers,
  FileCheck,
  LogIn,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const GoogleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

/* ── Hook: intersection observer for scroll-reveal ── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Animated counter ── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const { ref, visible } = useReveal(0.3);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 35);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Floating particle ── */
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <span
      className="absolute rounded-full opacity-0 animate-particle pointer-events-none"
      style={style}
    />
  );
}

function LandingContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const callbackFromUrl = searchParams.get('callbackUrl') || '/epreuves';
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Rotating words
  const rotatingWords = ['devoirs surveillés', 'examens officiels', 'sessions de rattrapage', 'corrigés & barèmes'];
  const [wordIndex, setWordIndex] = useState(0);
  const [fadeState, setFadeState] = useState('opacity-100 translate-y-0');

  // Parallax mouse effect
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeState('opacity-0 -translate-y-3 transition-all duration-300');
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % rotatingWords.length);
        setFadeState('opacity-0 translate-y-3');
        setTimeout(() => setFadeState('opacity-100 translate-y-0 transition-all duration-500'), 60);
      }, 300);
    }, 3200);
    return () => clearInterval(interval);
  }, [rotatingWords.length]);

  const handleGoogleLogin = (callbackPath?: string) => {
    setIsLoggingIn(true);
    signIn('google', { callbackUrl: callbackPath || callbackFromUrl });
  };

  const toggleFaq = (index: number) => setOpenFaqIndex(openFaqIndex === index ? null : index);
  const isAuthenticated = status === 'authenticated';

  // Reveal hooks for sections
  const heroReveal = useReveal(0.05);
  const statsReveal = useReveal(0.2);
  const featuresReveal = useReveal(0.15);
  const howReveal = useReveal(0.15);
  const whyReveal = useReveal(0.15);
  const matiereReveal = useReveal(0.15);
  const faqReveal = useReveal(0.15);
  const ctaReveal = useReveal(0.2);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0D1117] text-[#0F172A] dark:text-[#F0F6FC] font-sans overflow-x-hidden">

      {/* ── Inline CSS for custom animations ── */}
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-18px)} }
        @keyframes float-delayed { 0%,100%{transform:translateY(0px) rotate(0deg)} 33%{transform:translateY(-12px) rotate(5deg)} 66%{transform:translateY(-20px) rotate(-3deg)} }
        @keyframes float-slow { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-10px) rotate(8deg)} }
        @keyframes pulse-glow { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes gradient-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes particle { 0%{opacity:0;transform:translateY(0) scale(0)} 20%{opacity:1} 80%{opacity:0.5} 100%{opacity:0;transform:translateY(-80px) scale(1.5)} }
        @keyframes orbit { from{transform:rotate(0deg) translateX(var(--orbit-r)) rotate(0deg)} to{transform:rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg)} }
        @keyframes border-spin { to{--angle:360deg} }
        @keyframes text-shimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes slide-up { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scale-in { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 9s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-particle { animation: particle 3s ease-out forwards; }
        .animate-gradient { background-size:200% 200%; animation: gradient-shift 6s ease infinite; }
        .animate-shimmer-text { background-size:200% auto; animation: text-shimmer 4s linear infinite; }
        .reveal-up { opacity:0; transform:translateY(40px); transition:all 0.7s cubic-bezier(0.22,1,0.36,1); }
        .reveal-up.visible { opacity:1; transform:translateY(0); }
        .reveal-scale { opacity:0; transform:scale(0.94); transition:all 0.6s cubic-bezier(0.22,1,0.36,1); }
        .reveal-scale.visible { opacity:1; transform:scale(1); }
        .card-hover { transition: all 0.35s cubic-bezier(0.22,1,0.36,1); }
        .card-hover:hover { transform: translateY(-6px) scale(1.01); }
        .glow-border { position:relative; }
        .glow-border::before { content:''; position:absolute; inset:-1px; border-radius:inherit; background:linear-gradient(135deg,#10b981,#0f4c5c,#10b981); background-size:200% 200%; animation:gradient-shift 4s ease infinite; z-index:-1; }
      `}</style>

      {/* ── BACKGROUND: Ambient orbs + grid ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
        {/* Animated gradient orbs */}
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-60 dark:opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(15,76,92,0.12) 0%, transparent 70%)',
            transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -20}px)`,
            transition: 'transform 0.8s ease-out',
          }}
        />
        <div
          className="absolute top-[30%] -right-32 w-[700px] h-[700px] rounded-full opacity-50 dark:opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)',
            transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 15}px)`,
            transition: 'transform 1s ease-out',
          }}
        />
        <div
          className="absolute -bottom-32 left-[15%] w-[500px] h-[500px] rounded-full opacity-40 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
            transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -10}px)`,
            transition: 'transform 1.2s ease-out',
          }}
        />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(#0f4c5c 1px, transparent 1px), linear-gradient(90deg, #0f4c5c 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />

        {/* Floating icons with parallax */}
        <div style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -15}px)`, transition: 'transform 1s ease-out' }}>
          <BookOpen className="absolute top-[18%] left-[7%] h-14 w-14 text-[#0F4C5C]/12 dark:text-emerald-500/10 animate-float hidden lg:block" />
        </div>
        <div style={{ transform: `translate(${mousePos.x * 18}px, ${mousePos.y * 12}px)`, transition: 'transform 0.9s ease-out' }}>
          <GraduationCap className="absolute top-[22%] right-[8%] h-18 w-18 text-emerald-600/12 dark:text-emerald-400/10 animate-float-delayed hidden lg:block" />
        </div>
        <div style={{ transform: `translate(${mousePos.x * -12}px, ${mousePos.y * 20}px)`, transition: 'transform 1.1s ease-out' }}>
          <Award className="absolute bottom-[30%] left-[9%] h-16 w-16 text-amber-500/18 dark:text-amber-400/10 animate-float-slow hidden lg:block" />
        </div>
        <div style={{ transform: `translate(${mousePos.x * 22}px, ${mousePos.y * -18}px)`, transition: 'transform 0.8s ease-out' }}>
          <Activity className="absolute bottom-[40%] right-[11%] h-14 w-14 text-[#0F4C5C]/12 dark:text-emerald-500/10 animate-float hidden lg:block" />
        </div>
        <Sparkles className="absolute top-[13%] right-[20%] h-6 w-6 text-emerald-400/30 animate-pulse-glow" />
        <Sparkles className="absolute top-[60%] left-[5%] h-4 w-4 text-teal-400/25 animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        <Zap className="absolute top-[45%] right-[5%] h-5 w-5 text-amber-400/20 animate-pulse-glow" style={{ animationDelay: '0.8s' }} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          1. HEADER
      ═══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-[#0D1117]/80 backdrop-blur-xl transition-all shadow-sm shadow-slate-900/5">
        <div className="max-w-6xl mx-auto flex h-16 sm:h-18 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative group-hover:scale-105 transition-transform duration-200">
              <img src="/logo.svg" alt="Logo Annale229" className="w-9 h-9 rounded-xl shadow-md shadow-[#0F4C5C]/15 object-contain" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-[#0F4C5C] dark:text-emerald-400">
                  Annale<span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">229</span>
                </span>
                <span className="hidden xs:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-[#0F4C5C] dark:text-emerald-400 bg-[#EAF4F6] dark:bg-emerald-950/50 border border-[#C4E8ED] dark:border-emerald-800/60 rounded-full uppercase tracking-wider">
                  MBH • EPAC
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">Maintenance Biomédicale & Hospitalière</span>
            </div>
          </Link>

          {/* Centre : Nav links (desktop uniquement, si connecté) */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-[#161B22] px-2 py-1.5 rounded-2xl border border-slate-200/70 dark:border-[#30363D]">
              <Link href="/epreuves" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0F4C5C] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-[#21262D] transition-all duration-150">
                <BookOpen className="w-4 h-4" />
                Épreuves
              </Link>
              <Link href="/deposer" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0F4C5C] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-[#21262D] transition-all duration-150">
                <UploadCloud className="w-4 h-4" />
                Déposer
              </Link>
              <Link href="/mes-depots" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0F4C5C] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-[#21262D] transition-all duration-150">
                <Download className="w-4 h-4" />
                Mes dépôts
              </Link>
            </nav>
          )}

          {/* Droite : CTA + ThemeToggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                href="/epreuves"
                className="inline-flex items-center gap-2 h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#0F4C5C] dark:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-[#0F4C5C]/20 hover:bg-[#14647A] dark:hover:bg-emerald-500 hover:-translate-y-px transition-all duration-200"
              >
                <span>Mon espace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleGoogleLogin('/epreuves')}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2 h-9 sm:h-10 px-3.5 sm:px-5 rounded-xl bg-[#0F4C5C] dark:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-[#0F4C5C]/20 hover:bg-[#14647A] dark:hover:bg-emerald-500 hover:-translate-y-px active:scale-95 transition-all duration-200"
              >
                <GoogleIcon className="w-4 h-4 bg-white p-0.5 rounded-full" />
                <span>{isLoggingIn ? 'Connexion...' : 'Connexion Google'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative">

        {/* ═══════════════════════════════════════════════════════
            2. HERO — Dynamique & Immersif
        ═══════════════════════════════════════════════════════ */}
        <section className="relative px-4 pt-20 pb-24 md:pt-28 md:pb-32 text-center overflow-hidden">
          {/* Hero gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-[#F0F9FF] to-[#F8FAFC] dark:from-[#0D1117] dark:via-[#0D1117] dark:to-[#161B22] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(15,76,92,0.06)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.12)_0%,transparent_60%)] pointer-events-none" />

          <div
            ref={heroReveal.ref}
            className={`max-w-4xl mx-auto flex flex-col items-center relative z-10 reveal-up ${heroReveal.visible ? 'visible' : ''}`}
          >
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800 rounded-full text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-8 shadow-sm hover:shadow-md transition-shadow group cursor-default">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>Plateforme officielle d&apos;annales • Filière MBH (EPAC / UAC)</span>
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 group-hover:rotate-12 transition-transform" />
            </div>

            {/* Titre principal avec mot rotatif */}
            <h1 className="font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#0F172A] dark:text-white mb-6 leading-[1.12] tracking-tight max-w-3xl">
              Révise avec tous les{' '}
              <span className="relative inline-flex flex-col items-center">
                <span className="inline-block text-[#0F4C5C] dark:text-emerald-400">
                  <span className={`inline-block ${fadeState}`} style={{ transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
                    {rotatingWords[wordIndex]}
                  </span>
                </span>
                {/* Soulignement SVG animé */}
                <svg className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-3 sm:h-4" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
                  <path d="M2 9C70 3 180 2 298 7" stroke="url(#heroUnderline)" strokeWidth="3.5" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="heroUnderline" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#0f4c5c" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <br className="hidden sm:block" />
              <span className="text-[#0F172A] dark:text-white"> de la filière MBH.</span>
            </h1>

            {/* Sous-titre */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-10 max-w-2xl leading-relaxed font-normal">
              Fini les photos floues sur WhatsApp et les clés USB perdues. Connecte-toi avec Google pour consulter et télécharger les annales officielles de la 1ère à la 3ème année.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto mb-6">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/epreuves"
                    className="inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-8 rounded-2xl bg-gradient-to-r from-[#0F4C5C] to-teal-700 hover:from-[#14647A] hover:to-teal-800 text-white text-base font-bold shadow-xl shadow-[#0F4C5C]/30 hover:shadow-[#0F4C5C]/50 hover:-translate-y-1 active:scale-95 transition-all duration-300 group"
                  >
                    <span>Accéder aux annales</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/deposer"
                    className="inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-7 rounded-2xl bg-white dark:bg-[#161B22] border-2 border-slate-200 dark:border-[#30363D] text-slate-700 dark:text-slate-200 text-base font-semibold hover:border-[#0F4C5C]/40 dark:hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-[#21262D] hover:-translate-y-0.5 hover:shadow-md active:scale-95 transition-all duration-300"
                  >
                    <UploadCloud className="h-5 w-5 text-[#0F4C5C] dark:text-emerald-400" />
                    <span>Déposer une épreuve</span>
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin('/epreuves')}
                    disabled={isLoggingIn}
                    className="glow-border inline-flex items-center justify-center gap-3 h-13 sm:h-14 px-8 rounded-2xl bg-gradient-to-r from-[#0F4C5C] to-teal-700 hover:from-[#14647A] hover:to-teal-800 text-white text-base font-bold shadow-xl shadow-[#0F4C5C]/30 hover:shadow-[#0F4C5C]/50 hover:-translate-y-1 hover:scale-[1.02] active:scale-95 transition-all duration-300 group cursor-pointer"
                  >
                    <GoogleIcon className="w-5 h-5 bg-white p-0.5 rounded-full" />
                    <span>{isLoggingIn ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin('/deposer')}
                    disabled={isLoggingIn}
                    className="inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-7 rounded-2xl bg-white dark:bg-[#161B22] border-2 border-slate-200 dark:border-[#30363D] text-slate-700 dark:text-slate-200 text-base font-semibold hover:border-[#0F4C5C]/40 dark:hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-[#21262D] hover:-translate-y-0.5 hover:shadow-md active:scale-95 transition-all duration-300 cursor-pointer"
                  >
                    <UploadCloud className="h-5 w-5 text-[#0F4C5C] dark:text-emerald-400" />
                    <span>Déposer une épreuve</span>
                  </button>
                </>
              )}
            </div>

            {/* Trust signal */}
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-10">
              Gratuit · Aucune carte bancaire · Connexion sécurisée Google
            </p>

            {/* Social proof */}
            <div className="flex flex-col items-center gap-3 pt-6 border-t border-slate-200/70 dark:border-slate-800 w-full max-w-md">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {[
                    ['KM', 'from-teal-600 to-emerald-500'],
                    ['AB', 'from-blue-600 to-indigo-500'],
                    ['UO', 'from-amber-500 to-red-500'],
                    ['SD', 'from-emerald-600 to-teal-700'],
                    ['ML', 'from-purple-500 to-pink-500'],
                  ].map(([initials, gradient]) => (
                    <div key={initials} className={`w-8 h-8 rounded-full border-2 border-white dark:border-[#161B22] bg-gradient-to-tr ${gradient} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                      {initials}
                    </div>
                  ))}
                </div>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">4.9/5</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
                Recommandé par les étudiants MBH de l&apos;EPAC
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40 animate-bounce">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Défiler</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            3. STATS ANIMÉES
        ═══════════════════════════════════════════════════════ */}
        <section className="px-4 py-10 relative z-10 overflow-hidden">
          {/* Background dégradé premium */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F4C5C] via-teal-800 to-[#0F4C5C] animate-gradient" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div
            ref={statsReveal.ref}
            className={`max-w-6xl mx-auto relative z-10 reveal-up ${statsReveal.visible ? 'visible' : ''}`}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <BookOpen className="w-6 h-6" />, value: 20, suffix: '+', label: 'Matières répertoriées', color: 'text-emerald-300' },
                { icon: <GraduationCap className="w-6 h-6" />, value: 3, suffix: '', label: 'Niveaux (L1 à L3 MBH)', color: 'text-teal-300' },
                { icon: <FileCheck className="w-6 h-6" />, value: 100, suffix: '%', label: 'Contenu vérifié', color: 'text-blue-300' },
                { icon: <Download className="w-6 h-6" />, value: 0, suffix: '€', label: 'Accès & téléchargements', color: 'text-amber-300' },
              ].map(({ icon, value, suffix, label, color }, i) => (
                <div key={i} className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-all duration-300 group">
                  <div className={`w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-3 ${color} group-hover:scale-110 transition-transform`}>
                    {icon}
                  </div>
                  <div className={`text-3xl font-black ${color} font-heading`}>
                    <Counter target={value} suffix={suffix} />
                  </div>
                  <div className="text-xs font-medium text-white/70 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            4. APERÇU CATALOGUE (Features split)
        ═══════════════════════════════════════════════════════ */}
        <section className="px-4 py-24 bg-[#F8FAFC] dark:bg-[#0D1117] relative z-10">
          <div
            ref={featuresReveal.ref}
            className={`max-w-6xl mx-auto reveal-up ${featuresReveal.visible ? 'visible' : ''}`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Texte */}
              <div className="lg:col-span-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F4C5C]/10 dark:bg-emerald-950/40 text-[#0F4C5C] dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-5 border border-[#0F4C5C]/15 dark:border-emerald-800/50">
                  <Layers className="w-3.5 h-3.5" />
                  Base de connaissances centralisée
                </div>
                <h2 className="font-black text-3xl sm:text-4xl text-[#0F172A] dark:text-white leading-tight mb-5">
                  Trouve ton épreuve en{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F4C5C] to-emerald-600 dark:from-emerald-400 dark:to-teal-300">10 secondes</span>.
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-7">
                  Recherche par mot-clé, filtre par promotion et isole les devoirs surveillés ou rattrapages. Chaque sujet est numérisé et directement consultable.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    'PDF haute définition lisibles sur smartphone ou ordinateur.',
                    'Indication claire des corrigés et barèmes disponibles.',
                    'Téléchargement direct et immédiat après connexion Google.',
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
                    </div>
                  ))}
                </div>

                {isAuthenticated ? (
                  <Link href="/epreuves" className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0F4C5C] dark:bg-emerald-600 text-white text-sm font-bold shadow-md hover:bg-[#14647A] dark:hover:bg-emerald-500 hover:-translate-y-0.5 transition-all group">
                    <span>Explorer le catalogue</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <button type="button" onClick={() => handleGoogleLogin('/epreuves')} disabled={isLoggingIn}
                    className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-[#0F4C5C] dark:bg-emerald-600 text-white text-sm font-bold shadow-md hover:bg-[#14647A] dark:hover:bg-emerald-500 hover:-translate-y-0.5 transition-all cursor-pointer group">
                    <GoogleIcon className="w-4 h-4 bg-white p-0.5 rounded-full" />
                    <span>{isLoggingIn ? 'Connexion...' : 'Se connecter pour explorer'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>

              {/* Mockup UI premium */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-md relative">
                  {/* Glow derrière */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-xl" />
                  <div className="relative bg-white dark:bg-[#161B22] border border-slate-200/80 dark:border-[#30363D] rounded-3xl p-5 shadow-2xl shadow-slate-200/60 dark:shadow-black/60">
                    {/* macOS dots */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#30363D] pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
                        <div className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 transition-colors cursor-pointer" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-pointer" />
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-400 ml-2">Annale229 / Catalogue</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        En ligne
                      </span>
                    </div>

                    {/* Search */}
                    <div className="bg-slate-50 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] rounded-xl px-3 py-2.5 text-xs text-slate-400 flex items-center gap-2 mb-3.5 focus-within:border-[#0F4C5C]/40 transition-colors">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Physique médicale, Imagerie...</span>
                    </div>

                    {/* Filter pills */}
                    <div className="flex items-center gap-1.5 mb-4 text-[11px] overflow-hidden">
                      <span className="px-2.5 py-1 bg-gradient-to-r from-[#0F4C5C] to-teal-700 dark:from-emerald-600 dark:to-teal-600 text-white rounded-lg font-semibold">Tous</span>
                      {['1ère année', '2ème année', '3ème année'].map((y) => (
                        <span key={y} className="px-2.5 py-1 bg-slate-100 dark:bg-[#21262D] text-slate-600 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer">{y}</span>
                      ))}
                    </div>

                    {/* Epreuve cards */}
                    <div className="space-y-2.5 text-xs">
                      {[
                        { title: 'Physique Médicale & Rayonnements', type: 'Devoir', level: '1ère année', year: '2024-2025', corrige: true, typeColor: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' },
                        { title: 'Électronique Médicale & Capteurs', type: 'Rattrapage', level: '2ème année', year: '2024-2025', corrige: false, typeColor: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' },
                        { title: 'Maintenance Équipements Hospitaliers', type: 'Devoir', level: '3ème année', year: '2023-2024', corrige: false, typeColor: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' },
                      ].map((item, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-[#21262D]/60 hover:bg-white dark:hover:bg-[#21262D] border border-slate-200 dark:border-[#30363D] hover:border-[#0F4C5C]/20 dark:hover:border-emerald-500/30 rounded-xl transition-all duration-200 hover:shadow-sm cursor-pointer group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-900 dark:text-[#F0F6FC] text-[11px] group-hover:text-[#0F4C5C] dark:group-hover:text-emerald-400 transition-colors truncate mr-2">{item.title}</span>
                            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md shrink-0 ${item.typeColor}`}>{item.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>{item.level} • {item.year} • PDF</span>
                            {item.corrige && (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Corrigé
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            5. POURQUOI ANNALE229 — Cards premium
        ═══════════════════════════════════════════════════════ */}
        <section className="px-4 py-24 bg-white dark:bg-[#161B22] border-y border-slate-200/60 dark:border-[#30363D] relative z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(16,185,129,0.04)_0%,transparent_60%)] pointer-events-none" />
          <div
            ref={whyReveal.ref}
            className={`max-w-5xl mx-auto relative z-10 reveal-up ${whyReveal.visible ? 'visible' : ''}`}
          >
            <div className="text-center mb-14">
              <h2 className="font-black text-3xl sm:text-4xl text-[#0F172A] dark:text-white mb-4">
                Pourquoi utiliser <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F4C5C] to-emerald-600 dark:from-emerald-400 dark:to-teal-300">Annale229</span> ?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base font-medium">
                Une réponse concrète aux difficultés réelles des étudiants en Maintenance Biomédicale et Hospitalière.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Search className="h-7 w-7" />, bg: 'bg-blue-500/10 dark:bg-blue-500/20', color: 'text-blue-600 dark:text-blue-400',
                  title: 'Recherche instantanée',
                  desc: 'Filtre par matière, promotion et type d\'évaluation. Trouve précisément le sujet en quelques secondes.',
                  hoverColor: 'hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-blue-50',
                },
                {
                  icon: <UploadCloud className="h-7 w-7" />, bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', color: 'text-emerald-600 dark:text-emerald-400',
                  title: 'Mémoire préservée',
                  desc: 'Tout est archivé dans le cloud avec des copies sécurisées, accessible à chaque nouvelle rentrée.',
                  hoverColor: 'hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-emerald-50',
                },
                {
                  icon: <Users className="h-7 w-7" />, bg: 'bg-amber-500/10 dark:bg-amber-500/20', color: 'text-amber-600 dark:text-amber-400',
                  title: 'Entraide étudiante',
                  desc: 'Chaque étudiant peut contribuer en téléversant ses devoirs pour aider les promotions suivantes.',
                  hoverColor: 'hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-amber-50',
                },
              ].map(({ icon, bg, color, title, desc, hoverColor }, i) => (
                <div key={i} className={`card-hover bg-[#F8FAFC] dark:bg-[#21262D]/50 border border-slate-200 dark:border-[#30363D] p-7 rounded-2xl hover:shadow-xl ${hoverColor} transition-all duration-300 group`}>
                  <div className={`${bg} ${color} p-3.5 rounded-2xl w-fit mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                  </div>
                  <h3 className="font-black text-xl mb-3 text-[#0F172A] dark:text-[#F0F6FC] transition-colors">{title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            6. COMMENT ÇA MARCHE — Timeline
        ═══════════════════════════════════════════════════════ */}
        <section className="px-4 py-24 bg-[#F8FAFC] dark:bg-[#0D1117] relative z-10">
          <div
            ref={howReveal.ref}
            className={`max-w-4xl mx-auto reveal-up ${howReveal.visible ? 'visible' : ''}`}
          >
            <h2 className="font-black text-3xl sm:text-4xl text-center mb-4 text-[#0F172A] dark:text-white">Comment ça marche ?</h2>
            <p className="text-center text-slate-500 dark:text-slate-400 text-base mb-14 max-w-xl mx-auto">3 étapes. Moins d&apos;une minute. Sans fournir le moindre mot de passe.</p>

            <div className="grid md:grid-cols-3 gap-6 relative">
              {/* Ligne de connexion entre les étapes (desktop) */}
              <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-gradient-to-r from-emerald-300 to-teal-400 opacity-40" />

              {[
                { n: '1', title: 'Connecte-toi avec Google', desc: 'Connexion instantanée en 1 clic sans mot de passe à retenir.', icon: <LogIn className="w-5 h-5" /> },
                { n: '2', title: 'Consulte ou télécharge', desc: 'Filtre par matière et promotion, puis télécharge les sujets et corrigés PDF.', icon: <Download className="w-5 h-5" /> },
                { n: '3', title: 'Partage tes épreuves', desc: 'Dépose tes devoirs récents pour faire grandir la promo entière.', icon: <UploadCloud className="w-5 h-5" /> },
              ].map(({ n, title, desc, icon }, i) => (
                <div key={i} className="card-hover flex flex-col items-center text-center bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] p-8 rounded-2xl shadow-xs hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-700/60 transition-all duration-300 group" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="relative mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-2xl border-2 border-emerald-200 dark:border-emerald-800 shadow-md shadow-emerald-100 dark:shadow-none group-hover:scale-110 transition-all duration-300">
                      {n}
                    </div>
                    <div className="absolute -right-2 -bottom-2 w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      {icon}
                    </div>
                  </div>
                  <h3 className="font-black text-lg mb-2 text-[#0F172A] dark:text-[#F0F6FC] group-hover:text-[#0F4C5C] dark:group-hover:text-emerald-400 transition-colors">{title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            7. MATIÈRES & FILIÈRE
        ═══════════════════════════════════════════════════════ */}
        <section className="px-4 py-20 bg-white dark:bg-[#161B22] border-t border-slate-200/60 dark:border-[#30363D] text-center relative z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(15,76,92,0.04)_0%,transparent_60%)] pointer-events-none" />
          <div
            ref={matiereReveal.ref}
            className={`max-w-4xl mx-auto relative z-10 reveal-up ${matiereReveal.visible ? 'visible' : ''}`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#21262D] rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 mb-5 border border-slate-200 dark:border-[#30363D]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Cursus Spécialisé EPAC
            </div>
            <h2 className="font-black text-2xl sm:text-3xl mb-4 text-[#0F172A] dark:text-white">
              Filière Maintenance Biomédicale & Hospitalière (MBH)
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-10">
              Département de Génie Biomédical — École Polytechnique d&apos;Abomey-Calavi (EPAC, UAC).
            </p>

            <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto mb-12">
              {[
                'Thermodynamique', 'Électronique Médicale', 'Anglais technique',
                'Informatique', 'Anatomie & Physiologie', 'Sécurité & Normes Hospitalières',
                'Instrumentation Biomédicale', "Télémédecine & Systèmes d'Information",
              ].map((matiere, idx) => (
                <div key={idx} className="card-hover px-4 py-2 bg-slate-50 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-[#0F4C5C]/40 dark:hover:border-emerald-500/50 hover:bg-white dark:hover:bg-[#282E37] hover:text-[#0F4C5C] dark:hover:text-emerald-400 hover:shadow-md transition-all flex items-center gap-2 cursor-default">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {matiere}
                </div>
              ))}
            </div>

            {isAuthenticated ? (
              <Link href="/epreuves" className="inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-8 rounded-2xl bg-gradient-to-r from-[#0F4C5C] to-teal-700 hover:from-[#14647A] hover:to-teal-800 text-white text-sm sm:text-base font-bold shadow-lg shadow-[#0F4C5C]/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all group">
                <span>Accéder aux épreuves maintenant</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <button type="button" onClick={() => handleGoogleLogin('/epreuves')} disabled={isLoggingIn}
                className="inline-flex items-center justify-center gap-3 h-12 sm:h-14 px-8 rounded-2xl bg-gradient-to-r from-[#0F4C5C] to-teal-700 hover:from-[#14647A] hover:to-teal-800 text-white text-sm sm:text-base font-bold shadow-lg shadow-[#0F4C5C]/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group">
                <GoogleIcon className="w-4 h-4 bg-white p-0.5 rounded-full" />
                <span>{isLoggingIn ? 'Connexion...' : 'Se connecter avec Google pour réviser'}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            8. FAQ
        ═══════════════════════════════════════════════════════ */}
        <section className="px-4 py-20 bg-[#F8FAFC] dark:bg-[#0D1117] border-t border-slate-200/60 dark:border-[#30363D] relative z-10">
          <div
            ref={faqReveal.ref}
            className={`max-w-2xl mx-auto reveal-up ${faqReveal.visible ? 'visible' : ''}`}
          >
            <h2 className="font-black text-2xl sm:text-3xl text-[#0F172A] dark:text-white text-center mb-10">Questions fréquentes</h2>
            <div className="bg-white dark:bg-[#161B22] rounded-3xl border border-slate-200 dark:border-[#30363D] shadow-xs divide-y divide-slate-100 dark:divide-[#30363D] overflow-hidden">
              {[
                { q: "L'accès aux annales est-il vraiment gratuit ?", a: "Oui, l'accès et le téléchargement de toutes les épreuves sont 100% gratuits pour tous les étudiants de la filière MBH et de l'EPAC, sans aucun abonnement ni carte bancaire." },
                { q: "Pourquoi dois-je me connecter avec Google ?", a: "La connexion Google en 1 clic permet d'identifier les étudiants de l'EPAC, de sécuriser la plateforme, de mémoriser vos préférences et de tracer les dépôts d'épreuves sans exiger de mot de passe supplémentaire." },
                { q: "Comment déposer une épreuve ou un corrigé ?", a: "Connectez-vous avec votre compte Google, rendez-vous sur la page Déposer, sélectionnez votre matière et niveau, puis glissez votre document (PDF ou photo nette). Votre sujet est mis à disposition de toute la promo." },
                { q: "Qui gère et maintient Annale229 ?", a: "La plateforme est conçue et développée par Magbondé Kadoukpè Ulrich, étudiant en Génie Biomédical à l'EPAC, pour résoudre durablement le problème de dispersion des épreuves au sein de la filière MBH." },
              ].map(({ q, a }, i) => (
                <div key={i} className="group">
                  <button type="button" onClick={() => toggleFaq(i)}
                    className="w-full flex items-center justify-between text-left font-bold text-sm sm:text-base text-[#0F172A] dark:text-[#F0F6FC] hover:text-[#0F4C5C] dark:hover:text-emerald-400 transition-colors px-6 py-5 gap-3">
                    <span>{q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-all duration-300 shrink-0 ${openFaqIndex === i ? 'rotate-180 text-[#0F4C5C] dark:text-emerald-400' : 'group-hover:text-[#0F4C5C]'}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            9. CTA FINAL — Premium
        ═══════════════════════════════════════════════════════ */}
        {!isAuthenticated && (
          <section className="px-4 py-20 relative z-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0F4C5C] via-teal-800 to-emerald-900 animate-gradient" />
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(16,185,129,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)' }} />

            <div
              ref={ctaReveal.ref}
              className={`max-w-2xl mx-auto text-center relative z-10 reveal-scale ${ctaReveal.visible ? 'visible' : ''}`}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-semibold text-emerald-200 mb-6 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 animate-pulse-glow" />
                Rejoins tes camarades sur Annale229
              </div>
              <h2 className="font-black text-3xl sm:text-4xl text-white mb-5 leading-tight">
                Prêt(e) à réviser avec les vraies épreuves MBH ?
              </h2>
              <p className="text-slate-300 text-base mb-10 leading-relaxed">
                Connecte-toi en 5 secondes avec ton compte Google et accède instantanément à toutes les archives.
              </p>
              <button type="button" onClick={() => handleGoogleLogin('/epreuves')} disabled={isLoggingIn}
                className="inline-flex items-center gap-3 h-14 px-10 rounded-2xl bg-white text-[#0F4C5C] text-base font-black shadow-2xl hover:shadow-white/20 hover:-translate-y-1 hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer group">
                <GoogleIcon className="w-5 h-5" />
                <span>{isLoggingIn ? 'Connexion en cours...' : 'Se connecter gratuitement avec Google'}</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-slate-400 text-xs mt-5">Aucune carte bancaire · Gratuit à vie · Sécurisé par Google</p>
            </div>
          </section>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════
          10. FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="bg-[#0F172A] text-slate-300 py-12 px-4 relative z-10 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <img src="/logo.svg" alt="Logo Annale229" className="w-9 h-9 rounded-xl opacity-90 object-contain" />
              <span className="font-black text-xl text-white">
                Annale<span className="text-emerald-400">229</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Plateforme d&apos;annales pour les étudiants de la filière Maintenance Biomédicale et Hospitalière (MBH) de l&apos;EPAC, UAC — Bénin.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">Service opérationnel</span>
            </div>
            <p className="text-xs text-slate-500 text-center md:text-right">
              © {new Date().getFullYear()} Annale229 · Développé par{' '}
              <span className="text-white font-semibold">Magbondé K. Ulrich</span>
            </p>
            <p className="text-xs text-slate-600">EPAC — Université d&apos;Abomey-Calavi</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0D1117]" />}>
      <LandingContent />
    </Suspense>
  );
}
