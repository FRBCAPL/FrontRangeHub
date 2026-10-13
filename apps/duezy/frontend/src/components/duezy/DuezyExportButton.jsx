import React from 'react';
import { downloadCsv, ledgerCsv, ledgerFileName } from '../../utils/duezyExport.js';
import { todayISO } from '../../utils/duezySchedule.js';

/** Downloads the whole league's dues ledger (every division) as a CSV a spreadsheet can open. */
export default function DuezyExportButton({ league, units, teams, payments }) {
  const download = () => {
    const today = todayISO(league.timezone);
    const csv = ledgerCsv({ units, teams, payments, today, defaultGrace: Number(league.grace_days) || 0 });
    downloadCsv(csv, ledgerFileName(league.name, today));
  };

  return (
    <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={download} title="Every team, every week of the season — opens in Excel or Google Sheets">
      Download ledger (CSV)
    </button>
  );
}
