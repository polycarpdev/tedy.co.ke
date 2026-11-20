// src/admin/Shell.tsx
import { useEffect, useState } from 'react';
import { api, type Admin } from './api';
import { Icon, type IconName } from './Icon';
import { Bell } from './Bell';
import { Overview } from './Overview';
import { Stops } from './Stops';

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'stops', label: 'Stops', icon: 'stops' },
  { id: 'condolences', label: 'Condolences', icon: 'condolences' },
];

const readTab = () => location.hash.replace('#', '').split('/')[0] || 'overview';

export function Shell({ admin, onSignOut }: { admin: Admin; onSignOut: () => void }) {
  const [tab, setTab] = useState(readTab);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  async function signOut() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    onSignOut();
  }

  return (
    <>
      <header className="ad-top">
        <div className="ad-brand">Tedy <span>admin</span></div>
        <nav className="ad-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="ad-tab"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => (location.hash = t.id)}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="ad-actions">
          <a className="ad-btn" href="/" target="_blank" rel="noreferrer">
            <Icon name="open" />
            <span className="ad-hide-sm">View site</span>
          </a>
          <Bell />
          <button className="ad-btn" onClick={signOut} title={`Sign out ${admin.name}`} aria-label="Sign out">
            <Icon name="sign-out" />
          </button>
        </div>
      </header>
      <main className="ad-main">
        {tab === 'overview' && <Overview admin={admin} />}
        {tab === 'stops' && <Stops />}
        {tab === 'condolences' && (
          <>
            <div className="ad-h"><h2>Condolences</h2></div>
            <div className="ad-card ad-muted">Coming in a later step.</div>
          </>
        )}
      </main>
    </>
  );
}
