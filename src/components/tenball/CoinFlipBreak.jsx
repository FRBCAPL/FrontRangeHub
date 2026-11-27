import React, { useRef, useState } from 'react';
import styles from './CoinFlipBreak.module.css';

const seatName = (seat, name1, name2, vsComputer) => {
  if (seat === 1) return name1?.trim() || 'Player 1';
  return vsComputer ? 'Computer' : (name2?.trim() || 'Player 2');
};

const CoinFlipBreak = ({ name1, name2, vsComputer, onDone }) => {
  const [phase, setPhase] = useState('call'); // call | flipping | choose | done
  const [call, setCall] = useState(null);
  const [result, setResult] = useState(null);
  const [flipWinner, setFlipWinner] = useState(null);
  const [spinClass, setSpinClass] = useState('');
  const finishedRef = useRef(false);
  const timersRef = useRef([]);

  const label1 = seatName(1, name1, name2, vsComputer);
  const label2 = seatName(2, name1, name2, vsComputer);

  const later = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const finish = (breaker) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase('done');
    // Start immediately — no delayed callback that can get stranded.
    onDone(breaker);
  };

  const flip = (chosen) => {
    if (phase !== 'call') return;
    setCall(chosen);
    setPhase('flipping');
    const land = Math.random() < 0.5 ? 'heads' : 'tails';
    setSpinClass(land === 'heads' ? styles.spinHeads : styles.spinTails);
    later(() => {
      setResult(land);
      const winner = land === chosen ? 1 : 2;
      setFlipWinner(winner);
      if (vsComputer && winner === 2) {
        const breaker = Math.random() < 0.75 ? 2 : 1;
        setPhase('choose');
        later(() => finish(breaker), 700);
        return;
      }
      setPhase('choose');
    }, 1200);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2>Coin flip</h2>
        <p className={styles.copy}>
          {phase === 'call' && `${label1} calls it — heads or tails. Winner chooses who breaks.`}
          {phase === 'flipping' && 'Flipping…'}
          {phase === 'choose' && flipWinner && !vsComputer && (
            <>{seatName(flipWinner, name1, name2, vsComputer)} won the toss.</>
          )}
          {phase === 'choose' && flipWinner === 1 && vsComputer && (
            <>{label1} won the toss — choose who breaks.</>
          )}
          {phase === 'choose' && flipWinner === 2 && vsComputer && (
            <>{label2} won the toss and is choosing…</>
          )}
          {phase === 'done' && 'Starting the match…'}
        </p>

        <div className={styles.coinStage}>
          <div className={`${styles.coin} ${spinClass}`}>
            <div className={`${styles.face} ${styles.heads}`}>H</div>
            <div className={`${styles.face} ${styles.tails}`}>T</div>
          </div>
          {result && phase !== 'flipping' && (
            <p className={styles.landed}>
              {result === 'heads' ? 'Heads' : 'Tails'}
              {call ? ` · ${label1} called ${call}` : ''}
            </p>
          )}
        </div>

        {phase === 'call' && (
          <div className={styles.actions}>
            <button type="button" className={styles.headsBtn} onClick={() => flip('heads')}>
              Heads
            </button>
            <button type="button" className={styles.tailsBtn} onClick={() => flip('tails')}>
              Tails
            </button>
          </div>
        )}

        {phase === 'choose' && flipWinner === 1 && (
          <div className={styles.actions}>
            <button type="button" className={styles.headsBtn} onClick={() => finish(1)}>
              {label1} breaks
            </button>
            <button type="button" className={styles.tailsBtn} onClick={() => finish(2)}>
              {label2} breaks
            </button>
          </div>
        )}

        {phase === 'choose' && flipWinner === 2 && !vsComputer && (
          <div className={styles.actions}>
            <button type="button" className={styles.headsBtn} onClick={() => finish(2)}>
              {label2} breaks
            </button>
            <button type="button" className={styles.tailsBtn} onClick={() => finish(1)}>
              {label1} breaks
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinFlipBreak;
