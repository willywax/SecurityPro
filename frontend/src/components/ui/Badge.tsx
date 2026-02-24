import type { ReactNode } from 'react';

const variants = {
  success: 'bg-semantic-success-bg text-semantic-success-fg border-semantic-success-border',
  warning: 'bg-semantic-warning-bg text-semantic-warning-fg border-semantic-warning-border',
  danger: 'bg-semantic-danger-bg text-semantic-danger-fg border-semantic-danger-border',
  info: 'bg-semantic-info-bg text-semantic-info-fg border-semantic-info-border',
  neutral: 'bg-semantic-neutral-bg text-semantic-neutral-fg border-semantic-neutral-border',
} as const;

export type BadgeVariant = keyof typeof variants;

export default function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: BadgeVariant }) {
  return <span className={`inline-flex items-center rounded-token-pill border px-2 py-0.5 text-xs font-medium ${variants[variant]}`}>{children}</span>;
}
