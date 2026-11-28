import React, { useState } from 'react';
import { setPlayPoolAdminSettings } from './playPoolAdminStore';
import { writeMutedTipSeats } from '../TipManager';
import styles from './PlayPoolAdmin.module.css';

export default function PlayPoolAdminTips({ settings }) {
  const [status, setStatus] = useState('');

  const save = (patch) => {
    setPlayPoolAdminSettings(patch);
    setStatus('Tip settings saved.');
  };

  const clearMutes = () => {
    writeMutedTipSeats([]);
    setStatus('Cleared tip mutes for all seats on this device.');
  };

  return (
    <div className={styles.panel}>
      <h2>Tips & tutorials</h2>
      <p className={styles.hint}>
        Control lesson tips and the How to Play entry on the menu. Rules tutorials still open from each mode’s learn list.
      </p>

      <label className={styles.row}>
        <span className={styles.rowLabel}>
          <strong>In-game tips</strong>
          <span>Pro tips during tutorial matches</span>
        </span>
        <input
          className={styles.toggle}
          type="checkbox"
          checked={settings.tipsEnabled !== false}
          onChange={(event) => save({ tipsEnabled: event.target.checked })}
        />
      </label>

      <label className={styles.row}>
        <span className={styles.rowLabel}>
          <strong>How to Play button</strong>
          <span>Show controls guide on the menu</span>
        </span>
        <input
          className={styles.toggle}
          type="checkbox"
          checked={settings.showHowToPlayButton !== false}
          onChange={(event) => save({ showHowToPlayButton: event.target.checked })}
        />
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.btnGhost} onClick={clearMutes}>
          Clear tip mutes (this device)
        </button>
      </div>

      {status ? <div className={styles.status}>{status}</div> : null}
    </div>
  );
}
