/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'site-bg': '#F8F7F1',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'fade-out': {
          '0%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .2s forwards',
        'fade-out': 'fade-out .2s forwards',
        'slide-up': 'slide-up .2s forwards',
        'slide-down': 'slide-down .2s forwards',
        'fade-in-slide-up': 'slide-up .2s forwards, fade-in .2s forwards',
        'fade-out-slide-down': 'slide-down .2s forwards, fade-out .2s forwards',
      },
    },
  },
  plugins: [],
};
