// src/admin/Bell.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Notification } from './api';
import { Icon } from './Icon';

type Feed = { items: Notification[]; unread: number };

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function Bell() {
  const [feed, setFeed] = useState<Feed>({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<Feed>('/admin/notifications').then(setFeed).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function openItem(n: Notification) {
    if (!n.read_at) await api(`/admin/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    if (n.link) location.hash = n.link;
    setOpen(false);
    load();
  }

  async function readAll() {
    await api('/admin/notifications/read', { method: 'POST' }).catch(() => {});
    load();
  }

  return (
    <div className="ad-bell" ref={ref}>
      <button className="ad-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Icon name="bell" />
        {feed.unread > 0 && <span className="ad-badge">{feed.unread > 99 ? '99+' : feed.unread}</span>}
      </button>
      {open && (
        <div className="ad-pop">
          <div className="ad-pop-h">
            <strong>Notifications</strong>
            {feed.unread > 0 && <button className="ad-link" onClick={readAll}>Mark all read</button>}
          </div>
          {feed.items.length === 0 ? (
            <div className="ad-empty">Nothing yet.</div>
          ) : (
            feed.items.map((n) => (
              <button key={n.id} className={`ad-note${n.read_at ? '' : ' is-unread'}`} onClick={() => openItem(n)}>
                <div className="ad-note-t">{n.title}</div>
                <div className="ad-note-d">{ago(n.created_at)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
