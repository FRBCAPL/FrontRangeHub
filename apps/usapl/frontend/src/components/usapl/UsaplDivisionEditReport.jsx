import React from 'react';
import { USAPL_REPORT_BLURB, USAPL_REPORT_HEADING } from '../../data/usaplPublicReports.js';

export default function UsaplDivisionEditReport({ form, setField }) {
  const heading = String(form.reportHeading || '').trim() || USAPL_REPORT_HEADING;
  const blurb = String(form.reportBlurb || '').trim() || USAPL_REPORT_BLURB;

  return (
    <>
      <div className="usapl-field">
        <label>Heading above the report</label>
        <input
          value={form.reportHeading ?? ''}
          onChange={(e) => setField('reportHeading', e.target.value)}
          placeholder={USAPL_REPORT_HEADING}
        />
      </div>
      <div className="usapl-field">
        <label>Text under that heading</label>
        <textarea
          value={form.reportBlurb ?? ''}
          onChange={(e) => setField('reportBlurb', e.target.value)}
          placeholder={USAPL_REPORT_BLURB}
        />
        <p className="usapl-field-hint">Players see this above the FargoRate standings. Save this step to keep it.</p>
      </div>
      <div className="usapl-report-preview">
        <p className="usapl-field-hint">Preview</p>
        <h2>{heading}</h2>
        <p className="usapl-meta">{blurb}</p>
      </div>
      <div className="usapl-field">
        <label>{form.playType === 'double' ? '8-ball / first public report URL' : 'Public report URL'}</label>
        <input
          value={form.fargoReportA || ''}
          onChange={(e) => setField('fargoReportA', e.target.value)}
          placeholder="Paste the full FargoRate public report URL"
        />
        <p className="usapl-meta">
          Copy the URL from the address bar when that CSI division first loads.
          Changing FargoRate&apos;s dropdown does not change the URL.
        </p>
      </div>
      {form.playType === 'double' ? (
        <div className="usapl-field">
          <label>10-ball / second public report URL</label>
          <input
            value={form.fargoReportB || ''}
            onChange={(e) => setField('fargoReportB', e.target.value)}
            placeholder="Paste the full FargoRate public report URL"
          />
        </div>
      ) : null}
    </>
  );
}
