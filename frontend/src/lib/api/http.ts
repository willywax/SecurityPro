const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(body || `Request failed with status ${res.status}`, res.status, body);
  }

  return res.json();
}

export function toOperatorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiError) {
    return `API ${error.status}: ${error.details || error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
