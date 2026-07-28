import React from 'react';

/**
 * Full role capability details opened from "See more" under What you can do.
 * Use \n for a tight line wrap; use \n\n for a paragraph gap.
 */
const EstateRoleGuideModal = ({ open, title = 'What you can do', details = '', onClose }) => {
  if (!open) return null;

  const paragraphs = String(details || '')
    .split(/\n\n+/)
    .map((block) => block.replace(/^\n+|\n+$/g, '').trim())
    .filter(Boolean);

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-role-guide-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ height: 'auto', maxHeight: 'min(88vh, 88dvh)' }}
      >
        <div className="ei-modal-head">
          <h3 id="ei-role-guide-modal-title">{title}</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <p className="ei-role-guide-label" style={{ marginBottom: '0.65rem' }}>
            What you can do
          </p>
          {paragraphs.map((block, i) => {
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
        </div>
        <div className="ei-modal-foot">
          <button type="button" className="ei-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstateRoleGuideModal;
