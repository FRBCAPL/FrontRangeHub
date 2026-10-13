import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useDuezyLeague from '../../hooks/useDuezyLeague.js';
import { listLeagueHistory } from '../../services/duezyService.js';
import { getSession } from '../../services/duezyAuthService.js';
import { historyReport, ledgerReport, methodReport, reportFileName } from '../../utils/duezyReports.js';
import { downloadCsv, ledgerCsv, toCsv } from '../../utils/duezyExport.js';
import { historyCsv } from '../../utils/duezyHistoryExport.js';
import { methodTotals, methodTotalsCsvRows } from '../../utils/duezyBookkeeping.js';
import { downloadReportPdf } from '../../utils/duezyPdf.js';
import { todayISO } from '../../utils/duezySchedule.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezySectionTabs from './DuezySectionTabs.jsx';
import DuezyReportPreview from './DuezyReportPreview.jsx';
import DuezySkeleton from './DuezySkeleton.jsx';
import DuezyNoAccess from './DuezyNoAccess.jsx';

const REPORTS = [
  { id: 'ledger', label: 'Season ledger' },
  { id: 'history', label: 'Change history' },
  { id: 'methods', label: 'By method' },
];
const HISTORY_LIMIT = 5000;

/** Bookkeeping reports: preview on screen, download as PDF (CSV still available). ?report=…&div=… */
export default function DuezyReportsPage() {
  const { leagueId } = useParams();
  const [params, setParams] = useSearchParams();
  const data = useDuezyLeague(leagueId);
  const { league, units, teams, payments, loading } = data;
  const [history, setHistory] = useState(undefined);
  const [upcoming, setUpcoming] = useState(false);
  const [me, setMe] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reportId = REPORTS.some((r) => r.id === params.get('report')) ? params.get('report') : 'ledger';
  const divId = params.get('div') || '';
  const setParam = (key, value) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });

  useEffect(() => { getSession().then((s) => setMe(s?.user?.email || '')).catch(() => {}); }, []);
  useEffect(() => {
    if (reportId !== 'history' || history !== undefined || !league) return;
    listLeagueHistory(league.id, HISTORY_LIMIT).then((r) => setHistory(r || [])).catch((e) => { setHistory([]); setError(e.message); });
  }, [reportId, history, league]);

  const scope = useMemo(() => {
    const unit = units.find((u) => u.id && u.id === divId);
    if (!unit) return { units, teams, payments, history: history || [], label: units.length > 1 ? 'All divisions' : '' };
    const ids = new Set(teams.filter((t) => t.division_id === unit.id).map((t) => t.id));
    return {
      units: [unit],
      teams: teams.filter((t) => ids.has(t.id)),
      payments: payments.filter((p) => ids.has(p.team_id)),
      history: (history || []).filter((h) => ids.has(h.team_id)),
      label: unit.name,
    };
  }, [units, teams, payments, history, divId]);

  const today = todayISO(league?.timezone);
  const grace = Number(league?.grace_days) || 0;
  const report = useMemo(() => {
    if (!league) return null;
    if (reportId === 'history') return historyReport({ rows: scope.history, units: scope.units });
    if (reportId === 'methods') return methodReport(scope);
    return ledgerReport({ ...scope, today, defaultGrace: grace, includeUpcoming: upcoming });
  }, [league, reportId, scope, today, grace, upcoming]);

  if (loading) return <DuezySkeleton variant="list" label="Loading reports…" />;
  if (!league || !report) return <DuezyNoAccess />;

  const fileName = (ext) => reportFileName(league.name, report.title, divId ? scope.label : '', today, ext);
  const pdf = async () => {
    setBusy(true);
    setError('');
    try {
      const preparedOn = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await downloadReportPdf(report, { leagueName: league.name, scope: scope.label, preparedBy: me, preparedOn, fileName: fileName('pdf') });
    } catch (e) {
      setError(`Couldn't make the PDF: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  const csv = () => {
    if (reportId === 'history') downloadCsv(historyCsv({ rows: scope.history, units: scope.units }), fileName('csv'));
    else if (reportId === 'methods') downloadCsv(toCsv(methodTotalsCsvRows(methodTotals(scope))), fileName('csv'));
    else downloadCsv(ledgerCsv({ ...scope, today, defaultGrace: grace }), fileName('csv'));
  };

  return (
    <div className="dz-stack dz-stack--lg">
      <div>
        <Link to={`${DUEZY_PATH}/league/${league.id}`} className="dz-link dz-small">‹ Back to {league.name}</Link>
        <span className="dz-eyebrow dz-settings-eyebrow">{league.name}</span>
        <h1 className="dz-h1">Bookkeeping reports</h1>
      </div>

      <DuezySectionTabs label="Reports" tabs={REPORTS} active={reportId} onChange={(id) => setParam('report', id === 'ledger' ? '' : id)} />

      <section className="dz-panel dz-stack">
        <div className="dz-row dz-row--wrap dz-report-controls">
          {units.length > 1 ? (
            <label className="dz-quick-method">
              <span className="dz-small dz-muted">Division</span>
              <select value={divId} onChange={(e) => setParam('div', e.target.value)}>
                <option value="">All divisions</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
          ) : <span />}
          {reportId === 'ledger' ? (
            <label className="dz-check-label dz-small">
              <input type="checkbox" checked={upcoming} onChange={(e) => setUpcoming(e.target.checked)} /> Include upcoming weeks
            </label>
          ) : null}
        </div>

        <DuezyReportPreview report={report} loading={reportId === 'history' && history === undefined} />

        {error ? <p className="dz-error" role="alert">{error}</p> : null}
        <div className="dz-report-actions">
          <button type="button" className="dz-btn dz-btn--primary" onClick={pdf} disabled={busy || (reportId === 'history' && history === undefined)}>
            {busy ? 'Making PDF…' : 'Download PDF'}
          </button>
          <button type="button" className="dz-link dz-small" onClick={csv} disabled={reportId === 'history' && history === undefined}>
            Also download as CSV (spreadsheet)
          </button>
        </div>
      </section>
    </div>
  );
}
