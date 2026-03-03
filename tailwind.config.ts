import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        light: {
          bg: '#F7F8FC',
          panel: '#FFFFFF',
          border: '#EAEBEE',
          text: '#122056',
          'text-subtle': '#8A94A6',
          accent: '#5B65DC',
          'accent-pink': '#FEE7E6',
          'accent-pink-text': '#D64D65',
          'accent-yellow': '#FBBF24',
          'accent-yellow-light': 'rgba(251, 191, 36, 0.1)',
          success: '#34C759',
          'success-light': 'rgba(52, 199, 89, 0.1)',
          'grid-lines': '#EAEBEE',
        },
        med: {
          text: '#122056',
          accent: '#5B65DC',
          secondary: '#EEEFFD',
          bg: '#FAFAFD',
          white: '#FFFFFF',
          danger: '#FF3B30',
          success: '#34C759'
        },
        workflow: {
          call: '#5B65DC',
          admit: '#A78BFA',
          anesthesia: '#2DD4BF',
          procedure: '#D64D65',
          end: '#FBBF24',
          wakeup: '#818CF8',
          clean: '#F59E0B',
          ready: '#34C759',
        }
      },
      boxShadow: {
        sterile: '0 2px 12px -2px rgba(18, 32, 86, 0.05), 0 1px 4px -1px rgba(18, 32, 86, 0.02)',
        'sterile-hover': '0 20px 40px -10px rgba(18, 32, 86, 0.08), 0 8px 12px -6px rgba(18, 32, 86, 0.04)',
        soft: '0px 10px 30px -5px rgba(18, 32, 86, 0.07), 0px 5px 15px -5px rgba(18, 32, 86, 0.04)',
        'soft-accent': '0px 10px 30px -5px rgba(91, 101, 220, 0.15)',
      },
      keyframes: {
        'subtle-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.95', transform: 'scale(0.99)' },
        },
        'grid-pan': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '20px 20px' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.7', transform: 'scale(0.9)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        'matrix-scroll': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 -100px' },
        }
      },
      animation: {
        'subtle-pulse': 'subtle-pulse 3s ease-in-out infinite',
        'grid-pan': 'grid-pan 2s linear infinite',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'matrix-scroll': 'matrix-scroll 3s linear infinite',
      }
    },
  },
  plugins: [],
} satisfies Config
