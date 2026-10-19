import React from 'react';
import { formatFor, isRecommendedFormat } from '../showdownFormats.js';

/** The event's format on the setup screen, with the way to change it before qualifying starts. */
export default function ShowdownFormatPanel({ version, onChange }) {
  const f = formatFor(version);
  return (
    <section className="sd-panel sd-format-panel" aria-label="Tournament format">
      <h3>Format</h3>
      <p className="sd-format-current">
        <strong>{f ? `${f.code} \u00b7 ${f.name}` : 'Unknown format'}</strong>
        {f && isRecommendedFormat(f.version) ? <small className="sd-tag sd-tag-recommended">Recommended</small> : null}
      </p>
      {f ? <p className="sd-note">{f.summary}</p> : null}
      {f?.notReady ? <p className="sd-warn">{f.notReady}</p> : null}
      <p className="sd-note">The format can change until qualifying starts; then it is locked.</p>
      {onChange ? <button type="button" className="sd-btn" onClick={onChange}>Change format</button> : null}
    </section>
  );
}
