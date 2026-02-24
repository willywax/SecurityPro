import type { ReactNode } from 'react';

export default function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'>
      <div className='w-full max-w-lg rounded-token-lg border border-border-subtle bg-surface p-4 shadow-token-lg'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-text-primary'>{title}</h2>
          <button onClick={onClose} className='text-text-secondary'>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
