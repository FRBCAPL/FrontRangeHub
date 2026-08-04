import React, { useState } from 'react';
import { ESTATE_HOW_IT_WORKS } from '@shared/utils/estateHowItWorks.js';

/**
 * Compact PR Home orientation strip.
 * Collapsed by default (one row). Expand shows the 8-step map.
 * Always visible — not dismissible.
 */
const EstateHowItWorksPanel = ({
  onOpenWhatIsVault,
  onOpenFaq,
  onOpenSettingsSection,
  onSeeCollections,
  onOpenLedger,
  onOpenReports,
  onOpenClosing
}) => {
  const [expanded, setExpanded] = useState(false);
  const content = ESTATE_HOW_IT_WORKS;

  const runAction = (actionKey) => {
    switch (actionKey) {
      case 'settings_case':
        onOpenSettingsSection?.('case');
        break;
      case 'collections':
        onSeeCollections?.();
        break;
      case 'ledger':
        onOpenLedger?.('summary');
        break;
      case 'ledger_distributions':
        onOpenLedger?.('distributions');
        break;
      case 'reports':
        onOpenReports?.();
        break;
      case 'closing':
        onOpenClosing?.();
        break;
      default:
        break;
    }
  };

  return (
    <section
      className={`ei-how-it-works${expanded ? ' is-expanded' : ' is-collapsed'}`}
      aria-labelledby="ei-how-it-works-title"
    >
      <div className="ei-how-it-works-bar">
        <div className="ei-how-it-works-bar-text">
          <p className="ei-how-it-works-eyebrow">{content.eyebrow}</p>
          <h2 id="ei-how-it-works-title">{content.title}</h2>
          {!expanded ? (
            <p className="ei-how-it-works-thesis ei-how-it-works-thesis-short">
              You decide what the will requires. Estate Vault records property, money, decisions,
              and distributions.
            </p>
          ) : null}
        </div>
        <div className="ei-how-it-works-bar-actions">
          {onOpenWhatIsVault ? (
            <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={onOpenWhatIsVault}>
              {content.whatIsLabel}
            </button>
          ) : null}
          {onOpenFaq ? (
            <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={onOpenFaq}>
              {content.faqLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Hide workflow' : 'Show workflow'}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="ei-how-it-works-details">
          <p className="ei-how-it-works-thesis">{content.thesis}</p>
          <ol className="ei-how-it-works-steps">
            {content.steps.map((step) => (
              <li key={step.number} className="ei-how-it-works-step">
                <span className="ei-how-it-works-num" aria-hidden="true">
                  {step.number}
                </span>
                <div className="ei-how-it-works-step-body">
                  <span className="ei-how-it-works-step-title">{step.title}</span>
                  {step.actionKey ? (
                    <button
                      type="button"
                      className="ei-link-btn ei-how-it-works-step-link"
                      onClick={() => runAction(step.actionKey)}
                    >
                      {step.actionLabel}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          <p className="ei-how-it-works-footer">{content.footer}</p>
        </div>
      ) : null}
    </section>
  );
};

export default EstateHowItWorksPanel;
