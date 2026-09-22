import React from 'react';
import {
  USAPL_BREAK_AND_RUN_EXAMPLE,
  USAPL_BREAK_AND_RUN_OPERATOR_EXAMPLE,
  USAPL_BREAK_AND_RUN_PUBLIC_RULES,
  USAPL_BREAK_AND_RUN_RULES,
  USAPL_BREAK_AND_RUN_TAGLINE,
} from './breakAndRunRules.js';
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

export default function BreakAndRunRulesModal({ onClose, publicFacing = false }) {
  const rules = publicFacing ? USAPL_BREAK_AND_RUN_PUBLIC_RULES : USAPL_BREAK_AND_RUN_RULES;
  const example = publicFacing ? USAPL_BREAK_AND_RUN_EXAMPLE : USAPL_BREAK_AND_RUN_OPERATOR_EXAMPLE;

  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="bnr-rules-title">
      <div className="cc-modal cc-edit-modal bnr-rules-modal" onClick={(e) => e.stopPropagation()}>
        <header className="bnr-rules-head">
          <h3 id="bnr-rules-title">USAPL 10-Ball Break & Run</h3>
          <p className="cc-modal-meta"><Lines text={USAPL_BREAK_AND_RUN_TAGLINE} /></p>
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
          <p className="cc-setup-note"><Lines text={example} /></p>
        </div>
        <div className="form-actions bnr-rules-actions">
          <button type="button" className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
