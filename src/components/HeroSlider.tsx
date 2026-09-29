import { useState, useEffect, useRef, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroSliderProps {
  slides: ReactNode[];
  labels?: string[];
  intervalMs?: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A full-width banner slider: slides sit side by side and the track slides
// horizontally. Every slide is stretched to the tallest one, so the page never
// jumps as it moves. Auto-advances, pauses on hover/focus/touch, and supports
// arrows, dots, and swipe. Slides that aren't showing are inert so keyboard
// and screen-reader users never land on hidden content.
export default function HeroSlider({ slides, labels, intervalMs = 8000 }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const goTo = (i: number) => setIndex(((i % count) + count) % count);

  useEffect(() => {
    if (paused || count < 2 || prefersReducedMotion()) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearTimeout(timer);
  }, [index, paused, count, intervalMs]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    setPaused(false);
    if (start === null) return;
    const delta = e.changedTouches[0].clientX - start;
    if (Math.abs(delta) > 50) goTo(index + (delta < 0 ? 1 : -1));
  };

  return (
    <section
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={labels?.[i] ?? `${i + 1} of ${count}`}
            className="w-full flex-shrink-0 flex flex-col"
            ref={(el) => {
              if (el) (el as HTMLElement & { inert?: boolean }).inert = i !== index;
            }}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-ink/60 text-cream hover:bg-ink/80 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-ink/60 text-cream hover:bg-ink/80 backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-ink/60 backdrop-blur-sm px-3 py-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-saffron-light' : 'w-2 bg-cream/50 hover:bg-cream/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
