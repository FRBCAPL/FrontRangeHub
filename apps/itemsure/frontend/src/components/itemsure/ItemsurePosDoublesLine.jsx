import React, { useState } from 'react';
import usePosDoubles from '../../hooks/usePosDoubles.js';
import { doublesSummary } from '../../utils/itemsurePosDoubles.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Top of the Add-ons tab: "Double / Triple: one more pour of Liquor, Liqueurs · Change", with a
 * category checklist. Hidden until the database update is applied.
 */
export default function ItemsurePosDoublesLine({ organizationId, canEdit }) {
  const { rows, ready, loaded, error, busy, toggle } = usePosDoubles(organizationId);
  const [open, setOpen] = useState(false);
  if (!loaded || !ready) return null;
  const names = doublesSummary(rows);

  return (
    <div className="isu-pos-doubles">
      <div className="isu-pos-mod-row">
        <div className="isu-pos-mod-text">
          <strong>Double and Triple</strong>
          <div className="isu-small">One more pour of: {names || 'the drink’s first linked item'}</div>
          {!names ? <div className="isu-small isu-muted">Tick Liquor so a double vodka soda doesn&apos;t count extra soda.</div> : null}
        </div>
        {canEdit && rows.length ? (
          <div className="isu-pos-mod-actions">
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setOpen((v) => !v)}>{open ? 'Done' : 'Change'}</button>
          </div>
        ) : null}
      </div>
      {open ? (
        <fieldset className="isu-pos-doubles-list" disabled={busy}>
          <legend className="isu-muted isu-small">A Double pours one more of these (not the mixer):</legend>
          {rows.map((r) => (
            <label key={r.category.id} className={r.depth ? 'is-sub' : ''}>
              <input type="checkbox" checked={r.on} onChange={(e) => toggle(r, e.target.checked)} />
              {r.category.name}
            </label>
          ))}
        </fieldset>
      ) : null}
      <ErrorNote message={error} />
    </div>
  );
}
