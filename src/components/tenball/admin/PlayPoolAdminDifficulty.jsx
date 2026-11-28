import React, { useState } from 'react';
import { setPlayPoolAdminSettings } from './playPoolAdminStore';
import styles from './PlayPoolAdmin.module.css';

export default function PlayPoolAdminDifficulty({ settings }) {
  const [status, setStatus] = useState('');

  const save = (patch) => {
    setPlayPoolAdminSettings(patch);
    setStatus('Difficulty saved. New shots use these values.');
  };

  return (
    <div className={styles.panel}>
      <h2>Difficulty / XP</h2>
      <p className={styles.hint}>
        Skill level eases the timing meter (hooks into the existing XP stub). Computer strength is stored for upcoming AI tuning.
      </p>

      <label className={styles.row}>
        <span className={styles.rowLabel}>
          <strong>Skill level</strong>
          <span>1 = baseline · 10 = easiest meter</span>
        </span>
        <input
          className={styles.number}
          type="number"
          min={1}
          max={10}
          value={settings.skillLevel}
          onChange={(event) => save({ skillLevel: event.target.value })}
        />
      </label>

      <label className={styles.row}>
        <span className={styles.rowLabel}>
          <strong>Computer strength</strong>
          <span>Reserved — does not change AI yet</span>
        </span>
        <select
          className={styles.select}
          value={settings.computerStrength}
          onChange={(event) => save({ computerStrength: event.target.value })}
        >
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </select>
      </label>

      {status ? <div className={styles.status}>{status}</div> : null}
    </div>
  );
}
