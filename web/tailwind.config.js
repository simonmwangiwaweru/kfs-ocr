/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kfs: {
          emerald: '#059669',
          emeraldDark: '#064E3B',
          emeraldLight: '#ECFDF5',
          emeraldBorder: '#A7F3D0',
          slateCanvas: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          borderSubtle: '#EEF2F6',
          textPrimary: '#0F172A',
          textSecondary: '#475569',
          textMuted: '#94A3B8',
          amber: '#D97706',
          amberLight: '#FFFBEB',
          amberBorder: '#FDE68A',
          amberDark: '#92400E'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
