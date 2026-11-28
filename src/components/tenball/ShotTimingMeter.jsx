import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { timingErrorFromOffset, timingMeterParams } from './shotTimingDifficulty';
import styles from './ShotTimingMeter.module.css';

/**
 * Oscillating hit-accuracy meter. Position is -1 (left) … 0 (center) … 1 (right).
 * Speed + sweet zone scale with power/spin (and later skillLevel).
 * Commit on pointer/click/Space/Enter, Escape cancels, or via ref.commit() (Shoot button).
 */
const ShotTimingMeter = forwardRef(function ShotTimingMeter({
  onCommit,
  onCancel,
  power = 0.5,
  english = 0,
  skillLevel = 1
}, ref) {
  const params = useMemo(
    () => timingMeterParams({ power, english, skillLevel }),
    [power, english, skillLevel]
  );
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const posRef = useRef(0);
  const [pos, setPos] = useState(0);
  const doneRef = useRef(false);
  const onCommitRef = useRef(onCommit);
  const onCancelRef = useRef(onCancel);
  onCommitRef.current = onCommit;
  onCancelRef.current = onCancel;

  useEffect(() => {
    doneRef.current = false;
    const start = performance.now();
    let frame = 0;
    const tick = (now) => {
      const t = (now - start) / 1000;
      const { hz } = paramsRef.current;
      const next = Math.sin(t * hz * Math.PI * 2);
      posRef.current = next;
      setPos(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const finish = (raw) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const { sweetHalf } = paramsRef.current;
    onCommitRef.current?.(timingErrorFromOffset(raw, sweetHalf));
  };

  useImperativeHandle(ref, () => ({
    commit: () => finish(posRef.current),
    cancel: () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onCancelRef.current?.();
    }
  }), []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (doneRef.current) return;
        doneRef.current = true;
        onCancelRef.current?.();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        finish(posRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    finish(posRef.current);
  };

  const cancel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (doneRef.current) return;
    doneRef.current = true;
    onCancelRef.current?.();
  };

  const markerLeft = `${((pos + 1) / 2) * 100}%`;
  const sweetWidth = `${params.sweetHalf * 100}%`;
  const inSweet = Math.abs(pos) <= params.sweetHalf;
  const demandLabel = params.difficulty < 0.33
    ? 'Soft stroke'
    : params.difficulty < 0.66
      ? 'Medium stroke'
      : 'Hard stroke';

  return createPortal(
    <div className={styles.wrap} role="dialog" aria-label="Hit timing">
      <div className={styles.card}>
        <p className={styles.title}>Time your hit</p>
        <p className={styles.hint}>
          Tap when the marker is in the green zone
          <span className={styles.demand}> · {demandLabel}</span>
        </p>
        <button
          type="button"
          className={styles.track}
          onPointerDown={commit}
          aria-label="Strike now"
        >
          <span
            className={styles.sweet}
            style={{ width: sweetWidth }}
            aria-hidden
          >
            <span className={styles.perfectMark} title="Perfect" aria-hidden />
          </span>
          <span
            className={`${styles.marker}${inSweet ? ` ${styles.markerSweet}` : ''}`}
            style={{ left: markerLeft }}
            aria-hidden
          />
        </button>
        <div className={styles.actions}>
          <button type="button" className={styles.strike} onPointerDown={commit}>
            Strike
          </button>
          <button type="button" className={styles.cancel} onPointerDown={cancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default ShotTimingMeter;
