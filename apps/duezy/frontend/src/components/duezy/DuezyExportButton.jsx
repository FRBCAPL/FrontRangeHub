import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/** Header link to the bookkeeping reports page (preview + PDF). `report` picks the starting tab. */
export default function DuezyExportButton({ league, report = '', label = 'Bookkeeping reports' }) {
  const to = `${DUEZY_PATH}/league/${league.id}/reports${report ? `?report=${report}` : ''}`;
  return (
    <Link to={to} className="dz-btn dz-btn--ghost dz-btn--sm" title="Preview season, change-history and payment-method reports, then download a PDF">
      {label}
    </Link>
  );
}
