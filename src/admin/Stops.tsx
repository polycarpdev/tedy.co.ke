// src/admin/Stops.tsx
import { useCallback, useEffect, useState } from 'react';
import { api, type StopRow } from './api';
import { Icon } from './Icon';
import { StopPanel } from './StopPanel';

const readOpen = () => {
  const [tab, id] = location.hash.replace('#', '').split('/');
  return tab === 'stops' && id ? Number(id) : null;
};

export function Stops() {
  const [rows, setRows] = useState<StopRow[]>([]);
  const [openId, setOpenId] = useState<number | null>(readOpen);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<StopRow[]>('/admin/stops').then(setRows).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onHash = () => setOpenId(readOpen());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const open = (id: number | null) => {
    location.hash = id ? `stops/${id}` : 'stops';
  };

  async function move(id: number, dir: number) {
    await api(`/admin/stops/${id}/move`, { method: 'POST', body: { dir } }).catch(() => {});
    load();
  }

  async function add() {
    setBusy(true);
    try {
      const s = await api<{ id: number }>('/admin/stops', {
        method: 'POST',
        body: { title: 'New stop', year: new Date().getFullYear() },
      });
      load();
      open(s.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="ad-h">
        <h2>Stops</h2>
        <button className="ad-btn ad-btn-primary" onClick={add} disabled={busy}>
          <Icon name="plus" /> Add stop
        </button>
      </div>
      <div className="ad-table">
        {rows.map((s, i) => (
          <div key={s.id} className={`ad-row${openId === s.id ? ' is-open' : ''}`} onClick={() => open(s.id)}>
            <div className="ad-thumb">
              {s.cover ? <img src={`/media/${s.cover}/480.webp`} alt="" loading="lazy" /> : <Icon name="image" />}
            </div>
            <div className="ad-row-year">{s.year_label || (s.year_end ? `${s.year}–${s.year_end}` : s.year)}</div>
            <div className="ad-row-main">
              <div className="ad-row-title">
                {s.title}
                {!s.published && <span className="ad-pill">Hidden</span>}
              </div>
              <div className="ad-row-line">{s.line}</div>
            </div>
            <div className="ad-row-meta">
              {s.media_count} photo{s.media_count === 1 ? '' : 's'}
            </div>
            <div className="ad-row-actions" onClick={(e) => e.stopPropagation()}>
              <button className="ad-icon-btn" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="Move up">
                <Icon name="up" />
              </button>
              <button
                className="ad-icon-btn"
                onClick={() => move(s.id, 1)}
                disabled={i === rows.length - 1}
                aria-label="Move down"
              >
                <Icon name="down" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {openId && <StopPanel id={openId} onClose={() => open(null)} onChange={load} />}
    </>
  );
}
