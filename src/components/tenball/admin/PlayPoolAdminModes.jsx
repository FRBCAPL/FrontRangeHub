import React, { useState } from 'react';
import {
  GAME_EIGHT,
  GAME_NINE,
  GAME_ONE_POCKET,
  GAME_TEN
} from '../gameRules';
import { setPlayPoolAdminSettings } from './playPoolAdminStore';
import styles from './PlayPoolAdmin.module.css';

const MODE_ROWS = [
  { id: GAME_EIGHT, label: '8-Ball', hint: 'Solids & stripes' },
  { id: GAME_NINE, label: '9-Ball', hint: 'Diamond rack · no call shot' },
  { id: GAME_TEN, label: '10-Ball', hint: 'Recommended · CSI call shot' },
  { id: GAME_ONE_POCKET, label: 'One Pocket', hint: 'Foot corners · race to 8' }
];

export default function PlayPoolAdminModes({ settings }) {
  const [status, setStatus] = useState('');

  const toggle = (id) => {
    const nextModes = { ...settings.modes, [id]: !settings.modes[id] };
    const enabled = Object.values(nextModes).filter(Boolean).length;
    if (enabled === 0) {
      setStatus('Keep at least one mode enabled.');
      return;
    }
    setPlayPoolAdminSettings({ modes: nextModes });
    setStatus('Modes updated. Menu refreshes immediately.');
  };

  return (
    <div className={styles.panel}>
      <h2>Modes</h2>
      <p className={styles.hint}>
        Hide a game type from the Play Pool menu without deleting its code. At least one mode must stay on.
      </p>
      {MODE_ROWS.map((row) => (
        <label key={row.id} className={styles.row}>
          <span className={styles.rowLabel}>
            <strong>{row.label}</strong>
            <span>{row.hint}</span>
          </span>
          <input
            className={styles.toggle}
            type="checkbox"
            checked={settings.modes?.[row.id] !== false}
            onChange={() => toggle(row.id)}
          />
        </label>
      ))}
      {status ? <div className={styles.status}>{status}</div> : null}
    </div>
  );
}
