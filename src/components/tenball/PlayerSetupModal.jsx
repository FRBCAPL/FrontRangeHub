import React, { useState } from 'react';
import styles from './PlayerSetupModal.module.css';
import { BEST_OF_LENGTHS, DEFAULT_MATCH, RACE_LENGTHS, customLength, gamesNeeded } from './matchFormat';

const capitalizeName = (value) => value.replace(/(^|\s)([a-z])/g, (_, space, letter) => space + letter.toUpperCase());

const PlayerSetupModal = ({
  initialNames,
  initialVsComputer,
  initialMatch,
  confirmLabel,
  title,
  onConfirm,
  onCancel,
  onCancelMatch
}) => {
  const starting = initialMatch || DEFAULT_MATCH;
  const [names, setNames] = useState(initialNames);
  const [vsComputer, setVsComputer] = useState(initialVsComputer);
  const [matchType, setMatchType] = useState(starting.type || 'single');
  const [raceTo, setRaceTo] = useState(starting.type === 'race' && RACE_LENGTHS.includes(starting.length) ? starting.length : 5);
  const [bestOf, setBestOf] = useState(starting.type === 'bestof' && BEST_OF_LENGTHS.includes(starting.length) ? starting.length : 5);
  const [raceOther, setRaceOther] = useState(starting.type === 'race' && !RACE_LENGTHS.includes(starting.length));
  const [bestOther, setBestOther] = useState(starting.type === 'bestof' && !BEST_OF_LENGTHS.includes(starting.length));
  const [raceCustom, setRaceCustom] = useState(starting.type === 'race' && !RACE_LENGTHS.includes(starting.length) ? String(starting.length) : '');
  const [bestCustom, setBestCustom] = useState(starting.type === 'bestof' && !BEST_OF_LENGTHS.includes(starting.length) ? String(starting.length) : '');

  const raceLength = raceOther ? customLength(raceCustom, { min: 2, max: 99 }) : raceTo;
  const bestLength = bestOther ? customLength(bestCustom, { min: 3, max: 99, odd: true }) : bestOf;
  const customInvalid = (matchType === 'race' && raceOther && !raceLength)
    || (matchType === 'bestof' && bestOther && !bestLength);

  const match = matchType === 'race'
    ? { type: 'race', length: raceLength || 2 }
    : matchType === 'bestof'
      ? { type: 'bestof', length: bestLength || 3 }
      : { type: 'single', length: 1 };

  const hint = matchType === 'single'
    ? 'One game, then the match is over.'
    : customInvalid
      ? matchType === 'race'
        ? 'Enter a race from 2 to 99.'
        : 'Enter an odd number from 3 to 99.'
      : `First to ${gamesNeeded(match)} games.`;

  const submit = (event) => {
    event.preventDefault();
    if (customInvalid) return;
    onConfirm({
      names: {
        1: names[1],
        2: vsComputer ? '' : names[2]
      },
      vsComputer,
      match
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <form className={styles.card} onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <h2>{title || 'New match'}</h2>
        <label className={styles.field}>
          Player 1
          <input
            type="text"
            maxLength={20}
            autoFocus
            placeholder="Player 1"
            value={names[1]}
            onChange={(event) => setNames((prev) => ({ ...prev, 1: capitalizeName(event.target.value) }))}
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
              onChange={(event) => setNames((prev) => ({ ...prev, 2: capitalizeName(event.target.value) }))}
            />
          </label>
        )}
        <div className={styles.groupLabel}>Match</div>
        <div className={styles.choice}>
          <button
            type="button"
            className={matchType === 'single' ? styles.choiceOn : styles.choiceOff}
            onClick={() => setMatchType('single')}
          >
            Single game
          </button>
          <button
            type="button"
            className={matchType === 'race' ? styles.choiceOn : styles.choiceOff}
            onClick={() => setMatchType('race')}
          >
            Race
          </button>
          <button
            type="button"
            className={matchType === 'bestof' ? styles.choiceOn : styles.choiceOff}
            onClick={() => setMatchType('bestof')}
          >
            Best of
          </button>
        </div>
        {matchType === 'race' && (
          <div className={styles.lengths} aria-label="Race to">
            {RACE_LENGTHS.map((length) => (
              <button
                key={length}
                type="button"
                className={!raceOther && raceTo === length ? styles.lengthOn : styles.lengthOff}
                onClick={() => {
                  setRaceOther(false);
                  setRaceTo(length);
                }}
              >
                {length}
              </button>
            ))}
            <button
              type="button"
              className={raceOther ? styles.lengthOn : styles.lengthOff}
              onClick={() => setRaceOther(true)}
            >
              Other
            </button>
            {raceOther && (
              <input
                className={styles.otherLength}
                type="number"
                min="2"
                max="99"
                inputMode="numeric"
                placeholder="11"
                aria-label="Race to"
                value={raceCustom}
                onChange={(event) => setRaceCustom(event.target.value)}
              />
            )}
          </div>
        )}
        {matchType === 'bestof' && (
          <div className={styles.lengths} aria-label="Best of">
            {BEST_OF_LENGTHS.map((length) => (
              <button
                key={length}
                type="button"
                className={!bestOther && bestOf === length ? styles.lengthOn : styles.lengthOff}
                onClick={() => {
                  setBestOther(false);
                  setBestOf(length);
                }}
              >
                {length}
              </button>
            ))}
            <button
              type="button"
              className={bestOther ? styles.lengthOn : styles.lengthOff}
              onClick={() => setBestOther(true)}
            >
              Other
            </button>
            {bestOther && (
              <input
                className={styles.otherLength}
                type="number"
                min="3"
                max="99"
                step="2"
                inputMode="numeric"
                placeholder="11"
                aria-label="Best of"
                value={bestCustom}
                onChange={(event) => setBestCustom(event.target.value)}
              />
            )}
          </div>
        )}
        <p className={styles.hint}>{hint}</p>
        {confirmLabel === 'Save' && (
          <p className={styles.hint}>Games already won stay on the board.</p>
        )}
        <div className={styles.actions}>
          {onCancelMatch && (
            <button type="button" className={styles.cancelMatch} onClick={onCancelMatch}>
              Cancel match
            </button>
          )}
          <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button type="submit" className={styles.confirm}>{confirmLabel}</button>
        </div>
      </form>
    </div>
  );
};

export default PlayerSetupModal;
