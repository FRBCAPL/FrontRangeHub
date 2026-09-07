import React, { useState } from 'react';
import { usaplDivisionShowsSessionStats } from '../../data/usaplPastDivisions.js';
import { usaplPublicReportEntries, usaplReportBlurb } from '../../data/usaplPublicReports.js';

export default function UsaplPublicReport({ division }) {
  const reports = usaplPublicReportEntries(division);
  const [active, setActive] = useState(0);
  const current = reports[Math.min(active, Math.max(reports.length - 1, 0))];
  const blurb = usaplReportBlurb(division);
  const waiting = !usaplDivisionShowsSessionStats(division);

  if (waiting || !current) {
    return (
      <section className="usapl-card usapl-report-card">
        <p className="usapl-meta">
          {waiting ? 'Stats will appear here when division play begins.' : blurb}
        </p>
      </section>
    );
  }

  const title = `${division.shortName || division.name} ${current.label} public report`;

  return (
    <section className="usapl-card usapl-report-card">
      {blurb ? <p className="usapl-meta">{blurb}</p> : null}
      {reports.length > 1 ? (
        <div className="usapl-report-tabs">
          {reports.map((report, index) => (
            <button
              key={report.id}
              type="button"
              className={`usapl-choice ${index === active ? 'selected' : ''}`}
              onClick={() => setActive(index)}
            >
              {report.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="usapl-report-frame">
        <iframe title={title} src={current.src} />
      </div>
      <div className="usapl-actions">
        <a className="usapl-btn-secondary" href={current.src} target="_blank" rel="noreferrer">
          Open in FargoRate
        </a>
      </div>
    </section>
  );
}
