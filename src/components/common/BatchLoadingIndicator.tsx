import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface BatchLoadingIndicatorProps {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  isLoading: boolean;
  remainingCount?: number;
  onManualTrigger?: () => void;
}

export const BatchLoadingIndicator: React.FC<BatchLoadingIndicatorProps> = React.memo(({
  sentinelRef,
  hasMore,
  isLoading,
  remainingCount,
  onManualTrigger,
}) => {
  const { theme, categoryAccent } = useTheme();

  if (!hasMore) {
    return null;
  }

  return (
    <div
      ref={sentinelRef}
      className="w-full py-6 flex flex-col items-center justify-center gap-2 select-none"
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-xs transition-all ${
          theme === 'LIGHT'
            ? 'bg-white/80 border-stone-200 text-stone-700'
            : 'bg-stone-900/80 border-white/10 text-stone-300'
        }`}
      >
        <Loader2 className={`w-4 h-4 animate-spin ${categoryAccent.textClass || 'text-amber-500'}`} />
        <span className="text-xs font-semibold tracking-wide">
          {isLoading ? 'Loading more items...' : `Scroll for more ${remainingCount ? `(${remainingCount} remaining)` : ''}`}
        </span>
      </div>

      {/* Fallback button if user taps */}
      {onManualTrigger && !isLoading && (
        <button
          type="button"
          onClick={onManualTrigger}
          className="text-[11px] text-stone-400 hover:text-stone-300 underline cursor-pointer mt-1"
        >
          Or tap to load 4 more
        </button>
      )}
    </div>
  );
});

BatchLoadingIndicator.displayName = 'BatchLoadingIndicator';
