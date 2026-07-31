import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ESTATE_WHAT_IS_VAULT } from '@shared/utils/estateWhatIsVault.js';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';

const STEP_COUNT = 3;

/** Clear padlock mark for the What is header (not the faint brand watermark). */
function WhatIsPadlockIcon() {
  return (
    <svg
      className="ei-what-is-padlock"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6zm4.5 9.5a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5z"
      />
    </svg>
  );
}

/**
 * Three-step product framing:
 * 1) Welcome — plain thesis (you decide; Vault records)
 * 2) Boundaries — what it is not; docs optional
 * 3) Journey — eight-step administration workflow
 */
const EstateWhatIsVaultModal = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const content = ESTATE_WHAT_IS_VAULT;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const welcome = content.welcome;
  const boundaries = content.boundaries;
  const journey = content.journey;

  const titles = [welcome.title, boundaries.title, journey.title];
  const eyebrows = [welcome.eyebrow, boundaries.eyebrow, journey.eyebrow];
  const titleId = 'ei-what-is-vault-title';

  const close = () => {
    setStep(0);
    onClose?.();
  };

  const body = (
    <div className="ei-modal-backdrop" role="presentation" onClick={close}>
      <div
        className="ei-modal ei-modal-settings ei-what-is-vault-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head ei-what-is-head">
          <button type="button" className="ei-modal-close" onClick={close} aria-label="Close">
            ×
          </button>
          <div className="ei-what-is-brand">
            <span className="ei-what-is-lock-wrap" aria-hidden="true">
              <WhatIsPadlockIcon />
            </span>
            <div className="ei-what-is-brand-text">
              <p className="ei-what-is-eyebrow">{eyebrows[step]}</p>
              <h3 id={titleId}>{titles[step]}</h3>
              {step === 0 ? (
                <p className="ei-what-is-subtitle">{welcome.subtitle}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="ei-modal-body ei-what-is-body">
          {step === 0 ? (
            <>
              <p className="ei-what-is-lead">{welcome.intro}</p>

              <div className="ei-what-is-pillars" role="list">
                {welcome.pillars.map((pillar) => (
                  <article key={pillar.key} className="ei-what-is-pillar" role="listitem">
                    <h4>{pillar.title}</h4>
                    <p>{pillar.body}</p>
                  </article>
                ))}
              </div>

              <h4 className="ei-what-is-cap-heading">{welcome.capabilitiesHeading}</h4>
              <ul className="ei-what-is-caps">
                {welcome.capabilities.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {welcome.recordNote ? (
                <p className="ei-what-is-footer" style={{ marginTop: '0.85rem' }}>
                  {welcome.recordNote}
                </p>
              ) : null}
            </>
          ) : null}

          {step === 1 ? (
            <>
              <p className="ei-what-is-lead">{boundaries.intro}</p>

              <h4 className="ei-what-is-cap-heading">{boundaries.replacesHeading}</h4>
              <ul className="ei-what-is-caps ei-what-is-caps--boundaries">
                {boundaries.doesNotReplace.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <ul className="ei-what-is-notes">
                {boundaries.extraNotes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <p className="ei-what-is-footer">{boundaries.footer}</p>
              <p className="ei-what-is-legal-link">
                <button
                  type="button"
                  className="ei-link-btn"
                  onClick={() => setShowLegalDisclaimer(true)}
                >
                  Legal disclaimer
                </button>
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="ei-what-is-lead">{journey.intro}</p>

              <ol className="ei-what-is-journey">
                {journey.steps.map((item, index) => (
                  <li key={item.title} className="ei-what-is-journey-step">
                    <span className="ei-what-is-journey-num" aria-hidden="true">
                      {item.number}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </div>
                    {index < journey.steps.length - 1 ? (
                      <span className="ei-what-is-journey-arrow" aria-hidden="true">
                        ↓
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>

              <p className="ei-what-is-footer">{journey.nextHint}</p>
            </>
          ) : null}
        </div>

        <div className="ei-modal-foot ei-btn-row ei-what-is-foot">
          <div className="ei-what-is-steps" aria-label={`Step ${step + 1} of ${STEP_COUNT}`}>
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span key={i} className={i === step ? 'is-active' : ''} />
            ))}
          </div>
          {step > 0 ? (
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={() => setStep((n) => Math.max(0, n - 1))}
            >
              {step === 1 ? boundaries.backLabel : journey.backLabel}
            </button>
          ) : null}
          {step < STEP_COUNT - 1 ? (
            <button type="button" className="ei-btn" onClick={() => setStep((n) => n + 1)}>
              {step === 0 ? welcome.continueLabel : boundaries.continueLabel}
            </button>
          ) : (
            <button type="button" className="ei-btn" onClick={close}>
              {journey.doneLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const modal = (
    <>
      {body}
      <EstateLegalDisclaimerModal
        open={showLegalDisclaimer}
        onClose={() => setShowLegalDisclaimer(false)}
      />
    </>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(
      <div className="estate-inventory ei-modal-portal">{modal}</div>,
      document.body
    );
  }
  return modal;
};

export default EstateWhatIsVaultModal;
