import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { SCROLL_SPICE_PHOTOS } from '../lib/spicePhotos';

/**
 * A full-bleed, documentary-style scroll sequence - one real macro photo
 * of the actual product filling the screen at a time, slowly settling
 * into frame as it scrolls through view (a subtle Ken Burns zoom + parallax
 * drift), rather than small cards bouncing in. No stock or invented
 * imagery: every frame here is our own catalog photography.
 */

interface Spice {
  name: string;
  slug: string;
  photo: string;
  caption: string;
}

const SPICES: Spice[] = [
  {
    name: 'Cardamom',
    slug: 'cardamom',
    photo: SCROLL_SPICE_PHOTOS.cardamom,
    caption: 'Hand-sorted pods, plump enough to snap between two fingers.',
  },
  {
    name: 'Cinnamon',
    slug: 'cinnamon',
    photo: SCROLL_SPICE_PHOTOS.cinnamon,
    caption: 'True Ceylon quills, thin bark rolled by hand into paper-fine layers.',
  },
  {
    name: 'Clove',
    slug: 'clove',
    photo: SCROLL_SPICE_PHOTOS.clove,
    caption: 'Sun-dried buds, still dark and oily at the stem.',
  },
  {
    name: 'Star Anise',
    slug: 'star-anise',
    photo: SCROLL_SPICE_PHOTOS.starAnise,
    caption: 'Whole eight-point pods, glossy seeds still sealed inside.',
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

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.18, 1, 1.08]);
  const imageY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);

  return (
    <div ref={ref} className="relative h-screen w-full overflow-hidden flex items-end">
      <motion.img
        src={spice.photo}
        alt={spice.name}
        style={{ scale, y: imageY }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />

      <motion.div
        className="relative z-10 w-full px-6 sm:px-10 lg:px-16 pb-16 sm:pb-20"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="max-w-[1600px] mx-auto">
          <p className="text-saffron-light text-xs font-semibold tracking-[0.3em] uppercase mb-3">
            {String(index + 1).padStart(2, '0')} &middot; The real thing
          </p>
          <h3 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold text-cream mb-4">
            {spice.name}
          </h3>
          <p className="text-cream/75 text-lg max-w-md mb-7 leading-relaxed">
            {spice.caption}
          </p>
          <button
            onClick={() => onNavigateToProduct(spice.slug)}
            className="inline-flex items-center gap-2 bg-saffron-light text-ink px-6 py-3 font-semibold text-sm hover:bg-saffron transition-colors"
          >
            Shop the real thing
          </button>
        </div>
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
