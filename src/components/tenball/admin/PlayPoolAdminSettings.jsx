import React, { useEffect, useState } from 'react';
import {
  resetPlayPoolAdminSettings,
  setPlayPoolAdminSettings
} from './playPoolAdminStore';
import styles from './PlayPoolAdmin.module.css';

export default function PlayPoolAdminSettings({ settings }) {
  const [notes, setNotes] = useState(settings.notes || '');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setNotes(settings.notes || '');
  }, [settings.notes]);

  const saveNotes = () => {
    setPlayPoolAdminSettings({ notes });
    setStatus('Notes saved.');
  };

  const saveDefaultOpponent = (checked) => {
    setPlayPoolAdminSettings({ defaultVsComputer: checked });
    setStatus('Default opponent saved for new matches.');
  };

  const resetAll = () => {
    if (!window.confirm('Reset all Play Pool admin settings on this device?')) return;
    resetPlayPoolAdminSettings();
    setNotes('');
    setStatus('Settings reset to defaults.');
  };

  return (
    <div className={styles.panel}>
      <h2>Settings</h2>
      <p className={styles.hint}>
        Device-local flags and notes. Match history and cloud config can land here later.
      </p>

      <label className={styles.row}>
        <span className={styles.rowLabel}>
          <strong>Default vs computer</strong>
          <span>Pre-check computer opponent on new match setup</span>
        </span>
        <input
          className={styles.toggle}
          type="checkbox"
          checked={settings.defaultVsComputer !== false}
          onChange={(event) => saveDefaultOpponent(event.target.checked)}
        />
      </label>

      <label className={styles.rowLabel} style={{ marginTop: 12, display: 'block' }}>
        <strong>Admin notes</strong>
        <span>Private scratch pad on this browser</span>
      </label>
      <textarea
        className={styles.textarea}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="e.g. timing feel notes, upcoming modes…"
      />

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={saveNotes}>
          Save notes
        </button>
        <button type="button" className={styles.btnGhost} onClick={resetAll}>
          Reset all defaults
        </button>
      </div>

      {status ? <div className={styles.status}>{status}</div> : null}
    </div>
  );
}
