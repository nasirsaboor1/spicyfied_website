import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { SPICE_HERO_PHOTOS } from '../lib/spiceHeroPhotos';

/**
 * A slow-paced, one-spice-at-a-time scroll sequence: a single real piece
 * (owner-supplied studio cutouts, trimmed to their real bounding box)
 * spotlighted against a dark ground, drifting gently as the page scrolls
 * past it. Not a full pile, not a card stack - one object, lit and let
 * to breathe.
 */

interface Spice {
  name: string;
  slug: string;
  photo: string;
  caption: string;
  glow: string;
}

const SPICES: Spice[] = [
  {
    name: 'Cardamom',
    slug: 'cardamom',
    photo: SPICE_HERO_PHOTOS.cardamom,
    caption: 'Hand-sorted pods, plump enough to snap between two fingers.',
    glow: 'radial-gradient(circle, rgba(163,183,138,0.35), transparent 70%)',
  },
  {
    name: 'Cinnamon',
    slug: 'cinnamon',
    photo: SPICE_HERO_PHOTOS.cinnamon,
    caption: 'True Ceylon quills, thin bark rolled by hand into paper-fine layers.',
    glow: 'radial-gradient(circle, rgba(184,92,46,0.32), transparent 70%)',
  },
  {
    name: 'Clove',
    slug: 'clove',
    photo: SPICE_HERO_PHOTOS.clove,
    caption: 'Sun-dried buds, still dark and oily at the stem.',
    glow: 'radial-gradient(circle, rgba(139,90,43,0.3), transparent 70%)',
  },
];

interface SpicePanelProps {
  spice: Spice;
  index: number;
  onNavigateToProduct: (slug: string) => void;
}

function SpicePanel({ spice, index, onNavigateToProduct }: SpicePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);
  const glowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.1, 0.9]);

  return (
    <div
      ref={ref}
      className="relative h-screen w-full overflow-hidden flex flex-col items-center justify-center bg-ink"
    >
      <motion.div
        className="absolute w-[70vmin] h-[70vmin] rounded-full blur-3xl"
        style={{ background: spice.glow, scale: glowScale }}
      />

      <motion.img
        src={spice.photo}
        alt={spice.name}
        style={{ y: imageY }}
        initial={{ opacity: 0, scale: 0.88 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="relative z-10 max-h-[46vh] md:max-h-[54vh] max-w-[80vw] w-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]"
      />

      <motion.div
        className="relative z-10 mt-10 text-center px-6"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
      >
        <p className="text-saffron-light text-xs font-semibold tracking-[0.3em] uppercase mb-3">
          {String(index + 1).padStart(2, '0')} &middot; The real thing
        </p>
        <h3 className="font-serif text-4xl md:text-5xl font-semibold text-cream mb-4">
          {spice.name}
        </h3>
        <p className="text-cream/70 text-base md:text-lg max-w-md mx-auto mb-7 leading-relaxed">
          {spice.caption}
        </p>
        <button
          onClick={() => onNavigateToProduct(spice.slug)}
          className="inline-flex items-center gap-2 bg-saffron-light text-ink px-6 py-3 font-semibold text-sm hover:bg-saffron transition-colors"
        >
          Shop the real thing
        </button>
      </motion.div>
    </div>
  );
}

interface SpiceRevealProps {
  onNavigateToProduct: (slug: string) => void;
}

export default function SpiceReveal({ onNavigateToProduct }: SpiceRevealProps) {
  return (
    <div className="relative w-full">
      {SPICES.map((spice, i) => (
        <SpicePanel key={spice.slug} spice={spice} index={i} onNavigateToProduct={onNavigateToProduct} />
      ))}
    </div>
  );
}
