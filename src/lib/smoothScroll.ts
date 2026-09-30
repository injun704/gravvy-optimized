import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

/**
 * Initializes Lenis smooth scrolling strictly for desktop mouse wheel and trackpad interactions.
 * - syncTouch: false — Disabled for all mobile/touch devices to rely entirely on native browser
 *   hardware momentum scrolling (-webkit-overflow-scrolling: touch) for a silky 60fps-120fps experience.
 * - Lenis remains active only for desktop/laptop wheel and trackpad gestures.
 */
export function initSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => {};

  if (lenisInstance) {
    try {
      lenisInstance.destroy();
    } catch {}
    lenisInstance = null;
  }

  // Detect pure mobile touch devices (phones/tablets without fine hover pointer)
  // Mobile devices rely entirely on native browser momentum scrolling for a butter-smooth 60fps+ experience.
  const isPureMobileTouch =
    window.matchMedia?.('(pointer: coarse) and (hover: none)')?.matches ||
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  if (isPureMobileTouch) {
    // Pure mobile: rely 100% on native hardware compositor momentum physics
    return () => {};
  }

  // Respect user preference for reduced motion
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (prefersReducedMotion) {
    return () => {};
  }

  try {
    lenisInstance = new Lenis({
      lerp: 0.16, // Snappy, low-latency response for desktop/laptop mouse wheels
      smoothWheel: true, // Enabled for desktop wheel and trackpad interaction
      syncTouch: false, // Disabled: mobile devices rely 100% on native momentum scrolling
      wheelMultiplier: 1.05, // Crisp, responsive wheel tracking
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      autoRaf: false,
    });

    let rafId: number;

    const raf = (time: number) => {
      lenisInstance?.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenisInstance?.destroy();
      lenisInstance = null;
    };
  } catch (err) {
    console.warn('Failed to initialize Lenis smooth scroll:', err);
    return () => {};
  }
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function scrollToPosition(targetY: number, immediate = false) {
  if (lenisInstance) {
    lenisInstance.scrollTo(targetY, { immediate });
  } else if (typeof window !== 'undefined') {
    window.scrollTo({
      top: targetY,
      behavior: immediate ? 'instant' : 'smooth',
    });
  }
}
