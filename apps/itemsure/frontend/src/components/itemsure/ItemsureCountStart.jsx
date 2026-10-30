import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startSession } from '../../services/itemsureCountService.js';
import { listLocations } from '../../services/itemsureLocationService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, sites, SITE } from '../../data/itemsureTerms.js';
import { Card, ErrorNote, Field, PageHead } from './ItemsureUi.jsx';

function defaultName(location, area) {
  const day = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${area?.name || location?.name || 'Count'} \u00b7 ${day}`;
}

export default function ItemsureCountStart() {
  const { organization, features, can } = useItemsureWorkspace();
  const navigate = useNavigate();
  const [locations, setLocations] = useState(null);
  const [form, setForm] = useState({ locationId: '', scope: 'location', storageAreaId: '', name: '' });
  const [nameTouched, setNameTouched] = useState(false);
  const { busy, error, setError, run } = useItemsureAction();

  useEffect(() => {
    listLocations(organization.id)
      .then((list) => {
        const active = list.filter((l) => l.is_active);
        setLocations(active);
        if (active.length === 1) setForm((f) => ({ ...f, locationId: active[0].id }));
      })
      .catch((e) => {
        setLocations([]);
        setError(e.message);
      });
  }, [organization.id, setError]);

  const location = useMemo(() => (locations || []).find((l) => l.id === form.locationId) || null, [locations, form.locationId]);
  const areas = (location?.storageAreas || []).filter((a) => a.is_active);
  const area = form.scope === 'storage_area' ? areas.find((a) => a.id === form.storageAreaId) : null;
  const name = nameTouched ? form.name : location ? defaultName(location, area) : '';

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (!location) throw new Error(`Choose a ${site}.`);
      if (form.scope === 'storage_area' && !area) throw new Error('Choose a spot.');
      const id = await startSession({ locationId: location.id, storageAreaId: area?.id || null, name });
      navigate(`${ITEMSURE_PATH}/counts/${id}`);
    });
  };

  if (!can('counts.create')) {
    return (
      <div className="isu-page">
        <PageHead title="Start count" />
        <p className="isu-muted">Your role does not include starting counts.</p>
      </div>
    );
  }

  return (
    <div className="isu-page">
      <PageHead title="Start count" description="Every active catalog item is included. Quantities are entered blind." />
      <Card>
        {locations === null ? <p className="isu-muted">Loading…</p> : null}
        {locations && locations.length === 0 ? (
          <p className="isu-muted">
            No active {sites} you can access. <Link to={`${ITEMSURE_PATH}/locations`}>Add a {site}</Link> first.
          </p>
        ) : null}
        {locations && locations.length ? (
          <form onSubmit={submit} className="isu-stack">
            <Field label={SITE}>
              <select value={form.locationId} onChange={set('locationId')} required>
                <option value="">Choose a {site}</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>

            {features.spots ? <fieldset className="isu-fieldset">
              <legend>What are you counting?</legend>
              <label className="isu-check">
                <input type="radio" name="scope" value="location" checked={form.scope === 'location'} onChange={set('scope')} />
                The whole {site}
              </label>
              <label className="isu-check">
                <input
                  type="radio"
                  name="scope"
                  value="storage_area"
                  checked={form.scope === 'storage_area'}
                  onChange={set('scope')}
                  disabled={!areas.length}
                />
                One spot{location && !areas.length ? ` (this ${site} has none)` : ''}
              </label>
            </fieldset> : null}

            {form.scope === 'storage_area' && areas.length ? (
              <Field label="Spot">
                <select value={form.storageAreaId} onChange={set('storageAreaId')} required>
                  <option value="">Choose a spot</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            ) : null}

            <Field label="Count name">
              <input
                value={name}
                maxLength={120}
                onChange={(e) => {
                  setNameTouched(true);
                  setForm((f) => ({ ...f, name: e.target.value }));
                }}
              />
            </Field>

            <ErrorNote message={error} />
            <div className="isu-card-actions">
              <Link to={`${ITEMSURE_PATH}/counts`} className="isu-btn isu-btn--ghost">Back</Link>
              <button type="submit" className="isu-btn isu-btn--primary" disabled={busy}>
                {busy ? 'Starting…' : 'Start count'}
              </button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
