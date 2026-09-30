import { useState, useEffect, useRef } from 'react';

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
  enabled?: boolean;
  initialVisible?: boolean;
}

/**
 * Custom hook to detect when an element enters the viewport using IntersectionObserver.
 * Allows conditionally rendering heavy elements (such as product images) only when they
 * approach or enter the visible screen.
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.01,
  root = null,
  rootMargin = '200px 0px',
  freezeOnceVisible = true,
  enabled = true,
  initialVisible = false,
}: UseIntersectionObserverOptions = {}): [React.RefObject<T | null>, boolean, IntersectionObserverEntry | null] {
  const ref = useRef<T | null>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState<boolean>(initialVisible);

  const isFrozen = freezeOnceVisible && isIntersecting;

  useEffect(() => {
    if (!enabled) {
      setIsIntersecting(true);
      return;
    }

    const node = ref.current;
    const hasIOSupport = typeof window !== 'undefined' && 'IntersectionObserver' in window;

    // Fallback if browser doesn't support IntersectionObserver
    if (!hasIOSupport) {
      setIsIntersecting(true);
      return;
    }

    if (isFrozen || !node) return;

    const observer = new IntersectionObserver(([firstEntry]) => {
      setEntry(firstEntry);
      const isVisible = firstEntry.isIntersecting || firstEntry.intersectionRatio > 0;
      setIsIntersecting(isVisible);

      if (isVisible && freezeOnceVisible) {
        observer.unobserve(node);
      }
    }, {
      threshold,
      root,
      rootMargin,
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, isFrozen, freezeOnceVisible, enabled]);

  return [ref, isIntersecting, entry];
}

/**
 * Custom hook specifically tailored for conditionally loading and decoding product images.
 */
export function useLazyImage<T extends HTMLElement = HTMLDivElement>({
  rootMargin = '250px 0px',
  enabled = true,
}: {
  rootMargin?: string;
  enabled?: boolean;
} = {}) {
  const [ref, isVisible] = useIntersectionObserver<T>({
    rootMargin,
    freezeOnceVisible: true,
    enabled,
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return {
    ref,
    isVisible,
    isLoaded,
    hasError,
    handleLoad,
    handleError,
  };
}
