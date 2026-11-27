import React, { useRef, useState } from 'react';
import TableDecisionCard from './TableDecisionCard';
import styles from './SimplePoolGame.module.css';

const SeatChoice = ({ name, vote, onChoose }) => (
  <div className={styles.playAgainSeat}>
    <strong>{name}</strong>
    {vote === null ? (
      <div className={styles.pushOutButtons}>
        <button
          type="button"
          className={styles.acceptButton}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            if (event.button > 0) return;
            onChoose(true);
          }}
        >
          Yes
        </button>
        <button
          type="button"
          className={styles.declineButton}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            if (event.button > 0) return;
            onChoose(false);
          }}
        >
          No
        </button>
      </div>
    ) : (
      <span className={vote ? styles.playAgainYes : styles.playAgainNo}>
        {vote ? 'Yes' : 'No'}
      </span>
    )}
  </div>
);

export default function PlayAgainPrompt({ playerOne, playerTwo, vsComputer, keepSessionScores = false, onDone }) {
  const [votes, setVotes] = useState({ 1: null, 2: null });
  const done = useRef(false);

  const choose = (seat, yes) => {
    if (done.current || votes[seat] !== null) return;
    const next = { ...votes, [seat]: yes };
    setVotes(next);
    const seats = vsComputer ? [1] : [1, 2];
    if (seats.every((id) => next[id] !== null)) {
      done.current = true;
      onDone(next);
    }
  };

  return (
    <TableDecisionCard>
      <h3>Another game?</h3>
      <p>
        {!vsComputer && 'Does each player want another game? '}
        {keepSessionScores ? 'Session score stays on the board.' : 'A new match starts fresh.'}
      </p>
      <SeatChoice name={playerOne} vote={votes[1]} onChoose={(yes) => choose(1, yes)} />
      {!vsComputer && (
        <SeatChoice name={playerTwo} vote={votes[2]} onChoose={(yes) => choose(2, yes)} />
      )}
    </TableDecisionCard>
  );
}
