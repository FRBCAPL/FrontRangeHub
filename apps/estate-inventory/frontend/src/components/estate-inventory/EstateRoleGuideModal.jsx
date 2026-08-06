import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import EstateModalShell from './EstateModalShell';

function normalizeGuideBody(guideOrDetails) {
  if (!guideOrDetails) {
    return { steps: [], notes: '', paragraphs: [], summary: '', canDo: [] };
  }
  if (typeof guideOrDetails === 'string') {
    return {
      steps: [],
      notes: '',
      summary: '',
      canDo: [],
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
  const canDo = Array.isArray(guideOrDetails.canDo)
    ? guideOrDetails.canDo
        .map((entry) => {
          if (typeof entry === 'string') {
            const label = entry.trim();
            return label ? { label, tip: '' } : null;
          }
          const label = String(entry?.label || '').trim();
          const tip = String(entry?.tip || '').trim();
          return label ? { label, tip } : null;
        })
        .filter(Boolean)
    : [];
  const paragraphs = details
    ? details
        .split(/\n\n+/)
        .map((block) => block.replace(/^\n+|\n+$/g, '').trim())
        .filter(Boolean)
    : [];
  return { steps, notes, paragraphs, summary, canDo };
}

function RoleCanDoItem({ item, open, sticky, onHover, onToggleSticky }) {
  const tipId = useId();
  if (!item?.tip) {
    return <li className="ei-role-guide-cando-item">{item.label}</li>;
  }

  return (
    <li
      className={`ei-role-guide-cando-item${open ? ' is-tip-open' : ''}`}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <button
        type="button"
        className="ei-role-guide-cando-btn"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => onToggleSticky?.()}
      >
        <span className="ei-role-guide-cando-label">{item.label}</span>
        <span className="ei-role-guide-cando-hint" aria-hidden="true">
          ?
        </span>
      </button>
      {open ? (
        <div id={tipId} className="ei-role-guide-cando-tip" role="tooltip">
          {item.tip}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Role modal: short summary + can-do list with tip details, then a few steps.
 */
const EstateRoleGuideModal = ({
  open,
  title = 'Your role',
  guide = null,
  details = '',
  eyebrow = null,
  onClose
}) => {
  const [hoverTip, setHoverTip] = useState(null);
  const [stickyTip, setStickyTip] = useState(null);

  useEffect(() => {
    if (!open) {
      setHoverTip(null);
      setStickyTip(null);
    }
  }, [open]);

  if (!open) return null;

  const body = normalizeGuideBody(guide || details);
  const showSteps = body.steps.length > 0;
  const showCanDo = body.canDo.length > 0;
  const showMeaning = body.paragraphs.length > 0 || Boolean(body.summary) || showCanDo;
  const openTip = stickyTip != null ? stickyTip : hoverTip;

  return createPortal(
    <div className="estate-inventory ei-modal-portal">
      <EstateModalShell
        title={title}
        subtitle={eyebrow || 'Your role'}
        onClose={onClose}
        className="ei-heir-center-modal ei-role-guide-modal"
        compact
        foot={
          <button type="button" className="ei-btn" onClick={onClose}>
            Close
          </button>
        }
      >
        {body.summary ? (
          <p className="ei-role-guide-summary" style={{ marginTop: 0 }}>
            {body.summary}
          </p>
        ) : null}

        {showCanDo ? (
          <>
            <p className="ei-role-guide-label">What you can do</p>
            <p className="ei-settings-hint" style={{ margin: '0 0 0.55rem' }}>
              Hover or tap a line for more detail.
            </p>
            <ul className="ei-role-guide-cando">
              {body.canDo.map((item, index) => (
                <RoleCanDoItem
                  key={item.label}
                  item={item}
                  open={openTip === index}
                  sticky={stickyTip === index}
                  onHover={(entering) => {
                    if (stickyTip != null) return;
                    setHoverTip(entering ? index : null);
                  }}
                  onToggleSticky={() => {
                    setStickyTip((cur) => (cur === index ? null : index));
                    setHoverTip(null);
                  }}
                />
              ))}
            </ul>
          </>
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
            <p className="ei-role-guide-label" style={{ marginTop: showMeaning ? '1rem' : 0 }}>
              Getting started
            </p>
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
