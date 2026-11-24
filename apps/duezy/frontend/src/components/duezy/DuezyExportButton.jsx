import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

const TITLES = {
  '': 'Season ledger, change history, and by-method PDF/CSV — full dues-cycle backup',
  history: 'Change history report (PDF/CSV)',
  methods: 'Totals by payment method (PDF/CSV)',
  deposits: 'Reconcile cash and app money with bank deposits',
};

/** Link to reports & deposits. `report` opens that tab (ledger when empty). */
export default function DuezyExportButton({ league, report = '', label = 'Export reports' }) {
  const to = `${DUEZY_PATH}/league/${league.id}/reports${report ? `?report=${report}` : ''}`;
  return (
    <Link to={to} className="dz-btn dz-btn--ghost dz-btn--sm" title={TITLES[report] || TITLES['']}>
      {label}
    </Link>
  );
}
