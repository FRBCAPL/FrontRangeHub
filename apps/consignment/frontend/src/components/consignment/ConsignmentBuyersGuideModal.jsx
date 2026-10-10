import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BUYERS_GUIDE_FOOTER,
  BUYERS_GUIDE_INTRO,
  BUYERS_GUIDE_SECTIONS,
  BUYERS_GUIDE_TITLE,
} from '../../data/consignmentBuyersGuide.js';
import useHowItWorksValues from '../../hooks/useHowItWorksValues.js';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';
import './consignment-how.css';

export default function ConsignmentBuyersGuideModal({ onClose }) {
  const [tab, setTab] = useState(BUYERS_GUIDE_SECTIONS[0].id);
  const bodyRef = useRef(null);
  const fill = useHowItWorksValues();
  const current = BUYERS_GUIDE_SECTIONS.find((s) => s.id === tab) || BUYERS_GUIDE_SECTIONS[0];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [tab]);

  return createPortal(
    <div className="cs-portal">
      <div className="cs-modal cs-hw-overlay" role="dialog" aria-modal="true" aria-labelledby="cs-guide-title" onClick={onClose}>
        <div className="cs-hw" onClick={(e) => e.stopPropagation()}>
          <header className="cs-hw-head">
            <div>
              <p className="cs-hw-kicker">FRPL Consignment</p>
              <h2 id="cs-guide-title">{BUYERS_GUIDE_TITLE}</h2>
            </div>
            <button type="button" className="cs-hw-close" onClick={onClose} aria-label="Close">×</button>
          </header>

          <p className="cs-hw-sub">{fill(BUYERS_GUIDE_INTRO)}</p>

          <div className="cs-hw-tabs cs-hw-tabs--4" role="tablist">
            {BUYERS_GUIDE_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === tab}
                className={s.id === tab ? 'active' : ''}
                onClick={() => setTab(s.id)}
              >
                <span aria-hidden="true">{s.icon}</span> {s.label}
              </button>
            ))}
          </div>

          <div className="cs-hw-body" ref={bodyRef} role="tabpanel" aria-label={current.title}>
            <ol className="cs-hw-steps">
              {current.lines.map((line, i) => (
                <li key={line.text} className="cs-hw-step">
                  <span className="cs-hw-icon" aria-hidden="true">{line.icon}</span>
                  <div className="cs-hw-step-body">
                    <h3>
                      {current.numbered ? <span className="cs-hw-num">{i + 1}</span> : null}
                      {line.title}
                    </h3>
                    <p>{fill(line.text)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <footer className="cs-hw-foot">
            <p>💬 {fill(BUYERS_GUIDE_FOOTER)}</p>
            <div className="cs-hw-foot-actions">
              <ConsignmentContactButton topic="buying">Message FRPL</ConsignmentContactButton>
              <button type="button" className="cs-btn" onClick={onClose}>Got it</button>
            </div>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
