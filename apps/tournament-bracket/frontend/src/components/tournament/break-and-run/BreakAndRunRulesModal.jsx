import React from 'react';
import {
  USAPL_BREAK_AND_RUN_OPERATOR_EXAMPLE,
  USAPL_BREAK_AND_RUN_RULES,
  USAPL_BREAK_AND_RUN_TAGLINE,
} from './breakAndRunRules.js';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import './BreakAndRun.css';

function Lines({ text }) {
  const lines = String(text || '').split(/\r?\n/);
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {i > 0 ? <br /> : null}
      {line}
    </React.Fragment>
  ));
}

/** Same full rules for operator “Player rules” and public TV/phone “Full rules”. */
export default function BreakAndRunRulesModal({ onClose }) {
  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="bnr-rules-title">
      <div className="cc-modal cc-edit-modal bnr-rules-modal" onClick={(e) => e.stopPropagation()}>
        <header className="bnr-rules-head">
          <BreakAndRunLogo size="header" className="bnr-rules-logo" />
          <h3 id="bnr-rules-title" className="bnr-rules-sr-only">Front Range Pool League Break & Run Pot</h3>
          <p className="cc-modal-meta"><Lines text={USAPL_BREAK_AND_RUN_TAGLINE} /></p>
        </header>
        <div className="bnr-rules-body">
          <ol className="bnr-rules-list">
            {USAPL_BREAK_AND_RUN_RULES.map((rule, index) => (
              <li key={rule.title}>
                <div className="bnr-rules-item-head">
                  <span className="bnr-rules-num" aria-hidden="true">{index + 1}.</span>
                  <strong className="bnr-rules-item-title">{rule.title}</strong>
                </div>
                <div className="bnr-rules-item-body">
                  <Lines text={rule.body} />
                </div>
              </li>
            ))}
          </ol>
          <p className="cc-setup-note"><Lines text={USAPL_BREAK_AND_RUN_OPERATOR_EXAMPLE} /></p>
        </div>
        <div className="form-actions bnr-rules-actions">
          <button type="button" className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
