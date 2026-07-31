import React from 'react';
import { createPortal } from 'react-dom';

function normalizeGuideBody(guideOrDetails) {
  if (!guideOrDetails) return { steps: [], notes: '', paragraphs: [] };
  if (typeof guideOrDetails === 'string') {
    return {
      steps: [],
      notes: '',
      paragraphs: String(guideOrDetails)
        .split(/\n\n+/)
        .map((block) => block.replace(/^\n+|\n+$/g, '').trim())
        .filter(Boolean)
    };
  }
  const steps = Array.isArray(guideOrDetails.steps)
    ? guideOrDetails.steps
        .map((step) => ({
          heading: String(step?.heading || '').trim(),
          body: String(step?.body || '').trim()
        }))
        .filter((step) => step.heading || step.body)
    : [];
  const notes = String(guideOrDetails.notes || '').trim();
  const details = String(guideOrDetails.details || '').trim();
  const paragraphs =
    !steps.length && details
      ? details
          .split(/\n\n+/)
          .map((block) => block.replace(/^\n+|\n+$/g, '').trim())
          .filter(Boolean)
      : [];
  return { steps, notes, paragraphs };
}

/**
 * Full role how-to guide opened from the nav Guide button or inline "Open guide".
 * Prefer `guide={{ title, steps, notes }}`. Legacy string `details` still works.
 */
const EstateRoleGuideModal = ({
  open,
  title = 'Role guide',
  guide = null,
  details = '',
  onClose
}) => {
  if (!open) return null;

  const body = normalizeGuideBody(guide || details);

  return createPortal(
    <div className="estate-inventory ei-modal-portal">
      <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
        <div
          className="ei-modal ei-modal-settings ei-role-guide-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ei-role-guide-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ei-modal-head">
            <h3 id="ei-role-guide-modal-title">{title}</h3>
            <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <div className="ei-modal-body">
            <p className="ei-role-guide-label" style={{ marginBottom: '0.75rem' }}>
              How to use Estate Vault
            </p>

            {body.steps.length ? (
              <ol className="ei-role-guide-steps">
                {body.steps.map((step, i) => (
                  <li key={`${step.heading}-${i}`} className="ei-role-guide-step">
                    {step.heading ? <strong>{step.heading}</strong> : null}
                    {step.body ? <span>{step.body}</span> : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {body.paragraphs.map((block, i) => {
              const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
              return (
                <p
                  key={i}
                  className={`ei-role-guide-body${i > 0 ? ' ei-role-guide-body--break' : ''}`}
                >
                  {lines.map((line, j) => (
                    <React.Fragment key={j}>
                      {j > 0 ? <br /> : null}
                      {line}
                    </React.Fragment>
                  ))}
                </p>
              );
            })}

            {body.notes ? <p className="ei-role-guide-notes">{body.notes}</p> : null}
          </div>
          <div className="ei-modal-foot">
            <button type="button" className="ei-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EstateRoleGuideModal;
