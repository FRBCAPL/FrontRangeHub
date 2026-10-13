import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/** Header link to the reports & deposits page (preview + PDF, bank deposits). `report` picks the starting tab. */
export default function DuezyExportButton({ league, report = '', label = 'Reports & deposits' }) {
  const to = `${DUEZY_PATH}/league/${league.id}/reports${report ? `?report=${report}` : ''}`;
  return (
    <Link to={to} className="dz-btn dz-btn--ghost dz-btn--sm" title="Season, change-history and payment-method reports, plus bank deposits">
      {label}
    </Link>
  );
}
