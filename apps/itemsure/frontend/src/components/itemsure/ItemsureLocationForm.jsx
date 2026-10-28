import React, { useState } from 'react';
import { createLocation, updateLocation } from '../../services/itemsureLocationService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { TIMEZONES } from '../../data/itemsureConstants.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const EMPTY = { name: '', address_line1: '', address_line2: '', city: '', region: '', postal_code: '', country: '' };

function guessTimezone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONES.includes(zone) ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Adds a location, or edits `location` when one is given. */
export default function ItemsureLocationForm({ organizationId, location, onSaved }) {
  const [form, setForm] = useState(() => (location
    ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, location[k] || ''])), timezone: location.timezone }
    : { ...EMPTY, timezone: guessTimezone() }));
  const { busy, error, run } = useItemsureAction();
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const zones = location && !TIMEZONES.includes(location.timezone) ? [location.timezone, ...TIMEZONES] : TIMEZONES;

  const submit = async (event) => {
    event.preventDefault();
    const save = location ? () => updateLocation(organizationId, location, form) : () => createLocation(organizationId, form);
    if (await run(save)) onSaved();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Location name">
        <input value={form.name} onChange={set('name')} maxLength={120} />
      </Field>
      <Field label="Street address">
        <input value={form.address_line1} onChange={set('address_line1')} autoComplete="address-line1" />
      </Field>
      <Field label="Address line 2">
        <input value={form.address_line2} onChange={set('address_line2')} autoComplete="address-line2" />
      </Field>
      <div className="isu-grid-2">
        <Field label="City">
          <input value={form.city} onChange={set('city')} autoComplete="address-level2" />
        </Field>
        <Field label="State or region">
          <input value={form.region} onChange={set('region')} autoComplete="address-level1" />
        </Field>
        <Field label="Postal code">
          <input value={form.postal_code} onChange={set('postal_code')} autoComplete="postal-code" />
        </Field>
        <Field label="Country">
          <input value={form.country} onChange={set('country')} autoComplete="country-name" />
        </Field>
      </div>
      <Field label="Time zone">
        <select value={form.timezone} onChange={set('timezone')}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </Field>
      <button type="submit" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy}>
        {busy ? 'Saving…' : location ? 'Save changes' : 'Add location'}
      </button>
    </form>
  );
}
