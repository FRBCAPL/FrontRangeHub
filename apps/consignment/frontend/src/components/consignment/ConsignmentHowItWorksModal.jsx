import React, { useEffect, useRef, useState } from 'react';
import { HOW_IT_WORKS_FOOTER, HOW_IT_WORKS_TABS } from '../../data/consignmentHowItWorks.js';
import useHowItWorksValues from '../../hooks/useHowItWorksValues.js';
import './consignment-how.css';

const asStep = (step) => (typeof step === 'string' ? { text: step } : step);

export default function ConsignmentHowItWorksModal({ initialTab = 'buying', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const bodyRef = useRef(null);
  const fill = useHowItWorksValues();
  const current = HOW_IT_WORKS_TABS.find((t) => t.id === tab) || HOW_IT_WORKS_TABS[0];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [tab]);

  let number = 0;

  return (
    <div className="cs-modal cs-hw-overlay" role="dialog" aria-modal="true" aria-labelledby="cs-how-title" onClick={onClose}>
      <div className="cs-hw" onClick={(e) => e.stopPropagation()}>
        <header className="cs-hw-head">
          <div>
            <p className="cs-hw-kicker">FRPL Consignment</p>
            <h2 id="cs-how-title">How it works</h2>
          </div>
          <button type="button" className="cs-hw-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="cs-hw-tabs" role="tablist">
          {HOW_IT_WORKS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              className={t.id === tab ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="cs-hw-body" ref={bodyRef} role="tabpanel">
          <p className="cs-hw-intro">{fill(current.intro)}</p>
          <ol className="cs-hw-steps">
            {current.steps.map(asStep).map((step) => {
              number += 1;
              return (
                <React.Fragment key={step.text}>
                  {step.group ? <li className="cs-hw-group" aria-hidden="true">{step.group}</li> : null}
                  <li className="cs-hw-step">
                    <span className="cs-hw-icon" aria-hidden="true">{step.icon || number}</span>
                    <div className="cs-hw-step-body">
                      {step.title ? (
                        <h3><span className="cs-hw-num">{number}</span>{step.title}</h3>
                      ) : null}
                      <p>{fill(step.text)}</p>
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
          {current.example ? (
            <div className="cs-how-example">
              <strong>{fill(current.exampleTitle)}</strong>
              <ul>
                {current.example.map((line) => <li key={line}>{fill(line)}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        <footer className="cs-hw-foot">
          <p>💬 {fill(HOW_IT_WORKS_FOOTER)}</p>
          <button type="button" className="cs-btn" onClick={onClose}>Got it</button>
        </footer>
      </div>
    </div>
  );
}
