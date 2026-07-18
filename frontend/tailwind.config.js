/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        neutral: {
          50: '#fafaf8',
          100: '#f5f3f0',
          200: '#ede8df',
          300: '#e0d9ce',
          400: '#d0c5b4',
          500: '#b8a893',
          600: '#9a8b75',
          700: '#7a6c5a',
          800: '#5a4f44',
          900: '#3d3632',
        },
      },
    },
  },
  plugins: [],
};
