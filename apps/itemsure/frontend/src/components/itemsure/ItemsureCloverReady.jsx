import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useCloverReady from '../../hooks/useCloverReady.js';
import { cloverReadyHiddenKey } from '../../utils/itemsureCloverReady.js';

function readHidden(orgId) {
  try {
    return window.localStorage.getItem(cloverReadyHiddenKey(orgId)) === '1';
  } catch {
    return false;
  }
}

function writeHidden(orgId) {
  try {
    window.localStorage.setItem(cloverReadyHiddenKey(orgId), '1');
  } catch {
    /* private browsing */
  }
}

/**
 * Home checklist: get to the first trusted Sales vs counts, with a confidence meter.
 * Shown to people who can manage Clover + items. Hides when finished or dismissed.
 */
export default function ItemsureCloverReady({ organizationId, enabled }) {
  const [hidden, setHidden] = useState(() => (organizationId ? readHidden(organizationId) : false));
  const { snapshot, error, loading } = useCloverReady(organizationId, { enabled: enabled && !hidden });

  if (!enabled || hidden) return null;
  if (loading) {
    return (
      <section className="isu-card isu-getting-started isu-clover-ready" aria-label="Clover readiness">
        <p className="isu-muted isu-small">Checking Clover readiness…</p>
      </section>
    );
  }
  if (error && !snapshot) {
    return (
      <section className="isu-card isu-getting-started isu-clover-ready" aria-label="Clover readiness">
        <p className="isu-muted isu-small">{error}</p>
      </section>
    );
  }
  if (!snapshot || snapshot.allDone) return null;

  const { steps, next, confidence, readyToCompare } = snapshot;

  const hide = () => {
    writeHidden(organizationId);
    setHidden(true);
  };

  return (
    <section className="isu-card isu-getting-started isu-clover-ready" aria-label="Path to Sales vs counts">
      <div className="isu-card-head">
        <h2>
          First trusted Sales vs counts{' '}
          <span className="isu-muted isu-small">({confidence}% ready)</span>
        </h2>
        <button type="button" className="isu-link isu-small" onClick={hide}>Hide</button>
      </div>

      <div
        className="isu-clover-ready-meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={confidence}
        aria-label="Confidence that Sales vs counts will be trustworthy"
      >
        <div className="isu-clover-ready-meter-fill" style={{ width: `${confidence}%` }} />
      </div>
      <p className="isu-muted isu-small isu-clover-ready-hint">
        {readyToCompare
          ? 'Setup looks ready — open the report and pick two counts.'
          : 'Follow the steps so Clover used amounts can be trusted beside your counts.'}
      </p>

      <ol className="isu-gs-steps">
        {steps.map((step, i) => {
          const isNext = next && step.id === next.id;
          const locked = Boolean(step.locked) && !step.done;
          return (
            <li
              key={step.id}
              className={`isu-gs-step${step.done ? ' is-done' : ''}${isNext ? ' is-next' : ''}${locked ? ' is-locked' : ''}`}
            >
              <span className="isu-gs-mark" aria-hidden="true">{step.done ? '\u2713' : i + 1}</span>
              <div className="isu-gs-text">
                <strong>{step.title}</strong>
                {step.done ? <span className="isu-sr-only"> (done)</span> : <p className="isu-muted isu-small">{step.body}</p>}
              </div>
              {!step.done && isNext && !locked ? (
                <Link to={step.to} className="isu-btn isu-btn--primary isu-btn--sm">{step.action}</Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
