import type { InputHTMLAttributes } from 'react';

export default function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-token-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary shadow-token-sm placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${className}`}
      {...props}
    />
  );
}
