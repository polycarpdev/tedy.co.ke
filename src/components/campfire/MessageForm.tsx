// src/components/campfire/MessageForm.tsx
import { useState, type FormEvent } from 'react';

export default function MessageForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState('sending');
    setError('');
    try {
      const r = await fetch('/api/public/condolences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not send. Please try again.');
      form.reset();
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.');
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div className="cf-form cf-sent">
        <h2>Thank you</h2>
        <p>Your memory will appear here once it's approved.</p>
        <button className="cf-link" type="button" onClick={() => setState('idle')}>
          Leave another
        </button>
      </div>
    );
  }

  return (
    <form className="cf-form" onSubmit={submit}>
      <h2>Leave a memory</h2>
      <div className="cf-row">
        <label>
          <span>Your name</span>
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
        <label>
          <span>Where you know him from</span>
          <input name="relation" required maxLength={80} placeholder="Family, school, the army" />
        </label>
      </div>
      <label>
        <span>Your message</span>
        <textarea name="message" required rows={3} maxLength={2000} />
      </label>
      <input className="cf-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {error && <p className="cf-error" role="alert">{error}</p>}
      <button className="cf-btn" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending' : 'Send'}
      </button>
    </form>
  );
}
