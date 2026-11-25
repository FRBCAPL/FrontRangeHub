import React, { useState } from 'react';
import styles from './PlayerSetupModal.module.css';

const PlayerSetupModal = ({ initialNames, initialVsComputer, confirmLabel, onConfirm, onCancel }) => {
  const [names, setNames] = useState(initialNames);
  const [vsComputer, setVsComputer] = useState(initialVsComputer);

  const submit = (event) => {
    event.preventDefault();
    onConfirm({
      names: {
        1: names[1],
        2: vsComputer ? '' : names[2]
      },
      vsComputer
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <form className={styles.card} onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <h2>Who is playing?</h2>
        <label className={styles.field}>
          Player 1
          <input
            type="text"
            maxLength={20}
            autoFocus
            placeholder="Player 1"
            value={names[1]}
            onChange={(event) => setNames((prev) => ({ ...prev, 1: event.target.value }))}
          />
        </label>
        <div className={styles.choice}>
          <button
            type="button"
            className={vsComputer ? styles.choiceOn : styles.choiceOff}
            onClick={() => setVsComputer(true)}
          >
            Computer
          </button>
          <button
            type="button"
            className={!vsComputer ? styles.choiceOn : styles.choiceOff}
            onClick={() => setVsComputer(false)}
          >
            Another player
          </button>
        </div>
        {!vsComputer && (
          <label className={styles.field}>
            Player 2
            <input
              type="text"
              maxLength={20}
              placeholder="Player 2"
              value={names[2]}
              onChange={(event) => setNames((prev) => ({ ...prev, 2: event.target.value }))}
            />
          </label>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button type="submit" className={styles.confirm}>{confirmLabel}</button>
        </div>
      </form>
    </div>
  );
};

export default PlayerSetupModal;
