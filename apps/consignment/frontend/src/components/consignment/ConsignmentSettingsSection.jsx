import React from 'react';
import './consignment-settings.css';

/**
 * Admin → Settings card. The header shows the current value (summary) so the admin can scan settings without
 * opening each one. badge: { tone: 'on' | 'off' | 'warn', text }.
 */
export default function ConsignmentSettingsSection({ icon, title, summary, badge = null, defaultOpen = false, children }) {
  return (
    <details className="cs-set-card" open={defaultOpen}>
      <summary className="cs-set-head">
        <span className="cs-set-icon" aria-hidden="true">{icon}</span>
        <span className="cs-set-titles">
          <span className="cs-set-title">{title}</span>
          {summary ? <span className="cs-set-summary">{summary}</span> : null}
        </span>
        {badge ? <span className={`cs-set-badge ${badge.tone}`}>{badge.text}</span> : null}
        <span className="cs-set-chevron" aria-hidden="true">▾</span>
      </summary>
      <div className="cs-set-body">{children}</div>
    </details>
  );
}

/** Save row: tells the admin when there are unsaved changes and lets them undo. */
export function ConsignmentSettingsSaveBar({ dirty, busy, saved, onSave, onReset, label = 'Save' }) {
  let note = null;
  if (dirty) note = <span className="cs-set-dirty">You have unsaved changes</span>;
  else if (saved) note = <span className="cs-set-saved">✓ Saved</span>;
  return (
    <div className="cs-set-savebar">
      {note}
      <span className="cs-set-savebar-btns">
        {dirty && onReset ? (
          <button type="button" className="cs-btn-secondary" onClick={onReset} disabled={busy}>Undo changes</button>
        ) : null}
        <button type="button" className="cs-btn" onClick={onSave} disabled={busy || !dirty}>{busy ? 'Saving…' : label}</button>
      </span>
    </div>
  );
}
