/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        'surface': '#f8faf9',
        'surface-dim': '#d8dad9',
        'surface-bright': '#f8faf9',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f3',
        'surface-container': '#eceeed',
        'surface-container-high': '#e6e9e8',
        'surface-container-highest': '#e1e3e2',
        'on-surface': '#191c1c',
        'on-surface-variant': '#3f4941',
        'inverse-surface': '#2e3131',
        'inverse-on-surface': '#eff1f0',
        'outline': '#6f7a71',
        'outline-variant': '#bec9bf',
        'surface-tint': '#066c41',
        'primary': '#006038',
        'on-primary': '#ffffff',
        'primary-container': '#1f7a4d',
        'on-primary-container': '#aeffca',
        'inverse-primary': '#82d8a3',
        'secondary': '#3d6751',
        'on-secondary': '#ffffff',
        'secondary-container': '#bceacf',
        'on-secondary-container': '#416b55',
        'tertiary': '#804300',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#a45800',
        'on-tertiary-container': '#ffe9db',
        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        'primary-fixed': '#9ef5be',
        'primary-fixed-dim': '#82d8a3',
        'secondary-fixed': '#bfedd2',
        'secondary-fixed-dim': '#a3d1b6',
        'tertiary-fixed': '#ffdcc3',
        'tertiary-fixed-dim': '#ffb77d',
        'background': '#f8faf9',
        'on-background': '#191c1c'
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'Nunito', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        headline: ['"Nunito Sans"', 'Nunito', 'sans-serif'],
        matrix: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        tactile: '0 6px 18px -8px rgba(19, 62, 43, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        sheet: '0 -12px 36px -4px rgba(19, 62, 43, 0.25), 0 -2px 10px rgba(0, 0, 0, 0.04)'
      }
    }
  },
  plugins: []
};
