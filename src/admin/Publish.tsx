// src/admin/Publish.tsx
import { useCallback, useEffect, useState } from 'react';
import { api, type PublishState } from './api';

export function Publish() {
  const [state, setState] = useState<PublishState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<PublishState>('/admin/publish').then(setState).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, state?.running ? 5000 : 30000);
    return () => clearInterval(t);
  }, [load, state?.running]);

  useEffect(() => {
    const onChange = () => setTimeout(load, 300);
    window.addEventListener('ad:changed', onChange);
    return () => window.removeEventListener('ad:changed', onChange);
  }, [load]);

  async function publish() {
    setBusy(true);
    try {
      setState(await api<PublishState>('/admin/publish', { method: 'POST' }));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const running = !!state?.running;
  const label = running ? (state?.last?.status === 'deploying' ? 'Going live' : 'Building') : 'Publish';
  const title = state?.changed ? 'You have unpublished changes' : 'Everything is published';

  return (
    <button
      className={`ad-btn ad-btn-primary ad-publish${state?.changed && !running ? ' has-changes' : ''}`}
      onClick={publish}
      disabled={busy || running}
      title={title}
    >
      {running && <span className="ad-spin" aria-hidden="true" />}
      {label}
    </button>
  );
}
