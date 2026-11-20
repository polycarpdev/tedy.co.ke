// src/admin/Overview.tsx
import { useEffect, useState } from 'react';
import { api, type Admin, type Summary } from './api';

export function Overview({ admin }: { admin: Admin }) {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    api<Summary>('/admin/summary').then(setS).catch(() => {});
  }, []);

  const stats = s
    ? [
        { n: s.stops, l: 'Trail stops', link: 'stops' },
        { n: s.media, l: 'Photos and audio', link: 'stops' },
        { n: s.pending, l: 'Condolences waiting', link: 'condolences', alert: s.pending > 0 },
        { n: s.approved, l: 'Condolences published', link: 'condolences' },
        { n: s.candles, l: 'Candles lit' },
      ]
    : [];

  return (
    <>
      <div className="ad-h">
        <h2>Welcome back, {admin.name}</h2>
        <span className="ad-muted">Everything at a glance</span>
      </div>
      <div className="ad-stats">
        {stats.map((x) => (
          <button
            key={x.l}
            className={`ad-card ad-stat${x.alert ? ' ad-stat-alert' : ''}`}
            onClick={() => x.link && (location.hash = x.link)}
            disabled={!x.link}
          >
            <div className="ad-stat-n">{x.n}</div>
            <div className="ad-stat-l">{x.l}</div>
          </button>
        ))}
      </div>
    </>
  );
}
