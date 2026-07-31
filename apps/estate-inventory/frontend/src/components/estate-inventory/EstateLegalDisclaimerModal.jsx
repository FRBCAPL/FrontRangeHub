import React from 'react';
import { createPortal } from 'react-dom';
import {
  ESTATE_LEGAL_DISCLAIMER,
  markLegalDisclaimerAcknowledged
} from '@shared/utils/estateLegalDisclaimer.js';

/**
 * Standalone legal / CYA disclaimer.
 * @param {boolean} required — when true, cannot dismiss until acknowledged (entry gate).
 */
const EstateLegalDisclaimerModal = ({
  open,
  onClose,
  required = false,
  onAcknowledge = null
}) => {
  if (!open) return null;

  const content = ESTATE_LEGAL_DISCLAIMER;

  const acknowledge = () => {
    markLegalDisclaimerAcknowledged();
    onAcknowledge?.();
    onClose?.();
  };

  const tryDismiss = () => {
    if (required) return;
    onClose?.();
  };

  const body = (
    <div
      className="ei-modal-backdrop"
      role="presentation"
      onClick={tryDismiss}
    >
      <div
        className="ei-modal ei-modal-settings ei-legal-disclaimer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-legal-disclaimer-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div>
            <p className="ei-legal-disclaimer-eyebrow">{content.eyebrow}</p>
            <h3 id="ei-legal-disclaimer-title">{content.title}</h3>
          </div>
          {required ? null : (
            <button
              type="button"
              className="ei-modal-close"
              onClick={tryDismiss}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        <div className="ei-modal-body ei-legal-disclaimer-body">
          {required ? (
            <p className="ei-legal-disclaimer-gate-note">
              Please read and acknowledge this disclaimer before signing in or creating an
              account.
            </p>
          ) : null}
          {content.introFirst ? (
            <p className="ei-legal-disclaimer-intro-first">{content.introFirst}</p>
          ) : null}
          <p className="ei-legal-disclaimer-lead">{content.intro}</p>
          {content.introHighlight ? (
            <p className="ei-legal-disclaimer-highlight">{content.introHighlight}</p>
          ) : null}

          {content.sections.map((section) => (
            <section key={section.heading} className="ei-legal-disclaimer-section">
              <h4>{section.heading}</h4>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <p className="ei-legal-disclaimer-footer">{content.footer}</p>
        </div>

        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn" onClick={acknowledge}>
            {required
              ? content.acknowledgeContinueLabel || content.acknowledgeLabel
              : content.acknowledgeLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(<div className="estate-inventory ei-modal-portal">{body}</div>, document.body);
  }
  return body;
};

export default EstateLegalDisclaimerModal;
