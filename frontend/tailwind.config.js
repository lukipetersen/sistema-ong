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
          50:  '#f1faf0',
          100: '#daf3d5',
          200: '#b4e8ac',
          300: '#82d678',
          400: '#54be48',
          500: '#3d9138',
          600: '#317a2c',
          700: '#276124',
          800: '#1d4b1b',
          900: '#163914',
        },
      },
      boxShadow: {
        tarjeta: '0 1px 4px 0 rgb(20 50 20 / 0.07), 0 1px 2px -1px rgb(20 50 20 / 0.05)',
        elevada: '0 4px 8px -1px rgb(20 50 20 / 0.08), 0 2px 4px -2px rgb(20 50 20 / 0.06)',
      },
    },
  },
  plugins: [],
}
