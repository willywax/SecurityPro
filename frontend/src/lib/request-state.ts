import { useState } from 'react';

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export function useRequestState() {
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState('');

  return {
    status,
    error,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    start: () => {
      setStatus('loading');
      setError('');
    },
    succeed: () => setStatus('success'),
    fail: (message: string) => {
      setStatus('error');
      setError(message);
    },
    reset: () => {
      setStatus('idle');
      setError('');
    },
  };
}
