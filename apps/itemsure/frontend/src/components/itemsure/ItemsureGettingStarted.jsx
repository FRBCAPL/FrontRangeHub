import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site } from '../../data/itemsureTerms.js';

const hiddenKey = (orgId) => `itemsure.gettingStarted.hidden.${orgId}`;

function readHidden(orgId) {
  try {
    return window.localStorage.getItem(hiddenKey(orgId)) === '1';
  } catch {
    return false;
  }
}

function writeHidden(orgId) {
  try {
    window.localStorage.setItem(hiddenKey(orgId), '1');
  } catch {
    /* private browsing: the choice just isn't remembered */
  }
}

/** First-run steps for a new business. Disappears once every step is done, or when hidden. */
export default function ItemsureGettingStarted({ organizationId, counts, progress }) {
  const [hidden, setHidden] = useState(() => readHidden(organizationId));
  if (hidden || !counts || !progress) return null;

  const steps = [
    {
      done: counts.locations > 0,
      title: `Add a ${site}`,
      body: 'Where you keep stock, like a bar, a store, a warehouse, or a van.',
      to: `${ITEMSURE_PATH}/locations`,
      action: `Add ${site}`,
    },
    {
      done: counts.items > 0,
      title: 'Add your items',
      body: 'Each thing you stock, and what you count it in (each, bottle, kg…).',
      to: `${ITEMSURE_PATH}/items`,
      action: 'Add items',
    },
    {
      done: Boolean(progress.amounts),
      title: 'Say how many you have',
      body: 'Open an item and choose "Set starting amount".',
      to: `${ITEMSURE_PATH}/items?category=all`,
      action: 'Open inventory',
    },
    {
      done: Boolean(progress.levels),
      title: 'Choose when to warn you',
      body: 'Tap an item to open it, then choose "Set levels". ItemSure then tells you what is running low.',
      to: `${ITEMSURE_PATH}/items?category=all`,
      action: 'Set levels',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const next = steps.findIndex((s) => !s.done);

  const hide = () => {
    writeHidden(organizationId);
    setHidden(true);
  };

  return (
    <section className="isu-card isu-getting-started" aria-label="Getting started">
      <div className="isu-card-head">
        <h2>Getting started <span className="isu-muted isu-small">({doneCount} of {steps.length} done)</span></h2>
        <button type="button" className="isu-link isu-small" onClick={hide}>Hide</button>
      </div>
      <ol className="isu-gs-steps">
        {steps.map((step, i) => (
          <li key={step.title} className={`isu-gs-step${step.done ? ' is-done' : ''}${i === next ? ' is-next' : ''}`}>
            <span className="isu-gs-mark" aria-hidden="true">{step.done ? '\u2713' : i + 1}</span>
            <div className="isu-gs-text">
              <strong>{step.title}</strong>
              {step.done ? <span className="isu-sr-only"> (done)</span> : <p className="isu-muted isu-small">{step.body}</p>}
            </div>
            {!step.done && i === next ? (
              <Link to={step.to} className="isu-btn isu-btn--primary isu-btn--sm">{step.action}</Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
