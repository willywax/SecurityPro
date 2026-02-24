/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f8fafc',
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f1f5f9',
          inverse: '#0f172a',
        },
        border: {
          subtle: '#e2e8f0',
          strong: '#cbd5e1',
        },
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          inverse: '#f8fafc',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
        semantic: {
          success: { bg: '#ecfdf3', fg: '#027a48', border: '#abefc6' },
          warning: { bg: '#fffaeb', fg: '#b54708', border: '#fedf89' },
          danger: { bg: '#fef3f2', fg: '#b42318', border: '#fecdca' },
          info: { bg: '#eff8ff', fg: '#175cd3', border: '#b2ddff' },
          neutral: { bg: '#f8fafc', fg: '#475467', border: '#d0d5dd' },
        },
      },
      spacing: {
        18: '4.5rem',
      },
      borderRadius: {
        'token-sm': '0.375rem',
        'token-md': '0.5rem',
        'token-lg': '0.75rem',
        'token-xl': '1rem',
        'token-pill': '9999px',
      },
      boxShadow: {
        'token-sm': '0 1px 2px rgba(15, 23, 42, 0.06)',
        'token-md': '0 4px 10px rgba(15, 23, 42, 0.08)',
        'token-lg': '0 12px 24px rgba(15, 23, 42, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', '1rem'],
        sm: ['0.875rem', '1.25rem'],
        base: ['1rem', '1.5rem'],
        lg: ['1.125rem', '1.75rem'],
        xl: ['1.25rem', '1.75rem'],
        '2xl': ['1.5rem', '2rem'],
      },
    },
  },
  plugins: [],
};
