// src/admin/Journey.tsx
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

type Point = { id?: number; name: string; km: number; planned_at: string; passed_at?: string | null };
type JourneyRow = {
  title: string;
  depart_at: string;
  arrive_at: string;
  show_from: string | null;
  show_until: string | null;
  stopped: boolean;
  stopped_at: string | null;
  note: string;
  rehearsal?: boolean;
};
type State = { journey: JourneyRow | null; points: Point[] };

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
const pad = (n: number) => String(n).padStart(2, '0');
const toInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInput = (v: string) => (v ? new Date(v).toISOString() : null);

function label(points: Point[], i: number) {
  const p = points[i];
  if (i === 0) return `Left ${p.name}`;
  if (i === points.length - 1) return `Arrived at ${p.name}`;
  return `Passed ${p.name}`;
}

export function Journey() {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [edit, setEdit] = useState(false);

  const load = useCallback(() => {
    api<State>('/admin/journey').then(setS).catch((e) => setErr((e as Error).message));
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setErr('');
    try {
      setS(await api<State>(`/admin/journey${path}`, { method: 'POST', body }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!s || !s.journey) return <div className="cms-card cms-muted">{err || 'Loading'}</div>;
  const j = s.journey;
  const points = s.points;
  const nextIndex = points.findIndex((p) => !p.passed_at);
  const passed = points.filter((p) => p.passed_at);
  const last = passed[passed.length - 1];

  let status = `Not started. Planned departure ${time(j.depart_at)}.`;
  if (last) status = `Last update: ${label(points, passed.length - 1)} at ${time(last.passed_at!)}.`;
  if (j.stopped && j.stopped_at) status = `Stopped since ${time(j.stopped_at)}${j.note ? `: ${j.note}` : ''}.`;

  return (
    <>
      <div className="cms-h">
        <h2>Journey</h2>
        <div className="cms-inline">
          {j.rehearsal ? (
            <button className="cms-btn cms-btn-primary" disabled={busy} onClick={() => act('/restore')}>Restore real plan</button>
          ) : (
            <button className="cms-btn" disabled={busy} onClick={() => confirm('Squeeze the trip into 15 minutes, starting in 1 minute?') && act('/rehearse', { minutes: 15 })}>Rehearse 15 min</button>
          )}
          <button className="cms-btn" onClick={() => setEdit(!edit)}>{edit ? 'Done editing' : 'Edit route'}</button>
        </div>
      </div>
      {err && <div className="cms-card cms-gap">{err}</div>}

      {edit ? (
        <Editor state={s} onSaved={setS} />
      ) : (
        <>
          <div className="cms-card cms-jr-now cms-gap">
            <p className="cms-muted">{status}</p>
            {nextIndex >= 0 ? (
              <button className="cms-jr-pass" disabled={busy} onClick={() => act('/pass')}>
                {label(points, nextIndex)}
              </button>
            ) : (
              <p className="cms-jr-home">Tedy is home.</p>
            )}
            {nextIndex > 0 && (
              <div className="cms-jr-row">
                {j.stopped ? (
                  <button className="cms-btn cms-btn-primary" disabled={busy} onClick={() => act('/go')}>
                    Moving again
                  </button>
                ) : (
                  <>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Note, e.g. Brief stop in Kericho"
                      maxLength={140}
                    />
                    <button
                      className="cms-btn"
                      disabled={busy}
                      onClick={() => {
                        act('/stop', { note });
                        setNote('');
                      }}
                    >
                      Stopped
                    </button>
                  </>
                )}
              </div>
            )}
            <div className="cms-jr-row">
              <button className="cms-btn" disabled={busy || !last} onClick={() => act('/undo')}>Undo last</button>
              <button
                className="cms-btn cms-btn-danger"
                disabled={busy || !last}
                onClick={() => confirm('Clear every passed checkpoint? Use this after a rehearsal.') && act('/reset')}
              >
                Reset
              </button>
            </div>
          </div>

          <ol className="cms-jr-list">
            {points.map((p, i) => (
              <li key={p.id} className={p.passed_at ? 'is-done' : i === nextIndex ? 'is-next' : ''}>
                <b>{p.name}</b>
                <span>{p.km} km</span>
                <span>Planned {time(p.planned_at)}</span>
                <span>{p.passed_at ? `Done ${time(p.passed_at)}` : ''}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

type Row = { id?: number; name: string; km: string; at: string };

function Editor({ state, onSaved }: { state: State; onSaved: (s: State) => void }) {
  const j = state.journey!;
  const [rows, setRows] = useState<Row[]>(
    state.points.map((p) => ({ id: p.id, name: p.name, km: String(p.km), at: toInput(p.planned_at) }))
  );
  const [dep, setDep] = useState(toInput(j.depart_at));
  const [arr, setArr] = useState(toInput(j.arrive_at));
  const [from, setFrom] = useState(toInput(j.show_from));
  const [until, setUntil] = useState(toInput(j.show_until));
  const [msg, setMsg] = useState('');

  const set = (i: number, k: keyof Row, v: string) =>
    setRows((r) => r.map((x, n) => (n === i ? { ...x, [k]: v } : x)));

  async function save() {
    setMsg('Saving');
    try {
      await api('/admin/journey', {
        method: 'PUT',
        body: { depart_at: fromInput(dep), arrive_at: fromInput(arr), show_from: fromInput(from), show_until: fromInput(until) },
      });
      const r = await api<State>('/admin/journey/points', {
        method: 'PUT',
        body: { points: rows.map((x) => ({ id: x.id, name: x.name, km: Number(x.km), planned_at: fromInput(x.at) })) },
      });
      onSaved(r);
      setMsg('Saved');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="cms-card cms-jr-edit">
      <div className="cms-jr-line">
        <label>Departs<input type="datetime-local" value={dep} onChange={(e) => setDep(e.target.value)} /></label>
        <label>Arrives<input type="datetime-local" value={arr} onChange={(e) => setArr(e.target.value)} /></label>
        <label>Banner from<input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Banner until<input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
      </div>
      <p className="cms-muted">Checkpoints, in order. The first is the start and the last is the destination.</p>
      {rows.map((r, i) => (
        <div key={r.id ?? `n${i}`} className="cms-jr-line">
          <input value={r.name} onChange={(e) => set(i, 'name', e.target.value)} placeholder="Town" />
          <input value={r.km} onChange={(e) => set(i, 'km', e.target.value)} inputMode="decimal" placeholder="km" />
          <input type="datetime-local" value={r.at} onChange={(e) => set(i, 'at', e.target.value)} />
          <button
            className="cms-btn"
            disabled={rows.length <= 2}
            onClick={() => setRows((x) => x.filter((_, n) => n !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="cms-jr-row">
        <button
          className="cms-btn"
          onClick={() =>
            setRows((x) => [...x.slice(0, -1), { name: '', km: '', at: x[x.length - 1].at }, x[x.length - 1]])
          }
        >
          Add checkpoint
        </button>
        <button className="cms-btn cms-btn-primary" onClick={save}>Save route</button>
        {msg && <span className="cms-muted">{msg}</span>}
      </div>
    </div>
  );
}
