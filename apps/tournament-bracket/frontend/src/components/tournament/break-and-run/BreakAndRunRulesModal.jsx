import React from 'react';
import {
  USAPL_BREAK_AND_RUN_EXAMPLE,
  USAPL_BREAK_AND_RUN_RULES,
  USAPL_BREAK_AND_RUN_TAGLINE,
} from './breakAndRunRules.js';
import {
  CALLED_BREAK_AND_RUN_FOOTER,
  CALLED_BREAK_AND_RUN_RULES,
  CALLED_RULES_TAGLINE,
} from './breakAndRunCalledRules.js';
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

/**
 * Full player rules — same content for operator “Player rules” and public TV/phone “Full rules”.
 * Older pots still on flat per-ball payouts show the rules they were opened under.
 */
export default function BreakAndRunRulesModal({ onClose, payoutMode = 'called-ball' }) {
  const flat = payoutMode === 'flat';
  const rules = flat ? USAPL_BREAK_AND_RUN_RULES : CALLED_BREAK_AND_RUN_RULES;
  const tagline = flat ? USAPL_BREAK_AND_RUN_TAGLINE : CALLED_RULES_TAGLINE;
  const footer = flat ? USAPL_BREAK_AND_RUN_EXAMPLE : CALLED_BREAK_AND_RUN_FOOTER;
  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="bnr-rules-title">
      <div className="cc-modal cc-edit-modal bnr-rules-modal" onClick={(e) => e.stopPropagation()}>
        <header className="bnr-rules-head">
          <BreakAndRunLogo size="header" className="bnr-rules-logo" />
          <h3 id="bnr-rules-title" className="bnr-rules-sr-only">Front Range Pool League Break & Run Pot</h3>
          <p className="cc-modal-meta"><Lines text={tagline} /></p>
        </header>
        <div className="bnr-rules-body">
          <ol className="bnr-rules-list">
            {rules.map((rule, index) => (
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
          <p className="cc-setup-note"><Lines text={footer} /></p>
        </div>
        <div className="form-actions bnr-rules-actions">
          <button type="button" className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
