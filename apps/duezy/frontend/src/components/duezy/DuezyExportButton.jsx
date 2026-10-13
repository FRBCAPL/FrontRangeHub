import React from 'react';
import { ledgerCsv, ledgerFileName } from '../../utils/duezyExport.js';
import { todayISO } from '../../utils/duezySchedule.js';

/** Downloads the whole league's dues ledger (every division) as a CSV a spreadsheet can open. */
export default function DuezyExportButton({ league, units, teams, payments }) {
  const download = () => {
    const today = todayISO(league.timezone);
    const csv = ledgerCsv({ units, teams, payments, today, defaultGrace: Number(league.grace_days) || 0 });
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = ledgerFileName(league.name, today);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={download} title="Every team, every week — opens in Excel or Google Sheets">
      Download ledger (CSV)
    </button>
  );
}
