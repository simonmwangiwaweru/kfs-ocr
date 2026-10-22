/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Hover styles only compile inside @media (hover: hover), so touch devices never get a stuck hover.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        canvas: '#F8F8F5',
        ink: '#0F172A',
        // KEFRI forest green, from the original design brief (Deep Cypress -> Leaf Sage -> Mint).
        brand: {
          50: '#EEF5F0',
          100: '#DCEBE1',
          200: '#B9D6C4',
          300: '#8FBBA0',
          400: '#5F9A79',
          500: '#3E7B5C',
          600: '#2F6449',
          700: '#1F4D37',
          800: '#163D2B',
          900: '#0E2C1F'
        }
      },
      fontFamily: {
        // System fonts: ship optical sizing for free, and work offline in remote forest stations.
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
        mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 0 0 1px rgb(15 23 42 / 0.03)',
        pop: '0 12px 32px -8px rgb(15 23 42 / 0.28), 0 2px 6px rgb(15 23 42 / 0.08)'
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)'
      }
    }
  },
  plugins: []
};
