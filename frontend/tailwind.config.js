/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6B7A4A', // Olive Green
        secondary: '#C9971A', // Mustard Gold
        accent: '#FFFFFF',
        background: '#F9FAFB',
        surface: '#FFFFFF',
      }
    },
  },
  plugins: [],
}