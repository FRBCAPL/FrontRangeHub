import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** "← Back" to the previous page (keeps shop filters); "← label" to `to` when the page was opened directly. */
export default function ConsignmentBackLink({ to, label }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHistory = location.key !== 'default';
  return (
    <button type="button" className="cs-back-link" onClick={() => (hasHistory ? navigate(-1) : navigate(to))}>
      ← {hasHistory ? 'Back' : label}
    </button>
  );
}
