import type { SelectHTMLAttributes } from 'react';

export default function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-token-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary shadow-token-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
