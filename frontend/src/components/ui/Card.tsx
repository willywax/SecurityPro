import type { ReactNode } from 'react';

export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-token-lg border border-border-subtle bg-surface p-4 shadow-token-sm ${className}`}>{children}</div>;
}
