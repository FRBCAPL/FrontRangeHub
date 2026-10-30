import React, { useState } from 'react';
import { saveTargets } from '../../services/itemsureTargetService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { buildSaveRows, isTargetChanged } from '../../utils/itemsureTargets.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsureTargetRow from './ItemsureTargetRow.jsx';

/**
 * Warning levels for one item at one location, one row per spot. Saves only changed
 * spots through the same save as before; a failed spot keeps its numbers and shows why.
 * `rows` are the spots it uses; `otherSpots` ([{ row }]) can be added to set levels somewhere new.
 */
export default function ItemsureTargetEditor({ organizationId, item, rows, otherSpots, savedByKey, canEdit, onSaved, onCancel }) {
  const [edits, setEdits] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [added, setAdded] = useState([]);
  const { busy, error, run } = useItemsureAction();

  // A spot added here moves into `rows` once it has saved levels; show it once.
  const shown = [...rows, ...added.filter((a) => !rows.some((r) => r.key === a.key))];
  const remaining = otherSpots.filter((s) => !added.some((a) => a.key === s.key));
  const dirty = Object.keys(edits).filter((k) => isTargetChanged(edits[k], savedByKey[k]));

  const onChange = (key, field, value) => {
    setRowErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setEdits((prev) => {
      const saved = savedByKey[key];
      const base = prev[key] || { minimum: saved?.minimum_text ?? '', par: saved?.par_text ?? '' };
      return { ...prev, [key]: { ...base, [field]: value } };
    });
  };

  const save = () =>
    run(async () => {
      const { rows: payload, keys, errors } = buildSaveRows(edits, savedByKey, { [item.id]: item });
      const results = payload.length ? await saveTargets(organizationId, payload) : [];
      const failed = { ...errors };
      let savedCount = 0;
      results.forEach((r) => {
        if (r.ok) savedCount += 1;
        else failed[keys[r.index]] = r.error;
      });
      if (savedCount) notifyInventoryChanged();
      if (!Object.keys(failed).length) {
        await onSaved(savedCount);
        return;
      }
      // Some spots failed: keep only their edits, show why, and let the person fix and save again.
      setEdits((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => failed[k])));
      setRowErrors(failed);
      if (results.length) await onSaved(savedCount, { stayOpen: true });
    });

  return (
    <div className="isu-stack isu-target-editor">
      <p className="isu-muted isu-small">
        &ldquo;Warn me at&rdquo; shows Running low at or below it. &ldquo;Fill up to&rdquo; is the par the shopping list tops back up to.
      </p>
      <ul className="isu-levels-list">
        {shown.map((row) => (
          <ItemsureTargetRow
            key={row.key}
            row={row}
            title={row.areaName}
            edit={edits[row.key]}
            error={rowErrors[row.key]}
            dirty={dirty.includes(row.key)}
            canEdit={canEdit}
            onChange={onChange}
          />
        ))}
      </ul>

      {canEdit && remaining.length ? (
        <select
          className="isu-other-place"
          value=""
          onChange={(e) => {
            const pick = remaining.find((s) => s.key === e.target.value);
            if (pick) setAdded((list) => [...list, pick]);
          }}
          aria-label="Set levels at another spot"
        >
          <option value="">+ Set levels at another spot…</option>
          {remaining.map((s) => <option key={s.key} value={s.key}>{s.areaName}</option>)}
        </select>
      ) : null}

      <ErrorNote message={error} />
      <div className="isu-quickcount-actions">
        <button type="button" className="isu-btn isu-btn--ghost" onClick={onCancel} disabled={busy}>{canEdit ? 'Cancel' : 'Close'}</button>
        {canEdit ? (
          <button type="button" className="isu-btn isu-btn--primary" onClick={save} disabled={busy || !dirty.length}>
            {busy ? 'Saving…' : 'Save levels'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
