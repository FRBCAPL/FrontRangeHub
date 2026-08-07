import React from 'react';

/**
 * Compact loading row with spinner — for home panels while bootstrap runs.
 */
const EstateInlineLoading = ({ label = 'Loading…', className = '' }) => (
  <div
    className={`ei-inline-loading${className ? ` ${className}` : ''}`}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <span className="ei-inline-spinner" aria-hidden="true" />
    <span className="ei-inline-loading-label">{label}</span>
  </div>
);

export default EstateInlineLoading;
