import type { ReactNode } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return <table className='w-full border-collapse text-sm'>{children}</table>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className='bg-surface-muted text-left text-text-secondary'>{children}</thead>;
}

export function TableHeaderCell({ children }: { children: ReactNode }) {
  return <th className='px-3 py-2 font-medium'>{children}</th>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className='divide-y divide-border-subtle'>{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className='text-text-primary'>{children}</tr>;
}

export function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
