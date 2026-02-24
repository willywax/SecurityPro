import type { ReactNode } from 'react';

export default function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-40 bg-slate-900/40'>
      <div className='absolute right-0 top-0 h-full w-full max-w-md border-l border-border-subtle bg-surface p-4 shadow-token-lg'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>{title}</h2>
          <button onClick={onClose} className='text-text-secondary'>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
