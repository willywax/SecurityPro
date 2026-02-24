export const tokens = {
  color: {
    background: {
      canvas: '#f8fafc',
      surface: '#ffffff',
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
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    pill: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
    md: '0 4px 10px rgba(15, 23, 42, 0.08)',
    lg: '0 12px 24px rgba(15, 23, 42, 0.12)',
  },
  typography: {
    family: {
      sans: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
    size: {
      xs: ['0.75rem', '1rem'],
      sm: ['0.875rem', '1.25rem'],
      base: ['1rem', '1.5rem'],
      lg: ['1.125rem', '1.75rem'],
      xl: ['1.25rem', '1.75rem'],
      '2xl': ['1.5rem', '2rem'],
    },
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
} as const;

export type TokenSet = typeof tokens;
