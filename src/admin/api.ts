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

export function uploadFile<T>(path: string, file: File, onProgress: (p: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api${path}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {};
      }
      if (xhr.status < 300) {
        window.dispatchEvent(new Event('ad:changed'));
        resolve(data as T);
        return;
      }
      reject(new ApiError(xhr.status, data.error || 'Upload failed'));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Network error'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
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
export type Outfit = 'jersey' | 'army' | 'casual';
export type Accessory = 'none' | 'camera' | 'headphones';
export type StopRow = {
  id: number;
  slug: string;
  position: number;
  year: number;
  title: string;
  line: string;
  published: boolean;
  outfit: Outfit;
  accessory: Accessory;
  media_count: number;
  cover: string | null;
};
export type Media = {
  id: number;
  stop_id: number;
  kind: 'photo' | 'audio';
  file: string;
  width: number;
  height: number;
  caption: string;
  alt: string;
  position: number;
  is_cover: boolean;
};
export type StopDetail = {
  id: number;
  slug: string;
  position: number;
  year: number;
  title: string;
  line: string;
  body: string;
  outfit: Outfit;
  accessory: Accessory;
  published: boolean;
  media: Media[];
};

export type PublishState = {
  running: boolean;
  changed: boolean;
  live_at: string | null;
  last: { id: number; status: string; created_at: string; finished_at: string | null } | null;
};
