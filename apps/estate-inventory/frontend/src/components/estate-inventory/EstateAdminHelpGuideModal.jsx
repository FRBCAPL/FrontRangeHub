import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import EstateModalShell from './EstateModalShell';
import { ESTATE_ADMIN_HELP_GUIDE } from '@shared/utils/estateAdminHelpGuide.js';

/**
 * Admin section help — pick a workspace area, then read how to use it.
 */
const EstateAdminHelpGuideModal = ({ open, onClose }) => {
  const content = ESTATE_ADMIN_HELP_GUIDE;
  const sections = content.sections || [];
  const [activeId, setActiveId] = useState(sections[0]?.id || '');

  useEffect(() => {
    if (open) setActiveId(ESTATE_ADMIN_HELP_GUIDE.sections[0]?.id || '');
  }, [open]);

  if (!open) return null;

  const active = sections.find((s) => s.id === activeId) || sections[0];

  const body = (
    <EstateModalShell
      title={content.title}
      subtitle={content.intro}
      onClose={onClose}
      className="ei-admin-help-modal"
      foot={
        <button type="button" className="ei-btn" onClick={onClose}>
          {content.closeLabel || 'Got it'}
        </button>
      }
    >
      <p className="ei-admin-help-eyebrow">{content.eyebrow}</p>

      <div className="ei-admin-help-layout">
        <nav className="ei-admin-help-nav" aria-label="Admin sections">
          {sections.map((section) => {
            const selected = section.id === active?.id;
            return (
              <button
                key={section.id}
                type="button"
                className={`ei-admin-help-nav-btn${selected ? ' is-active' : ''}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => setActiveId(section.id)}
              >
                {section.label}
              </button>
            );
          })}
        </nav>

        <article className="ei-admin-help-detail" aria-live="polite">
          {active ? (
            <>
              <h4 className="ei-admin-help-detail-title">{active.label}</h4>
              {active.summary ? (
                <p className="ei-admin-help-summary">{active.summary}</p>
              ) : null}
              {Array.isArray(active.howTo) && active.howTo.length ? (
                <ol className="ei-admin-help-steps">
                  {active.howTo.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
              {active.tip ? (
                <p className="ei-admin-help-tip">
                  <strong>Tip.</strong> {active.tip}
                </p>
              ) : null}
            </>
          ) : null}
        </article>
      </div>
    </EstateModalShell>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(<div className="estate-inventory ei-modal-portal">{body}</div>, document.body);
  }
  return body;
};

export default EstateAdminHelpGuideModal;
