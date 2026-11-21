// src/components/campfire/MessageForm.tsx
import { useState, type FormEvent } from 'react';

const RELATIONS = ['Family', 'Friend', 'School', 'Kenya Army', 'Football', 'Music', 'Neighbour', 'Work'];
const EMPTY = { name: '', relation: '', message: '', website: '' };

export default function MessageForm() {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const r = await fetch('/api/public/condolences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not send. Please try again.');
      setState('sent');
    } catch (err) {
      setError((err as Error).message);
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div className="cf-card cf-thanks">
        <h3>Thank you, {form.name.split(' ')[0]}.</h3>
        <p className="cf-muted">Your message will appear here once the family has read it.</p>
        <button className="cf-link" onClick={() => { setForm(EMPTY); setState('idle'); }}>
          Write another
        </button>
      </div>
    );
  }

  return (
    <form className="cf-card cf-form" onSubmit={submit}>
      <h3>Leave a memory</h3>
      <label>
        Your name
        <input required maxLength={80} value={form.name} onChange={set('name')} autoComplete="name" />
      </label>
      <label>
        Where you know him from
        <input required maxLength={80} list="cf-relations" placeholder="Family, school, the army"
          value={form.relation} onChange={set('relation')} />
        <datalist id="cf-relations">
          {RELATIONS.map((r) => <option key={r} value={r} />)}
        </datalist>
      </label>
      <label>
        Your message
        <textarea required rows={6} maxLength={2000} value={form.message} onChange={set('message')} />
      </label>
      <input className="cf-hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
        value={form.website} onChange={set('website')} />
      {error && <p className="cf-error">{error}</p>}
      <button className="cf-btn" disabled={state === 'sending'}>{state === 'sending' ? 'Sending' : 'Send'}</button>
      <p className="cf-muted">Messages are read by the family before they appear.</p>
    </form>
  );
}
