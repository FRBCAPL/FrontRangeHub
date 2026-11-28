import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PlayPoolAdminDifficulty from './PlayPoolAdminDifficulty';
import PlayPoolAdminModes from './PlayPoolAdminModes';
import PlayPoolAdminOverview from './PlayPoolAdminOverview';
import PlayPoolAdminSettings from './PlayPoolAdminSettings';
import PlayPoolAdminTips from './PlayPoolAdminTips';
import PlayPoolAdminVisitors from './PlayPoolAdminVisitors';
import usePlayPoolAdminSettings from './usePlayPoolAdminSettings';
import styles from './PlayPoolAdmin.module.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'modes', label: 'Modes' },
  { id: 'difficulty', label: 'Difficulty / XP' },
  { id: 'tips', label: 'Tips & tutorials' },
  { id: 'settings', label: 'Settings' }
];

export default function PlayPoolAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const settings = usePlayPoolAdminSettings();
  const tab = useMemo(() => {
    const requested = searchParams.get('tab') || 'overview';
    return TABS.some((item) => item.id === requested) ? requested : 'overview';
  }, [searchParams]);

  const setTab = (id) => {
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Play Pool admin</h1>
        <p className={styles.lede}>
          Modes, difficulty, and tips for the hub pool game. Same staff gate as other app admins.
        </p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Play Pool admin sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`${styles.tab} ${tab === item.id ? styles.tabActive : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <PlayPoolAdminOverview settings={settings} /> : null}
      {tab === 'visitors' ? <PlayPoolAdminVisitors /> : null}
      {tab === 'modes' ? <PlayPoolAdminModes settings={settings} /> : null}
      {tab === 'difficulty' ? <PlayPoolAdminDifficulty settings={settings} /> : null}
      {tab === 'tips' ? <PlayPoolAdminTips settings={settings} /> : null}
      {tab === 'settings' ? <PlayPoolAdminSettings settings={settings} /> : null}

      <div className={styles.links}>
        <Link to="/play-pool">← Play Pool</Link>
        <Link to="/admin/inbox">Admin Home</Link>
      </div>
    </div>
  );
}
