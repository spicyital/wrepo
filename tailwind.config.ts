import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f7f7f6',
          100: '#ededea',
          200: '#d9d9d4',
          300: '#b8b8b0',
          400: '#8e8e84',
          500: '#6b6b62',
          600: '#55554d',
          700: '#45453f',
          800: '#2f2f2b',
          900: '#1c1c19',
        },
        accent: {
          50: '#f3f5fb',
          100: '#e3e8f4',
          200: '#c1cde6',
          300: '#92a6d1',
          400: '#6179b6',
          500: '#3e569a',
          600: '#2f4280',
          700: '#263568',
          800: '#1e2a52',
          900: '#171f3d',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '70ch',
          },
        },
      },
      maxWidth: {
        prose: '70ch',
      },
      borderRadius: {
        xl: '0.85rem',
      },
    },
  },
  plugins: [],
}

export default config
