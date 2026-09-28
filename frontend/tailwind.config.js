const path = require('path')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, './index.html'),
    path.join(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        acento: {
          50:  '#faf7ef',
          100: '#f2ead8',
          200: '#e8d9b0',
          300: '#ddc888',
          400: '#c9b97a',
          500: '#b8a862',
          600: '#a08740',
          700: '#856e30',
          800: '#6a5825',
          900: '#50431c',
        },
      },
      boxShadow: {
        tarjeta: '0 1px 4px 0 rgb(60 45 20 / 0.07), 0 1px 2px -1px rgb(60 45 20 / 0.05)',
        elevada: '0 4px 8px -1px rgb(60 45 20 / 0.08), 0 2px 4px -2px rgb(60 45 20 / 0.06)',
      },
    },
  },
  plugins: [],
}
