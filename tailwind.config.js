/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
        'fade-in': 'fade-in .3s forwards',
        'fade-out': 'fade-out .3s forwards',
        'slide-up': 'slide-up .3s forwards',
        'slide-down': 'slide-down .3s forwards',
        'fade-in-slide-up': 'slide-up .3s forwards, fade-in .3s forwards',
        'fade-out-slide-down': 'slide-down .3s forwards, fade-out .3s forwards',
      },
    },
  },
  plugins: [],
};
