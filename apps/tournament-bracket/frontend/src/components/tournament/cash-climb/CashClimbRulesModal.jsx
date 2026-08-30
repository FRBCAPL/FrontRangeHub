import React, { useState } from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { cashClimbPlayerRules } from './cashClimbPlayerRules.js';
import { cashClimbNewPlayerGuide } from './cashClimbNewPlayerGuide.js';
import CashClimbRulesSections from './CashClimbRulesSections.jsx';
import './CashClimbRulesModal.css';

export default function CashClimbRulesModal({ tournament, onClose, initialView = 'tonight' }) {
  const [view, setView] = useState(initialView);
  const tonight = cashClimbPlayerRules(tournament);
  const guide = cashClimbNewPlayerGuide();
  const isTonight = view === 'tonight';

  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cc-rules-title">
      <div className="cc-modal cc-rules-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cc-rules-head">
          <p className="cc-play-kicker">Cash Climb</p>
          <h3 id="cc-rules-title">{isTonight ? 'Player rules' : guide.title}</h3>
          <div className="cc-rules-tabs" role="tablist" aria-label="Rules version">
            <button
              type="button"
              role="tab"
              aria-selected={isTonight}
              className={isTonight ? 'is-on' : ''}
              onClick={() => setView('tonight')}
            >
              Tonight
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isTonight}
              className={!isTonight ? 'is-on' : ''}
              onClick={() => setView('guide')}
            >
              New players
            </button>
          </div>
          <p className="cc-modal-meta">
            {isTonight
              ? `${tonight.gameType}${tonight.entryFee ? ` • ${formatMoney(tonight.entryFee)} entry` : ''} • ${tonight.eventRaces}`
              : guide.subtitle}
          </p>
        </header>
        <div className="cc-rules-body">
          <CashClimbRulesSections sections={isTonight ? tonight.sections : guide.sections} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
