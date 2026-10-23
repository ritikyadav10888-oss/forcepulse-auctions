/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // "Stadium Night" identity: the app's slate/lime classes resolve to ink-navy neutrals and auction gold,
      // so every screen picks up the same palette
      colors: {
        slate: {
          50: '#F5F6FA', 100: '#ECEEF5', 200: '#DADEEA', 300: '#B9BFD3', 400: '#8A92AD', 500: '#626A87',
          600: '#474E69', 700: '#333950', 800: '#20253A', 900: '#141828', 950: '#0A0D19'
        },
        lime: {
          50: '#FFF9E6', 100: '#FFF0BF', 200: '#FFE38A', 300: '#FFD34D', 400: '#FFC21A', 500: '#FFB000',
          600: '#E09400', 700: '#A86C00', 800: '#7F5200', 900: '#5E3D00', 950: '#3D2500'
        },
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
        sans: ['Manrope', 'sans-serif'],
        display: ['Barlow Condensed', 'Oswald', 'sans-serif'],
      },
      // Tighter corners than Tailwind's defaults: sharper, more athletic cards
      borderRadius: {
        '2xl': '0.875rem',
        '3xl': '1.125rem'
      }
    },
  },
  plugins: [],
}
