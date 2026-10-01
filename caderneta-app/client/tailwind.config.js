/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cover: '#ff7200',
        ink: '#2b1d14',
        paper: '#ebe7e0',
        sprout: '#b9cf92',
        leaf: '#648c16'
      },
      fontFamily: {
        serif: ['"Roboto Slab"', 'serif'],
        sans: ['Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
