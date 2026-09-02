import React from 'react';
import { USAPL_NIGHTS } from '../../data/usaplDivisions.js';

export default function UsaplDivisionEditNight({ form, setField, locationOptions }) {
  return (
    <>
      <div className="usapl-player-grid">
        <div className="usapl-field">
          <label>Full name *</label>
          <input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
        </div>
        <div className="usapl-field">
          <label>Short name *</label>
          <input value={form.shortName} onChange={(e) => setField('shortName', e.target.value)} required />
        </div>
        <div className="usapl-field">
          <label>Night</label>
          <select value={form.night} onChange={(e) => setField('night', e.target.value)}>
            {USAPL_NIGHTS.map((night) => (
              <option key={night} value={night}>{night}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="usapl-field">
        <label>Location *</label>
        <input
          list="usapl-division-locations"
          value={form.locationNote}
          onChange={(e) => setField('locationNote', e.target.value)}
          placeholder="Bar or hall this night plays at"
          required
        />
        {locationOptions.length ? (
          <datalist id="usapl-division-locations">
            {locationOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        ) : null}
      </div>
      <label className="usapl-field" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="checkbox" checked={Boolean(form.signupOpen)} onChange={(e) => setField('signupOpen', e.target.checked)} />
        Open for signup
      </label>
      <label className="usapl-field" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="checkbox" checked={Boolean(form.playAnywhere)} onChange={(e) => setField('playAnywhere', e.target.checked)} />
        Teams may play from any location
      </label>
      <label className="usapl-field" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="checkbox" checked={Boolean(form.inHouse)} onChange={(e) => setField('inHouse', e.target.checked)} />
        In-house league
      </label>
    </>
  );
}
