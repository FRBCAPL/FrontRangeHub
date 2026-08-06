import React, { useEffect } from 'react';

const HeirFamilyCoachMarks = ({
  open,
  stepIndex,
  steps = [],
  onStepChange,
  onSkip,
  onDone,
  helloName = ''
}) => {
  const list = Array.isArray(steps) && steps.length ? steps : [];
  const step = list[stepIndex] || list[0];
  const isLast = stepIndex >= list.length - 1;
  const isFirst = stepIndex <= 0;
  const displayName = String(helloName || '').trim();
  const kicker =
    step?.helloName && displayName ? `Hello, ${displayName}` : step?.kicker;

  useEffect(() => {
    if (!open || !step?.targetId) return undefined;
    const el = document.getElementById(step.targetId);
    if (!el) return undefined;
    el.classList.add('is-coach-spotlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return () => {
      el.classList.remove('is-coach-spotlight');
    };
  }, [open, step?.targetId, stepIndex]);

  useEffect(() => {
    if (!open || !list.length) return undefined;
    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onSkip?.();
      } else if (ev.key === 'ArrowRight' || ev.key === 'Enter') {
        ev.preventDefault();
        if (isLast) onDone?.();
        else onStepChange?.(stepIndex + 1);
      } else if (ev.key === 'ArrowLeft' && !isFirst) {
        ev.preventDefault();
        onStepChange?.(stepIndex - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, stepIndex, isFirst, isLast, onSkip, onDone, onStepChange, list.length]);

  if (!open || !step || !list.length) return null;

  return (
    <div className="ei-family-coach" role="presentation">
      <div className="ei-family-coach-scrim" aria-hidden="true" onClick={onSkip} />
      <div
        className="ei-family-coach-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-family-coach-title"
      >
        <p
          className={`ei-family-coach-kicker${
            step?.helloName && displayName ? ' ei-family-coach-kicker--hello' : ''
          }`}
        >
          {kicker}
          <span className="ei-family-coach-progress">
            {stepIndex + 1} / {list.length}
          </span>
        </p>
        <h3 id="ei-family-coach-title" className="ei-family-coach-title">
          {step.title}
        </h3>
        <p className="ei-family-coach-body">{step.body}</p>
        <div className="ei-family-coach-actions">
          <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={onSkip}>
            Skip
          </button>
          <div className="ei-family-coach-nav">
            {!isFirst ? (
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small"
                onClick={() => onStepChange?.(stepIndex - 1)}
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              className="ei-btn ei-btn-small"
              onClick={() => (isLast ? onDone?.() : onStepChange?.(stepIndex + 1))}
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeirFamilyCoachMarks;
