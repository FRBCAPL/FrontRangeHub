import React from 'react';

/** The captain's sign-up fields. `website` is a hidden honeypot that people never see or fill in. */
export default function DuezyJoinForm({ form, divisions, busy, error, onChange, onSubmit }) {
  return (
    <form className="dz-card dz-stack" onSubmit={onSubmit} noValidate>
      {divisions.length > 1 ? (
        <label className="dz-field">
          <span>Division</span>
          <select value={form.division_id} onChange={(e) => onChange({ division_id: e.target.value })} required>
            <option value="">Pick your division…</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.play_day ? `${d.name} · ${d.play_day}s` : d.name}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="dz-field">
        <span>Team name</span>
        <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={80} required autoFocus />
      </label>
      <div className="dz-join-grid">
        <label className="dz-field">
          <span>Captain (you)</span>
          <input value={form.captain} onChange={(e) => onChange({ captain: e.target.value })} maxLength={80} autoComplete="name" required />
        </label>
        <label className="dz-field">
          <span>Phone or email</span>
          <input value={form.contact} onChange={(e) => onChange({ contact: e.target.value })} maxLength={120} autoComplete="tel" required />
        </label>
      </div>
      <label className="dz-field">
        <span>Players <em className="dz-muted">(optional — one per line or separated by commas)</em></span>
        <textarea className="dz-textarea" value={form.playersText} onChange={(e) => onChange({ playersText: e.target.value })} rows={4} maxLength={1800} />
      </label>
      <label className="dz-field">
        <span>Note for the league <em className="dz-muted">(optional)</em></span>
        <input value={form.note} onChange={(e) => onChange({ note: e.target.value })} maxLength={300} />
      </label>
      <div className="dz-hp" aria-hidden="true" inert="">
        <label>
          Website
          <input value={form.website} onChange={(e) => onChange({ website: e.target.value })} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error ? <p className="dz-error" role="alert">{error}</p> : null}
      <button type="submit" className="dz-btn dz-btn--primary" disabled={busy}>{busy ? 'Sending…' : 'Sign up my team'}</button>
    </form>
  );
}
