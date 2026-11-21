// src/components/campfire/Wall.tsx
import { useEffect, useState } from 'react';

type Item = { id: number; name: string; relation: string; message: string; created_at: string };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Wall() {
  const [items, setItems] = useState<Item[]>([]);
  const [more, setMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');

  async function load(before?: number) {
    try {
      const r = await fetch(`/api/public/condolences${before ? `?before=${before}` : ''}`);
      const d = await r.json();
      setItems((prev) => (before ? [...prev, ...d.items] : d.items));
      setMore(d.more);
      setTotal(d.total);
      setState('ready');
    } catch {
      setState((s) => (s === 'loading' ? 'offline' : s));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="cf-wall" aria-live="polite">
      <div className="cf-wall-h">
        <h3>Memories</h3>
        <span>{total}</span>
      </div>
      {state === 'loading' && <p className="cf-muted">Loading</p>}
      {state === 'offline' && <p className="cf-muted">Messages will load when you're back online.</p>}
      {state === 'ready' && items.length === 0 && <p className="cf-muted">Be the first to leave a memory.</p>}
      <div className="cf-list">
        {items.map((i) => (
          <article key={i.id} className="cf-msg">
            <p className="cf-msg-text">{i.message}</p>
            <footer>
              <strong>{i.name}</strong>
              <span>{i.relation}</span>
              <time dateTime={i.created_at}>{date(i.created_at)}</time>
            </footer>
          </article>
        ))}
      </div>
      {more && (
        <button className="cf-btn cf-btn-ghost" onClick={() => load(items[items.length - 1].id)}>
          Show more
        </button>
      )}
    </section>
  );
}
