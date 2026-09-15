'use client';

import React from 'react';

interface TypeSegmentedControlProps {
  selectedType: string; // 'all' | 'devoir' | 'rattrapage'
  onChange: (type: string) => void;
}

export function TypeSegmentedControl({
  selectedType,
  onChange,
}: TypeSegmentedControlProps) {
  const options = [
    { value: 'all', label: 'Tous', countDot: null },
    { value: 'devoir', label: 'Devoirs', countDot: 'bg-blue-500' },
    { value: 'rattrapage', label: 'Rattrapages', countDot: 'bg-amber-500' },
  ];

  return (
    <div className="w-full bg-slate-100/90 dark:bg-[#161B22] p-1.5 rounded-2xl flex items-center border border-slate-200/70 dark:border-[#30363D] shadow-xs">
      {options.map((option) => {
        const isSelected = selectedType.toLowerCase() === option.value.toLowerCase();
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 text-center ${
              isSelected
                ? 'bg-white dark:bg-[#21262D] text-brand dark:text-emerald-400 shadow-sm shadow-slate-200/90 dark:shadow-none font-bold scale-[1.01]'
                : 'text-ink-secondary dark:text-slate-400 hover:text-ink-primary dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            {option.countDot && (
              <span className={`w-1.5 h-1.5 rounded-full ${option.countDot}`} />
            )}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
