import React from 'react';

export function EpreuveSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-subtle">
      <div className="flex items-start gap-4">
        {/* Avatar skeleton */}
        <div className="w-12 h-12 rounded-xl bg-slate-200/70 animate-shimmer flex-shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-slate-200/70 animate-shimmer" />
            <div className="h-5 w-20 rounded-full bg-slate-200/70 animate-shimmer" />
            <div className="h-5 w-16 rounded-full bg-slate-200/70 animate-shimmer" />
          </div>

          <div className="h-5 w-3/4 rounded-lg bg-slate-200/70 animate-shimmer" />
          <div className="h-3.5 w-1/2 rounded-md bg-slate-100 animate-shimmer" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex justify-between items-center">
        <div className="h-3.5 w-28 rounded bg-slate-200/60 animate-shimmer" />
        <div className="h-4 w-16 rounded bg-slate-200/60 animate-shimmer" />
      </div>
    </div>
  );
}

export function EpreuvesListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <EpreuveSkeleton key={index} />
      ))}
    </div>
  );
}
