// src/admin/Login.tsx
import { useState, type FormEvent } from 'react';
import { api, type Admin } from './api';

export function Login({ onDone }: { onDone: (a: Admin) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onDone(await api<Admin>('/auth/login', { method: 'POST', body: { email, password } }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="cms-login">
      <form onSubmit={submit}>
        <h1>Tedy admin</h1>
        <label className="cms-field">
          Email
          <input className="cms-input" type="email" autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="cms-field">
          Password
          <input className="cms-input" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="cms-error">{error}</p>}
        <button className="cms-btn cms-btn-primary" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
      </form>
    </div>
  );
}
