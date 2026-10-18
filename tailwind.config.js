/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tpa: {
          lime: '#84cc16',      // TPA Signature Lime Green
          limeHover: '#65a30d',
          navy: '#0f172a',      // TPA Dark Slate Navy
          cardBg: '#1e293b',
          orange: '#f97316',    // Role Badge Orange
          red: '#dc2626',       // Used Purse Red
          grey: '#374151',
          bgLight: '#f8f9fa'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Bebas Neue', 'Oswald', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
