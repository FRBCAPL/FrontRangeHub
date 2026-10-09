import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BUYERS_GUIDE_FOOTER,
  BUYERS_GUIDE_INTRO,
  BUYERS_GUIDE_SECTIONS,
  BUYERS_GUIDE_TITLE,
} from '../../data/consignmentBuyersGuide.js';
import useHowItWorksValues from '../../hooks/useHowItWorksValues.js';
import ConsignmentContactButton from './ConsignmentContactButton.jsx';

export default function ConsignmentBuyersGuideModal({ onClose }) {
  const fill = useHowItWorksValues();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="cs-portal">
      <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-guide-title" onClick={onClose}>
        <div className="cs-modal-card cs-how cs-guide" onClick={(e) => e.stopPropagation()}>
          <div className="cs-how-head">
            <h2 id="cs-guide-title">{BUYERS_GUIDE_TITLE}</h2>
            <button type="button" className="cs-how-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <p className="cs-how-intro">{fill(BUYERS_GUIDE_INTRO)}</p>
          {BUYERS_GUIDE_SECTIONS.map((section) => (
            <section key={section.id} className="cs-guide-section">
              <h3><span aria-hidden="true">{section.icon}</span> {section.title}</h3>
              <ul>
                {section.lines.map((line) => <li key={line}>{fill(line)}</li>)}
              </ul>
            </section>
          ))}
          <p className="cs-hint">{fill(BUYERS_GUIDE_FOOTER)}</p>
          <div className="cs-actions">
            <ConsignmentContactButton topic="buying">Message FRPL</ConsignmentContactButton>
            <button type="button" className="cs-btn" onClick={onClose}>Got it</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
