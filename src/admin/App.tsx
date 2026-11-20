// src/admin/App.tsx
import { useEffect, useState } from 'react';
import { api, type Admin } from './api';
import { Login } from './Login';
import { Shell } from './Shell';
import './admin.css';

export default function App() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api<Admin>('/auth/me')
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="ad-loading">Loading</div>;
  if (!admin) return <Login onDone={setAdmin} />;
  return <Shell admin={admin} onSignOut={() => setAdmin(null)} />;
}
