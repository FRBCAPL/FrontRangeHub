import React from 'react';
import { createPortal } from 'react-dom';
import EstateModalShell from './EstateModalShell';

function normalizeGuideBody(guideOrDetails) {
  if (!guideOrDetails) return { steps: [], notes: '', paragraphs: [], summary: '' };
  if (typeof guideOrDetails === 'string') {
    return {
      steps: [],
      notes: '',
      summary: '',
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
  const summary = String(guideOrDetails.summary || '').trim();
  const details = String(guideOrDetails.details || '').trim();
  // Meaning text can sit with steps (merged “Your role” modal).
  const paragraphs = details
    ? details
        .split(/\n\n+/)
        .map((block) => block.replace(/^\n+|\n+$/g, '').trim())
        .filter(Boolean)
    : [];
  return { steps, notes, paragraphs, summary };
}

/**
 * Role modal: meaning first (optional), then progress steps when present.
 * Family Menu → Your role uses EstateModalShell so the body scrolls.
 */
const EstateRoleGuideModal = ({
  open,
  title = 'Your role',
  guide = null,
  details = '',
  eyebrow = null,
  onClose
}) => {
  if (!open) return null;

  const body = normalizeGuideBody(guide || details);
  const showSteps = body.steps.length > 0;
  const showMeaning = body.paragraphs.length > 0 || Boolean(body.summary);
  const label =
    eyebrow ||
    (showMeaning && showSteps
      ? 'Your role'
      : showSteps
        ? 'What to do here'
        : 'Your role');

  return createPortal(
    <div className="estate-inventory ei-modal-portal">
      <EstateModalShell
        title={title}
        onClose={onClose}
        className="ei-role-guide-modal"
        compact
      >
        <p className="ei-role-guide-label" style={{ marginBottom: '0.75rem' }}>
          {label}
        </p>

        {body.summary && showMeaning ? (
          <p className="ei-settings-hint" style={{ marginTop: 0 }}>
            {body.summary}
          </p>
        ) : null}

        {body.paragraphs.map((block, i) => {
          const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
          return (
            <p
              key={`p-${i}`}
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

        {showSteps ? (
          <>
            {showMeaning ? (
              <p className="ei-role-guide-label" style={{ margin: '1rem 0 0.65rem' }}>
                What to do here
              </p>
            ) : null}
            <ol className="ei-role-guide-steps">
              {body.steps.map((step, i) => (
                <li key={`${step.heading}-${i}`} className="ei-role-guide-step">
                  {step.heading ? <strong>{step.heading}</strong> : null}
                  {step.body ? <span>{step.body}</span> : null}
                </li>
              ))}
            </ol>
          </>
        ) : null}

        {body.notes ? <p className="ei-role-guide-notes">{body.notes}</p> : null}
      </EstateModalShell>
    </div>,
    document.body
  );
};

export default EstateRoleGuideModal;
