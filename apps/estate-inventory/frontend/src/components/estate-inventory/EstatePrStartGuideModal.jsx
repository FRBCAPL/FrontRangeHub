import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ESTATE_PR_START_GUIDE } from '@shared/utils/estatePrStartGuide.js';
import { ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import EstateBrandLogo from './EstateBrandLogo';

const STEP_COUNT = 3;

/**
 * Landing PR orientation — three steps, then navigate to PR sign-in.
 */
const EstatePrStartGuideModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const content = ESTATE_PR_START_GUIDE;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const role = content.role;
  const firstSteps = content.firstSteps;
  const ready = content.ready;

  const titles = [role.title, firstSteps.title, ready.title];
  const eyebrows = [role.eyebrow, firstSteps.eyebrow, ready.eyebrow];
  const titleId = 'ei-pr-start-guide-title';

  const close = () => {
    setStep(0);
    onClose?.();
  };

  const goSignIn = () => {
    close();
    navigate(`${ESTATEIT_PATH}/owner`);
  };

  const body = (
    <div className="ei-modal-backdrop" role="presentation" onClick={close}>
      <div
        className="ei-modal ei-modal-settings ei-what-is-vault-modal ei-pr-start-guide-modal"
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
            <EstateBrandLogo variant="icon" className="ei-what-is-brand-logo" alt="" />
            <div className="ei-what-is-brand-text">
              <p className="ei-what-is-eyebrow">{eyebrows[step]}</p>
              <h3 id={titleId}>{titles[step]}</h3>
            </div>
          </div>
        </div>

        <div className="ei-modal-body ei-what-is-body">
          {step === 0 ? (
            <>
              <p className="ei-what-is-lead">{role.intro}</p>
              <div className="ei-what-is-pillars" role="list">
                {role.points.map((point) => (
                  <article key={point.title} className="ei-what-is-pillar" role="listitem">
                    <h4>{point.title}</h4>
                    <p>{point.body}</p>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <p className="ei-what-is-lead">{firstSteps.intro}</p>
              <ol className="ei-what-is-journey ei-pr-start-guide-steps">
                {firstSteps.steps.map((item, index) => (
                  <li key={item.title} className="ei-what-is-journey-step">
                    <span className="ei-what-is-journey-num" aria-hidden="true">
                      {item.number}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </div>
                    {index < firstSteps.steps.length - 1 ? (
                      <span className="ei-what-is-journey-arrow" aria-hidden="true">
                        ↓
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="ei-what-is-lead">{ready.intro}</p>
              {ready.pricingNote ? (
                <p className="ei-settings-hint ei-what-is-pricing">{ready.pricingNote}</p>
              ) : null}
              {ready.footer ? <p className="ei-what-is-footer">{ready.footer}</p> : null}
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
              {step === 1 ? firstSteps.backLabel : ready.backLabel}
            </button>
          ) : null}
          {step < STEP_COUNT - 1 ? (
            <button type="button" className="ei-btn" onClick={() => setStep((n) => n + 1)}>
              {step === 0 ? role.continueLabel : firstSteps.continueLabel}
            </button>
          ) : (
            <button type="button" className="ei-btn" onClick={goSignIn}>
              {ready.signInLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(
      <div className="estate-inventory ei-modal-portal">{body}</div>,
      document.body
    );
  }
  return body;
};

export default EstatePrStartGuideModal;
