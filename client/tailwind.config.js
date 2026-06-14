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
