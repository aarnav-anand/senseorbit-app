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
        },
        field: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
    },
  },
  plugins: [],
};
