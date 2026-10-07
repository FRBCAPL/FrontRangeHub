import React, { useEffect, useState } from 'react';
import { HOW_IT_WORKS_FOOTER, HOW_IT_WORKS_TABS, stepText } from '../../data/consignmentHowItWorks.js';
import useHowItWorksValues from '../../hooks/useHowItWorksValues.js';

export default function ConsignmentHowItWorksModal({ initialTab = 'buying', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const fill = useHowItWorksValues();
  const current = HOW_IT_WORKS_TABS.find((t) => t.id === tab) || HOW_IT_WORKS_TABS[0];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-how-title" onClick={onClose}>
      <div className="cs-modal-card cs-how" onClick={(e) => e.stopPropagation()}>
        <div className="cs-how-head">
          <h2 id="cs-how-title">How FRPL Consignment works</h2>
          <button type="button" className="cs-how-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="cs-tabs" role="tablist">
          {HOW_IT_WORKS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              className={t.id === tab ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="cs-how-intro">{fill(current.intro)}</p>
        <ol className="cs-how-steps">
          {current.steps.map(stepText).map((step) => <li key={step}>{fill(step)}</li>)}
        </ol>
        {current.example ? (
          <div className="cs-how-example">
            <strong>{fill(current.exampleTitle)}</strong>
            <ul>
              {current.example.map((line) => <li key={line}>{fill(line)}</li>)}
            </ul>
          </div>
        ) : null}
        <p className="cs-hint">{fill(HOW_IT_WORKS_FOOTER)}</p>
        <div className="cs-actions">
          <button type="button" className="cs-btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
