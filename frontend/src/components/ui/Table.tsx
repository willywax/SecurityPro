import type { ReactNode } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return <table className='w-full border-collapse text-sm'>{children}</table>;
}

export function TableHead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <thead className={`bg-surface-muted text-left text-text-secondary ${className}`}>{children}</thead>;
}

export function TableHeaderCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className='divide-y divide-border-subtle'>{children}</tbody>;
}

export function TableRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tr className={`text-text-primary ${className}`}>{children}</tr>;
}

export function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
