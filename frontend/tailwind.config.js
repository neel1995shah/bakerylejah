/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#143129', // Dark Green
        secondary: '#F9F6F0', // Creamy White
        accent: '#F9F6F0',
        background: '#F9F6F0',
        surface: 'rgba(255, 255, 255, 0.7)',
      },
      boxShadow: {
        'antigravity': '0 20px 40px rgba(20, 49, 41, 0.1)',
        'antigravity-hover': '0 30px 60px rgba(20, 49, 41, 0.15)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}