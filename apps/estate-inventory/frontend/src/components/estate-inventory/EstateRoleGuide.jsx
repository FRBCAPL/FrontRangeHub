import React, { useState } from 'react';
import EstateRoleGuideModal from './EstateRoleGuideModal';

function normalizeGuide(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    return { title: 'What you can do', summary: input, details: input };
  }
  const summary = String(input.summary || '').trim();
  const details = String(input.details || summary).trim();
  if (!summary && !details) return null;
  return {
    title: String(input.title || 'What you can do').trim(),
    summary: summary || details,
    details: details || summary
  };
}

/**
 * One-sentence capability blurb + optional "See more" modal.
 * Accepts a guide object `{ title, summary, details }` or a plain string.
 */
const EstateRoleGuide = ({ guide = null, children = null, className = '' }) => {
  const [open, setOpen] = useState(false);
  const resolved = normalizeGuide(guide ?? children);
  if (!resolved) return null;

  const hasMore = resolved.details && resolved.details !== resolved.summary;

  return (
    <>
      <div className={`ei-role-guide${className ? ` ${className}` : ''}`} role="note">
        <p className="ei-role-guide-label">What you can do</p>
        <div className="ei-role-guide-summary-row">
          <p className="ei-role-guide-body">{resolved.summary}</p>
          {hasMore ? (
            <button type="button" className="ei-role-guide-more" onClick={() => setOpen(true)}>
              See more
            </button>
          ) : null}
        </div>
      </div>
      <EstateRoleGuideModal
        open={open}
        title={resolved.title}
        details={resolved.details}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default EstateRoleGuide;
