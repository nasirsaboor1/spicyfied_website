/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#211C17',
          light: '#33291F',
        },
        saffron: {
          DEFAULT: '#B8860B',
          light: '#D4AF37',
          dark: '#8A6508',
        },
        paprika: {
          DEFAULT: '#A6421F',
          light: '#C1552B',
        },
        cream: {
          DEFAULT: '#FBF6EC',
          soft: '#F5EEE0',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: '0' },
          '10%': { opacity: 'var(--drift-opacity, 0.55)' },
          '90%': { opacity: 'var(--drift-opacity, 0.55)' },
          '100%': { transform: 'translate3d(var(--drift-x, 12px), var(--drift-y, -120px), 0) rotate(180deg)', opacity: '0' },
        },
      },
      animation: {
        drift: 'drift linear infinite',
      },
    },
  },
  plugins: [],
};
