import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface UseProgressiveListOptions {
  /**
   * Number of items to render initially. Default is 4.
   */
  initialCount?: number;
  /**
   * Number of items to append on each scroll trigger. Default is 4.
   */
  batchSize?: number;
  /**
   * Micro-delay in ms before rendering next batch to ensure smooth UI spinner transition. Default is 180ms.
   */
  batchDelayMs?: number;
}

export interface UseProgressiveListReturn<T> {
  visibleItems: T[];
  visibleCount: number;
  hasMore: boolean;
  isLoadingNextBatch: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  loadNextBatch: () => void;
  totalCount: number;
}

/**
 * useProgressiveList Hook
 * - Progressive / lazy loading for any list of products, orders, cards, or items.
 * - Initially renders only the first `initialCount` (default: 8) items.
 * - When user scrolls down and reaches sentinel, loads `batchSize` (default: 4) more items.
 * - Shows smooth loading indicator during batch append.
 * - Resets to initial batch automatically whenever the source dataset or filters change.
 */
export function useProgressiveList<T>(
  items: T[],
  options: UseProgressiveListOptions = {}
): UseProgressiveListReturn<T> {
  const { initialCount = 4, batchSize = 4, batchDelayMs = 180 } = options;

  const [visibleCount, setVisibleCount] = useState<number>(() =>
    Math.min(initialCount, items.length)
  );
  const [isLoadingNextBatch, setIsLoadingNextBatch] = useState<boolean>(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset to the first batch only when the list head changes (new filter/search/sort).
  // Same-head updates (wishlist toggle, live order updates) keep already-loaded items, so nothing jumps.
  const headRef = useRef<T | undefined>(items[0]);
  useEffect(() => {
    if (headRef.current === items[0]) return;
    headRef.current = items[0];
    setVisibleCount(Math.min(initialCount, items.length));
    setIsLoadingNextBatch(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, [items, initialCount]);

  // Clean up any pending batch timers
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  const hasMore = visibleCount < items.length;

  const loadNextBatch = useCallback(() => {
    if (isLoadingNextBatch || visibleCount >= items.length) return;

    setIsLoadingNextBatch(true);
    loadingTimerRef.current = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
      setIsLoadingNextBatch(false);
      loadingTimerRef.current = null;
    }, batchDelayMs);
  }, [isLoadingNextBatch, visibleCount, items.length, batchSize, batchDelayMs]);

  // IntersectionObserver on the sentinel: pre-triggers loading when sentinel is within 250px of viewport
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingNextBatch) {
          loadNextBatch();
        }
      },
      {
        rootMargin: '250px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingNextBatch, loadNextBatch]);

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  return {
    visibleItems,
    visibleCount,
    hasMore,
    isLoadingNextBatch,
    sentinelRef,
    loadNextBatch,
    totalCount: items.length,
  };
}
