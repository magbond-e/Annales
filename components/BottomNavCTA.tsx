'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, Plus } from 'lucide-react';

export function BottomNavCTA() {
  const pathname = usePathname();

  // Ne pas afficher sur les pages de formulaire ou sur la landing
  if (pathname === '/deposer' || pathname === '/onboarding' || pathname === '/') {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 md:hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Link
        href="/deposer"
        className="flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-[#0F4C5C] to-[#10B981] hover:brightness-105 text-white font-bold rounded-full shadow-xl shadow-emerald-950/40 hover:scale-105 active:scale-95 transition-all text-xs tracking-wide"
      >
        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
          <Plus className="w-3.5 h-3.5 text-white" />
        </div>
        <span>Déposer une épreuve</span>
      </Link>
    </div>
  );
}
