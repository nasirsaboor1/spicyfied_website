/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B2A1C',
          light: '#2A3F29',
        },
        saffron: {
          DEFAULT: '#B85C2E',
          light: '#D97F52',
          dark: '#8A3D1D',
        },
        ochre: {
          DEFAULT: '#C9A227',
          light: '#DDBE5C',
        },
        moss: {
          DEFAULT: '#5B7052',
          light: '#7C9470',
        },
        cream: {
          DEFAULT: '#FBF6EC',
          soft: '#F2EEDF',
        },
      },
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: '0' },
          '10%': { opacity: 'var(--drift-opacity, 0.55)' },
          '90%': { opacity: 'var(--drift-opacity, 0.55)' },
          '100%': { transform: 'translate3d(var(--drift-x, 12px), var(--drift-y, -120px), 0) rotate(180deg)', opacity: '0' },
        },
        'spice-float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(var(--rot-a, -6deg))' },
          '50%': { transform: 'translateY(-18px) rotate(var(--rot-b, 5deg))' },
        },
      },
      animation: {
        drift: 'drift linear infinite',
        'spice-float': 'spice-float ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
