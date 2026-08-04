/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf0ea',
          100: '#f9d4c1',
          200: '#f4b094',
          300: '#ee8a62',
          400: '#e86d3a',
          500: '#d4521a',
          600: '#b8431a',
          700: '#8f3214',
          800: '#67230e',
          900: '#3e1408',
        },
        ink:   '#1a1814',
        paper: '#f8f6f1',
        cream: '#f0ece3',
      },
      fontFamily: {
        sans:  ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}