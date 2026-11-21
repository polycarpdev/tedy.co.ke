// src/admin/Condolences.tsx
import { useCallback, useEffect, useState } from 'react';
import { api, type Condolence } from './api';
import { Icon } from './Icon';

type Status = Condolence['status'];
type Feed = { items: Condolence[]; counts: Record<Status, number> };

const LABELS: Record<Status, string> = { pending: 'Waiting', approved: 'Published', rejected: 'Rejected' };
const STATUSES = Object.keys(LABELS) as Status[];
const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const readOpen = () => {
  const [tab, id] = location.hash.replace('#', '').split('/');
  return tab === 'condolences' && id ? Number(id) : null;
};

export function Condolences() {
  const [status, setStatus] = useState<Status>('pending');
  const [feed, setFeed] = useState<Feed>({ items: [], counts: { pending: 0, approved: 0, rejected: 0 } });
  const [openId, setOpenId] = useState<number | null>(readOpen);

  const load = useCallback(() => {
    api<Feed>(`/admin/condolences?status=${status}`).then(setFeed).catch(() => {});
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onHash = () => setOpenId(readOpen());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const open = (id: number | null) => {
    location.hash = id ? `condolences/${id}` : 'condolences';
  };

  async function changeStatus(id: number, next: Status) {
    await api(`/admin/condolences/${id}/status`, { method: 'POST', body: { status: next } }).catch(() => {});
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this message permanently?')) return;
    await api(`/admin/condolences/${id}`, { method: 'DELETE' }).catch(() => {});
    open(null);
    load();
  }

  return (
    <>
      <div className="ad-h">
        <h2>Condolences</h2>
        <div className="ad-seg">
          {STATUSES.map((s) => (
            <button key={s} className="ad-seg-btn" aria-current={status === s ? 'page' : undefined}
              onClick={() => setStatus(s)}>
              {LABELS[s]} <span>{feed.counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {feed.items.length === 0 ? (
        <div className="ad-card ad-muted">
          {status === 'pending' ? 'Nothing waiting. All caught up.' : 'Nothing here yet.'}
        </div>
      ) : (
        <div className="ad-table">
          {feed.items.map((c) => (
            <div key={c.id} className={`ad-row ad-row-msg${openId === c.id ? ' is-open' : ''}`} onClick={() => open(c.id)}>
              <div className="ad-row-main">
                <div className="ad-row-title">
                  {c.name} <span className="ad-pill">{c.relation}</span>
                </div>
                <div className="ad-row-line">{c.message}</div>
              </div>
              <div className="ad-row-meta">{when(c.created_at)}</div>
              <div className="ad-row-actions" onClick={(e) => e.stopPropagation()}>
                {c.status !== 'approved' && (
                  <button className="ad-icon-btn" title="Approve" onClick={() => changeStatus(c.id, 'approved')}>
                    <Icon name="check" />
                  </button>
                )}
                {c.status !== 'rejected' && (
                  <button className="ad-icon-btn" title="Reject" onClick={() => changeStatus(c.id, 'rejected')}>
                    <Icon name="x" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {openId && (
        <MessagePanel id={openId} onClose={() => open(null)} onStatus={changeStatus} onDelete={remove} />
      )}
    </>
  );
}

type PanelProps = {
  id: number;
  onClose: () => void;
  onStatus: (id: number, s: Status) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function MessagePanel({ id, onClose, onStatus, onDelete }: PanelProps) {
  const [c, setC] = useState<Condolence | null>(null);

  const load = useCallback(() => {
    api<Condolence>(`/admin/condolences/${id}`).then(setC).catch(() => setC(null));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function change(s: Status) {
    await onStatus(id, s);
    load();
  }

  return (
    <div className="ad-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="ad-drawer ad-drawer-sm">
        <div className="ad-drawer-h">
          <strong>{c ? c.name : 'Loading'}</strong>
          <button className="ad-icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="ad-drawer-body">
          {c && (
            <>
              <div className="ad-muted">
                {c.relation} · {new Date(c.created_at).toLocaleString()} ·{' '}
                <span className={`ad-status ad-status-${c.status}`}>{LABELS[c.status]}</span>
              </div>
              <blockquote className="ad-quote">{c.message}</blockquote>
            </>
          )}
        </div>
        {c && (
          <div className="ad-drawer-f">
            <button className="ad-btn ad-btn-danger" onClick={() => onDelete(id)}>
              <Icon name="trash" /> Delete
            </button>
            <span className="ad-muted" />
            {c.status !== 'rejected' && <button className="ad-btn" onClick={() => change('rejected')}>Reject</button>}
            {c.status !== 'approved' && (
              <button className="ad-btn ad-btn-primary" onClick={() => change('approved')}>Approve</button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
