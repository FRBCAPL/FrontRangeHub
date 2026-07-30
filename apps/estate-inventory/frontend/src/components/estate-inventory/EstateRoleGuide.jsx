import React, { useState } from 'react';
import EstateRoleGuideModal from './EstateRoleGuideModal';

function normalizeGuide(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    return {
      title: 'Role guide',
      summary: input,
      details: input,
      steps: [],
      notes: ''
    };
  }
  const summary = String(input.summary || '').trim();
  const details = String(input.details || '').trim();
  const steps = Array.isArray(input.steps) ? input.steps : [];
  const notes = String(input.notes || '').trim();
  if (!summary && !details && !steps.length) return null;
  return {
    title: String(input.title || 'Role guide').trim(),
    summary: summary || details || steps[0]?.body || '',
    details: details || summary,
    steps,
    notes
  };
}

/**
 * Short how-to blurb + "Open guide" modal with numbered steps.
 * Accepts `{ title, summary, steps, notes }` or a plain string.
 */
const EstateRoleGuide = ({ guide = null, children = null, className = '' }) => {
  const [open, setOpen] = useState(false);
  const resolved = normalizeGuide(guide ?? children);
  if (!resolved) return null;

  const hasMore =
    (resolved.steps && resolved.steps.length > 0) ||
    (resolved.details && resolved.details !== resolved.summary) ||
    Boolean(resolved.notes);

  return (
    <>
      <div className={`ei-role-guide${className ? ` ${className}` : ''}`} role="note">
        <p className="ei-role-guide-label">Your guide</p>
        <div className="ei-role-guide-summary-row">
          <p className="ei-role-guide-body">{resolved.summary}</p>
          {hasMore ? (
            <button type="button" className="ei-role-guide-more" onClick={() => setOpen(true)}>
              Open guide
            </button>
          ) : null}
        </div>
      </div>
      <EstateRoleGuideModal
        open={open}
        title={resolved.title}
        guide={resolved}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default EstateRoleGuide;
