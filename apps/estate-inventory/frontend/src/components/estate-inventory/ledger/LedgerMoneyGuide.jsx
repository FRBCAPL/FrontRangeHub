import React from 'react';
import {
  ESTATE_MONEY_GUIDE,
  markMoneyGuideSeen
} from '@shared/utils/estateMoneyGuide.js';

/**
 * Short Estate money tutorial — open from the modal Help control.
 */
const LedgerMoneyGuide = ({ onGoTo, onClose, firstVisit = false }) => {
  const content = ESTATE_MONEY_GUIDE;

  const dismiss = () => {
    markMoneyGuideSeen();
    onClose?.();
  };

  return (
    <section
      className={`ei-money-guide${firstVisit ? ' ei-money-guide--first' : ''}`}
      aria-labelledby="ei-money-guide-title"
    >
      <div className="ei-money-guide-head">
        <div>
          {firstVisit ? (
            <p className="ei-money-guide-eyebrow">Quick tour</p>
          ) : null}
          <h4 id="ei-money-guide-title">{content.title}</h4>
          <p className="ei-settings-hint" style={{ margin: '0.25rem 0 0' }}>
            {content.intro}
          </p>
        </div>
        <button type="button" className="ei-modal-close" onClick={dismiss} aria-label="Close guide" />
      </div>

      <ol className="ei-money-guide-list">
        {content.tips.map((tip, index) => (
          <li key={tip.id}>
            <div className="ei-money-guide-tip-main">
              <strong>
                <span className="ei-money-guide-num">{index + 1}</span>
                {tip.title}
              </strong>
              <p>{tip.body}</p>
            </div>
            {tip.tab && onGoTo ? (
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small"
                onClick={() => {
                  markMoneyGuideSeen();
                  onGoTo(tip.tab);
                }}
              >
                Open
              </button>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="ei-money-guide-foot">
        <p className="ei-settings-hint">{content.footer}</p>
        <button type="button" className="ei-btn ei-btn-small" onClick={dismiss}>
          {firstVisit ? 'Got it' : 'Close guide'}
        </button>
      </div>
    </section>
  );
};

export default LedgerMoneyGuide;
