import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import { SCROLL_SPICE_PHOTOS } from '../lib/spicePhotos';

/**
 * A deliberate, focused scroll-triggered reveal - one real spice photo
 * at a time, each popping into place with a spring bounce as it enters
 * the viewport. Adapted from Motion's "Scroll Triggered Cards" pattern,
 * with real product photography standing in for the emoji and a
 * splash colour drawn from the actual spice rather than a rainbow.
 *
 * Deliberately NOT ambient/background motion (that was the previous,
 * failed attempt - tiny drifting photo clutter). This is one moment at
 * a time, large, and it stops once you've scrolled past it.
 */

interface SpiceCard {
  name: string;
  slug: string;
  photo: string;
  splash: string; // CSS background for the shape behind the card
}

const SPICES: SpiceCard[] = [
  {
    name: 'Cardamom',
    slug: 'cardamom',
    photo: SCROLL_SPICE_PHOTOS.cardamom,
    splash: 'linear-gradient(315deg, #5F7B48, #A3B78A)',
  },
  {
    name: 'Cinnamon',
    slug: 'cinnamon',
    photo: SCROLL_SPICE_PHOTOS.cinnamon,
    splash: 'linear-gradient(315deg, #6F4520, #B85C2E)',
  },
  {
    name: 'Clove',
    slug: 'clove',
    photo: SCROLL_SPICE_PHOTOS.clove,
    splash: 'linear-gradient(315deg, #3E2410, #6F3A19)',
  },
  {
    name: 'Star Anise',
    slug: 'star-anise',
    photo: SCROLL_SPICE_PHOTOS.starAnise,
    splash: 'linear-gradient(315deg, #4A2612, #8A5A2E)',
  },
];

const cardVariants: Variants = {
  offscreen: { y: 220, opacity: 0, rotate: 0 },
  onscreen: {
    y: 0,
    opacity: 1,
    rotate: -6,
    transition: { type: 'spring', bounce: 0.4, duration: 0.9 },
  },
};

const splashPath =
  'path("M 0 303.5 C 0 292.454 8.995 285.101 20 283.5 L 460 219.5 C 470.085 218.033 480 228.454 480 239.5 L 500 430 C 500 441.046 491.046 450 480 450 L 20 450 C 8.954 450 0 441.046 0 430 Z")';

interface SpiceRevealProps {
  onNavigateToProduct: (slug: string) => void;
}

export default function SpiceReveal({ onNavigateToProduct }: SpiceRevealProps) {
  return (
    <div className="mx-auto max-w-md w-full py-6">
      {SPICES.map((spice, i) => (
        <motion.div
          key={spice.slug}
          className="relative flex justify-center items-center overflow-visible"
          style={{ paddingTop: 20, marginBottom: i === SPICES.length - 1 ? 0 : -110 }}
          initial="offscreen"
          whileInView="onscreen"
          viewport={{ amount: 0.8, once: true }}
        >
          <div
            className="absolute inset-0"
            style={{ background: spice.splash, clipPath: splashPath }}
          />
          <motion.button
            variants={cardVariants}
            onClick={() => onNavigateToProduct(spice.slug)}
            className="relative w-[280px] h-[380px] rounded-[20px] bg-white shadow-2xl shadow-black/30 overflow-hidden group text-left"
            style={{ transformOrigin: '10% 60%' }}
          >
            <img
              src={spice.photo}
              alt={spice.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-5 pt-12">
              <p className="font-serif text-2xl font-semibold text-cream">{spice.name}</p>
              <p className="text-xs text-cream/70 uppercase tracking-widest mt-1">
                Shop the real thing →
              </p>
            </div>
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
}
