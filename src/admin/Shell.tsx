// src/admin/Shell.tsx
import { useEffect, useState } from 'react';
import { api, type Admin } from './api';
import { Icon, type IconName } from './Icon';
import { Bell } from './Bell';
import { Overview } from './Overview';
import { Stops } from './Stops';
import { Publish } from './Publish';
import { Condolences } from './Condolences';
import { Eulogy } from './Eulogy';

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'stops', label: 'Stops', icon: 'stops' },
  { id: 'eulogy', label: 'Eulogy', icon: 'eulogy' },
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
      <header className="cms-top">
        <div className="cms-brand">Tedy <span>admin</span></div>
        <nav className="cms-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="cms-tab"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => (location.hash = t.id)}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="cms-actions">
          <a className="cms-btn" href="/" target="_blank" rel="noreferrer">
            <Icon name="open" />
            <span className="cms-hide-sm">View site</span>
          </a>
          <Publish />
          <Bell />
          <button className="cms-btn" onClick={signOut} title={`Sign out ${admin.name}`} aria-label="Sign out">
            <Icon name="sign-out" />
          </button>
        </div>
      </header>
      <main className="cms-main">
        {tab === 'overview' && <Overview admin={admin} />}
        {tab === 'stops' && <Stops />}
        {tab === 'eulogy' && <Eulogy />}
        {tab === 'condolences' && <Condolences />}
      </main>
    </>
  );
}
