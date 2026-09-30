import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Tag } from 'lucide-react';
import { PromotionSlide } from '../../types';

interface HomeCarouselProps {
  slides: PromotionSlide[];
  onSlideClick?: (slide: PromotionSlide) => void;
  autoplayIntervalMs?: number;
  carouselTitle?: string;
}

const HomeCarouselComponent: React.FC<HomeCarouselProps> = ({
  slides,
  onSlideClick,
  autoplayIntervalMs = 4000,
  carouselTitle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const hasDecidedDirection = useRef(false);
  const isLockedHorizontal = useRef(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80';

  // Continuous autoplay timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (isPaused || isDragging || !slides || slides.length === 0 || document.hidden) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoplayIntervalMs);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isPaused, isDragging, slides, autoplayIntervalMs]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  // Touch & Pointer Gesture Handlers: only capture pointer on confirmed horizontal swipe to prevent blocking vertical page scrolling
  const onPointerDown = (e: React.PointerEvent) => {
    // Only handle primary button / single touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    hasDecidedDirection.current = false;
    isLockedHorizontal.current = false;
    setDragOffset(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // If we haven't decided direction yet, wait until movement exceeds threshold
    if (!hasDecidedDirection.current) {
      const dx = Math.abs(e.clientX - dragStartX.current);
      const dy = Math.abs(e.clientY - dragStartY.current);

      if (dx < 6 && dy < 6) return;

      hasDecidedDirection.current = true;
      if (dx > dy && dx >= 6) {
        // Horizontal swipe confirmed - lock to carousel and capture pointer
        isLockedHorizontal.current = true;
        setIsDragging(true);
        setIsPaused(true);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
      } else {
        // Vertical movement detected - let native page scroll happen without resistance
        isLockedHorizontal.current = false;
        return;
      }
    }

    if (!isLockedHorizontal.current || !isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    
    // Resistance at bounds
    if ((currentIndex === 0 && deltaX > 0) || (currentIndex === slides.length - 1 && deltaX < 0)) {
      setDragOffset(deltaX * 0.35);
    } else {
      setDragOffset(deltaX);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasDragging = isDragging && isLockedHorizontal.current;
    setIsDragging(false);
    setIsPaused(false);
    hasDecidedDirection.current = false;
    isLockedHorizontal.current = false;

    if (!wasDragging) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const containerWidth = containerRef.current?.offsetWidth || 300;
    const threshold = Math.min(containerWidth * 0.18, 80);

    if (dragOffset < -threshold && currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (dragOffset > threshold && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else if (dragOffset < -threshold && currentIndex === slides.length - 1) {
      // Loop to start
      setCurrentIndex(0);
    } else if (dragOffset > threshold && currentIndex === 0) {
      // Loop to end
      setCurrentIndex(slides.length - 1);
    }

    setDragOffset(0);
  };

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];
  const accentColor = currentSlide.accentColor || '#FFB800';

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl group shadow-xl border border-white/10 select-none touch-pan-y"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label={carouselTitle || 'Promotions Carousel'}
    >
      {/* Flipkart-Style Full-Width Continuous Horizontal Track */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-[220px] xs:h-[240px] sm:h-64 md:h-80 w-full overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <div
          className={`flex h-full w-full ${
            isDragging ? 'transition-none' : 'transition-transform duration-500 ease-out'
          }`}
          style={{
            transform: `translate3d(calc(-${currentIndex * 100}% + ${dragOffset}px), 0, 0)`,
          }}
        >
          {slides.map((slide, idx) => {
            const slideAccent = slide.accentColor || '#FFB800';
            return (
              <div
                key={slide.id || idx}
                onClick={() => {
                  if (Math.abs(dragOffset) < 10 && onSlideClick) {
                    onSlideClick(slide);
                  }
                }}
                className="relative flex-shrink-0 w-full h-full overflow-hidden"
              >
                {/* Background Image: only rendered for active and immediate adjacent slides to minimize active GPU memory */}
                {(() => {
                  const isNearActive =
                    idx === currentIndex ||
                    idx === (currentIndex + 1) % slides.length ||
                    idx === (currentIndex - 1 + slides.length) % slides.length;
                  if (!isNearActive) return null;
                  return (
                    <img
                      src={failedImages[slide.id] ? FALLBACK_IMAGE : slide.imageUrl}
                      alt={slide.title}
                      loading={idx === currentIndex ? 'eager' : 'lazy'}
                      decoding="async"
                      onError={() => {
                        setFailedImages((prev) => ({ ...prev, [slide.id]: true }));
                      }}
                      className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  );
                })()}

                {/* Scrims */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/25 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />

                {/* Slide Content */}
                <div className="absolute inset-0 p-3 xs:p-4 sm:p-6 md:p-8 pr-10 xs:pr-12 sm:pr-14 md:pr-16 pb-7 xs:pb-8 sm:pb-8 flex flex-col justify-between max-w-full sm:max-w-xl z-10 overflow-hidden pointer-events-none">
                  <div>
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <span
                        style={{ backgroundColor: slideAccent }}
                        className="text-[9px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full text-stone-950 flex items-center gap-1 shadow-md"
                      >
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {slide.badge}
                      </span>
                      {slide.code && (
                        <span className="text-[9px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/20 flex items-center gap-1 shadow-xs">
                          <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/90" /> CODE: {slide.code}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-sm xs:text-base sm:text-2xl md:text-3xl lg:text-4xl font-black font-display text-white tracking-tight leading-tight sm:leading-snug drop-shadow-md line-clamp-2">
                      {slide.title}
                    </h2>

                    {/* Subtitle */}
                    <p className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm text-stone-200 mt-0.5 sm:mt-1.5 line-clamp-2 max-w-xs sm:max-w-md drop-shadow-xs font-medium leading-tight sm:leading-relaxed">
                      {slide.subtitle}
                    </p>
                  </div>

                  {/* CTA Row */}
                  <div className="flex items-center gap-2 sm:gap-4 mt-auto pt-1 sm:pt-2 w-full max-w-full overflow-hidden pointer-events-auto">
                    {slide.discount && (
                      <span
                        style={{ color: slideAccent }}
                        className="text-xs xs:text-sm sm:text-xl md:text-2xl font-black font-mono tracking-tight drop-shadow-md shrink-0 whitespace-nowrap"
                      >
                        {slide.discount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSlideClick) onSlideClick(slide);
                      }}
                      style={{ backgroundColor: slideAccent }}
                      className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 xs:px-3 sm:px-4 md:px-5 py-1.5 sm:py-2.5 rounded-xl text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-bold text-stone-950 hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer max-w-[190px] xs:max-w-[220px] sm:max-w-xs shrink"
                      title={slide.ctaText}
                    >
                      <span className="text-center font-bold uppercase tracking-tight line-clamp-2 break-words leading-tight">
                        {slide.ctaText}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nav Arrows */}
      <button
        type="button"
        onClick={handlePrev}
        className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 active:scale-90 transition-all opacity-80 group-hover:opacity-100 z-20 backdrop-blur-md border border-white/10 shadow-lg cursor-pointer"
        title="Previous slide"
        aria-label="Previous promotional slide"
      >
        <ChevronLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 active:scale-90 transition-all opacity-80 group-hover:opacity-100 z-20 backdrop-blur-md border border-white/10 shadow-lg cursor-pointer"
        title="Next slide"
        aria-label="Next promotional slide"
      >
        <ChevronRight className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2.5 left-0 right-0 flex justify-center items-center gap-1.5 z-20 pointer-events-auto">
        {slides.map((slide, idx) => (
          <button
            key={slide.id || idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(idx);
            }}
            style={{
              backgroundColor: currentIndex === idx ? accentColor : undefined,
            }}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              currentIndex === idx
                ? 'w-6 sm:w-7 h-2 shadow-md'
                : 'w-2 h-2 bg-white/40 hover:bg-white/70'
            }`}
            title={`Slide ${idx + 1}: ${slide.title}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export const HomeCarousel = React.memo(HomeCarouselComponent);
