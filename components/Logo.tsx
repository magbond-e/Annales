'use client';

import React from 'react';

interface LogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  variant?: 'squircle' | 'transparent';
  className?: string;
  showBadge?: boolean;
}

export function Logo({
  size = 'md',
  withText = false,
  variant = 'squircle',
  className = '',
  showBadge = true,
}: LogoProps) {
  const pixelSize = typeof size === 'number'
    ? size
    : {
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64,
      }[size] || 40;

  const isSquircle = variant === 'squircle';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div 
        style={{ width: pixelSize, height: pixelSize }}
        className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
      >
        <svg
          viewBox={isSquircle ? "0 0 512 512" : "90 25 330 460"}
          width={pixelSize}
          height={pixelSize}
          className="w-full h-full drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="compBrandBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5447C8" />
              <stop offset="100%" stopColor="#4336A4" />
            </linearGradient>
            <linearGradient id="compGoldSwoosh" x1="0%" y1="0%" x2="100%" y2="60%">
              <stop offset="0%" stopColor="#FFBE2E" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="compCoralSwoosh" x1="0%" y1="0%" x2="100%" y2="60%">
              <stop offset="0%" stopColor="#FF5C7E" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
            <linearGradient id="compFoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D0D7F7" />
              <stop offset="100%" stopColor="#A5B4FC" />
            </linearGradient>
          </defs>

          {isSquircle && (
            <rect width="512" height="512" rx="108" fill="url(#compBrandBg)" />
          )}

          {/* Top Coral Swoosh */}
          <path
            d="M 266 35 C 315 42 365 88 393 162 C 352 110 305 76 266 82 Z"
            fill="url(#compCoralSwoosh)"
          />

          {/* Middle Gold Swoosh */}
          <path
            d="M 158 70 C 240 70 345 125 393 205 C 330 148 235 118 158 126 Z"
            fill="url(#compGoldSwoosh)"
          />

          {/* Google Docs Style Document Sheet (White Body) */}
          <path
            d="M 148 140 
               L 320 140 
               L 388 208 
               L 388 440 
               C 388 454 376 466 362 466 
               L 148 466 
               C 134 466 122 454 122 440 
               L 122 166 
               C 122 152 134 140 148 140 
               Z"
            fill="#FFFFFF"
          />

          {/* Folded Corner Flap */}
          <path
            d="M 320 140 L 320 188 C 320 199 329 208 340 208 L 388 208 Z"
            fill="url(#compFoldGrad)"
          />

          {/* 3 Horizontal Lines in Violet */}
          <rect x="166" y="246" width="180" height="22" rx="11" fill="#5447C8" />
          <rect x="166" y="296" width="180" height="22" rx="11" fill="#5447C8" />
          <rect x="166" y="346" width="120" height="22" rx="11" fill="#5447C8" />
        </svg>
      </div>

      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-ink-primary group-hover:text-brand transition-colors">
              Annale<span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">229</span>
            </span>
            {showBadge && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-[#5447C8] bg-indigo-50 border border-indigo-200 rounded-badge uppercase tracking-wider">
                MBH • EPAC
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium text-ink-muted hidden sm:block">
            Génie Biomédical & Hospitalier
          </span>
        </div>
      )}
    </div>
  );
}
export default Logo;
