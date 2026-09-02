import React, { useState } from 'react';
import { usaplPublicReportEntries, usaplReportBlurb, usaplReportHeading } from '../../data/usaplPublicReports.js';

export default function UsaplPublicReport({ division }) {
  const reports = usaplPublicReportEntries(division);
  const [active, setActive] = useState(0);
  const current = reports[Math.min(active, Math.max(reports.length - 1, 0))];
  const heading = usaplReportHeading(division);
  const blurb = usaplReportBlurb(division);

  if (!current) {
    return (
      <section className="usapl-card usapl-report-card">
        <h2>{heading}</h2>
        <p className="usapl-meta">{blurb}</p>
      </section>
    );
  }

  return (
    <section className="usapl-card usapl-report-card">
      <h2>{heading}</h2>
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
        <iframe
          title={`${division.shortName || division.name} ${current.label} public report`}
          src={current.src}
        />
      </div>
      <div className="usapl-actions">
        <a className="usapl-btn-secondary" href={current.src} target="_blank" rel="noreferrer">
          Open {current.label} report
        </a>
      </div>
    </section>
  );
}
