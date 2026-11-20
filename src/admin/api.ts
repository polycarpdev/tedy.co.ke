// src/admin/api.ts
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong');
  return data as T;
}

export type Admin = { id: number; name: string; email: string };
export type Notification = {
  id: number;
  kind: string;
  title: string;
  link: string;
  read_at: string | null;
  created_at: string;
};
export type Summary = { stops: number; media: number; pending: number; approved: number; candles: number };
