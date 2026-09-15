'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher une matière, un titre d\'épreuve...',
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [, startTransition] = useTransition();

  // Synchronisation avec valeur parent
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        startTransition(() => {
          onChange(localValue);
        });
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="relative w-full group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
        <Search className="w-5 h-5" />
      </div>

      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-20 py-3.5 bg-white dark:bg-[#161B22] border border-slate-200/90 dark:border-[#30363D] rounded-2xl text-sm font-medium text-ink-primary dark:text-[#F0F6FC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/20 dark:focus:ring-emerald-500/20 focus:border-brand dark:focus:border-emerald-500 shadow-subtle hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-150"
      />

      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5">
        {localValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg text-slate-400 hover:text-ink-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Effacer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-md select-none">
            Ctrl K
          </span>
        )}
      </div>
    </div>
  );
}
