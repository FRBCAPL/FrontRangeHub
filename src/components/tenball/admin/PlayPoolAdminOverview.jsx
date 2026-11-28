import React from 'react';
import { Link } from 'react-router-dom';
import {
  GAME_EIGHT,
  GAME_NINE,
  GAME_ONE_POCKET,
  GAME_TEN
} from '../gameRules';
import styles from './PlayPoolAdmin.module.css';

const LABELS = {
  [GAME_EIGHT]: '8-Ball',
  [GAME_NINE]: '9-Ball',
  [GAME_TEN]: '10-Ball',
  [GAME_ONE_POCKET]: 'One Pocket'
};

export default function PlayPoolAdminOverview({ settings }) {
  const enabledCount = Object.values(settings.modes || {}).filter(Boolean).length;

  return (
    <div className={styles.panel}>
      <h2>Overview</h2>
      <p className={styles.hint}>
        Hub-admin tools for Play Pool. Settings save in this browser for now — ready to move to Supabase later.
      </p>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <strong>{enabledCount} / 4</strong>
          <span>Modes enabled</span>
        </div>
        <div className={styles.statCard}>
          <strong>{settings.skillLevel}</strong>
          <span>Skill level (timing ease)</span>
        </div>
        <div className={styles.statCard}>
          <strong>{settings.computerStrength}</strong>
          <span>Computer strength</span>
        </div>
        <div className={styles.statCard}>
          <strong>{settings.tipsEnabled ? 'On' : 'Off'}</strong>
          <span>In-game tips</span>
        </div>
      </div>

      <ul className={styles.hint} style={{ marginTop: 16 }}>
        {Object.entries(LABELS).map(([id, label]) => (
          <li key={id}>
            {label}: {settings.modes?.[id] ? 'enabled' : 'hidden'}
          </li>
        ))}
      </ul>

      <div className={styles.links}>
        <Link to="/tenball-tutorial">Open Play Pool</Link>
        <Link to="/play-pool/admin?tab=visitors">Visitors</Link>
        <Link to="/admin/inbox">Admin Home</Link>
      </div>
    </div>
  );
}
