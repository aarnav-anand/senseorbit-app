/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#f6f5f0',
          100: '#e9e6d9',
          200: '#d4cdb3',
          300: '#bdb088',
          400: '#a89666',
          500: '#968052',
          600: '#7a6643',
          700: '#5f5037',
          800: '#504430',
          900: '#453b2b',
          950: '#2b231a',
        },
        field: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
    },
  },
  plugins: [],
};
