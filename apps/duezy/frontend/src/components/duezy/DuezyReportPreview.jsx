import React from 'react';

/** On-screen preview of a report: summary figures, then the same table the PDF prints. */
export default function DuezyReportPreview({ report, loading = false }) {
  if (loading) return <p className="dz-small dz-muted">Loading…</p>;
  return (
    <div className="dz-report-preview">
      <dl className="dz-report-summary">
        {report.summary.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="dz-report-table-wrap" tabIndex={0} aria-label={`${report.title} preview`}>
        <table className="dz-report-table">
          <thead>
            <tr>
              {report.columns.map((c) => (
                <th key={c.label} scope="col" className={c.align === 'right' ? 'is-num' : ''}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.length ? report.rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => <td key={j} className={report.columns[j]?.align === 'right' ? 'is-num' : ''}>{cell}</td>)}
              </tr>
            )) : (
              <tr><td colSpan={report.columns.length} className="dz-muted">{report.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="dz-small dz-muted">
        {report.rows.length} {report.rows.length === 1 ? 'row' : 'rows'}{report.range ? ` · ${report.range}` : ''}. {report.note}
      </p>
    </div>
  );
}
