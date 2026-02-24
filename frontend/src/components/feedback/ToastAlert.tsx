import { useEffect, useState } from 'react';

type Toast = { id: number; tone: 'success' | 'error'; title: string; message: string };

export function useToastAlerts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (tone: Toast['tone'], title: string, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, title, message }]);
  };

  const dismiss = (id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  return { toasts, push, dismiss };
}

export default function ToastAlert({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timers = toasts.map((toast) => setTimeout(() => onDismiss(toast.id), 4500));
    return () => timers.forEach(clearTimeout);
  }, [onDismiss, toasts]);

  return (
    <div className='fixed right-4 top-4 z-50 space-y-2'>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-sm rounded-token-md border px-4 py-3 shadow-token-md ${toast.tone === 'error' ? 'border-danger text-danger bg-danger/10' : 'border-success text-success bg-success/10'}`}
        >
          <p className='text-sm font-semibold'>{toast.title}</p>
          <p className='text-sm'>{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
