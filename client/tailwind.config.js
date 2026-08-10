/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: 'var(--color-accent)',
        dark: 'var(--bg-primary)',
        light: 'var(--text-primary)',
        card: 'var(--bg-card)',
        accent: 'var(--color-success)',
        alert: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#10B981',
          500: '#10B981',
          600: '#10B981',
          700: '#0E9F6E',
          800: '#065F46',
          900: '#064E3B',
          DEFAULT: '#10B981',
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#10B981',
          500: '#10B981',
          600: '#10B981',
          700: '#0E9F6E',
          800: '#166534',
          900: '#14532D',
          DEFAULT: '#10B981',
        },
        surface: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          divider: 'var(--bg-divider)',
          hover: 'var(--bg-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
        },
      },
      borderRadius: {
        input: '12px',
      },
      transitionDuration: {
        theme: '300ms',
      },
    },
  },
  plugins: [],
}
