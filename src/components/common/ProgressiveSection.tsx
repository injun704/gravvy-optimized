import React from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface ProgressiveSectionProps {
  children: React.ReactNode | (() => React.ReactNode);
  className?: string;
  minHeight?: string | number;
  priority?: 'high' | 'normal' | 'low';
  rootMargin?: string;
  id?: string;
}

/**
 * Viewport-aware progressive rendering section for GRAVVY.
 * - Above-the-fold sections (priority="high") activate and render immediately.
 * - Below-the-fold product sections mount into the DOM ONLY when entering the viewport
 *   (rootMargin: '180px 0px'), drastically reducing initial DOM size and memory usage.
 * - Supports render functions (() => JSX) to defer JS execution and component instantiation.
 * - Employs CSS content-visibility containment for compositor-friendly rendering.
 */
export const ProgressiveSection: React.FC<ProgressiveSectionProps> = React.memo(
  ({
    children,
    className = '',
    minHeight = '320px',
    priority = 'normal',
    rootMargin = '180px 0px',
    id,
  }) => {
    const isHighPriority = priority === 'high';

    const [containerRef, isVisible] = useIntersectionObserver<HTMLDivElement>({
      rootMargin,
      freezeOnceVisible: true,
      enabled: !isHighPriority,
      initialVisible: isHighPriority,
    });

    const isActivated = isHighPriority || isVisible;

    return (
      <section
        id={id}
        ref={containerRef}
        className={className}
        style={{
          contentVisibility: isActivated ? 'visible' : 'auto',
          containIntrinsicSize: typeof minHeight === 'number' ? `0 ${minHeight}px` : `0 ${minHeight}`,
          minHeight: !isActivated ? minHeight : undefined,
        }}
      >
        {isActivated
          ? typeof children === 'function'
            ? children()
            : children
          : null}
      </section>
    );
  }
);
