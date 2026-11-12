import React from 'react';
import { createPortal } from 'react-dom';

/**
 * League-page error (e.g. a payment that didn't save). Floats above any open popup so a failed save
 * from inside the team window is never silent. Portaled like DuezyModal: .dz-main's transform breaks position:fixed.
 */
export default function DuezyErrorBanner({ error, onDismiss }) {
  if (!error) return null;
  const host = document.querySelector('.dz-app') || document.body;
  return createPortal(
    <p className="dz-error dz-error-float" role="alert">
      <span>{error}</span>
      <button type="button" className="dz-link dz-small" onClick={onDismiss}>Dismiss</button>
    </p>,
    host
  );
}
