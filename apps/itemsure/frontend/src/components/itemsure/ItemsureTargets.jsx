import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useTargetsData from '../../hooks/useTargetsData.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { saveTargets } from '../../services/itemsureTargetService.js';
import { buildSaveRows, isTargetChanged, targetKey } from '../../utils/itemsureTargets.js';
import { findBalance, NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { ErrorNote, LoadFailed, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureTargetFilters from './ItemsureTargetFilters.jsx';
import ItemsureTargetRow from './ItemsureTargetRow.jsx';
import ItemsureTargetCopy from './ItemsureTargetCopy.jsx';

const PAGE = 100;

/**
 * Minimum and par per item and place. Edits are kept by slot, so changing
 * filters never drops them; Save sends every changed slot and reports each
 * failure on its row while the rest are saved.
 */
export default function ItemsureTargets() {
  const { organization, can } = useItemsureWorkspace();
  const canEdit = can('inventory.targets.manage');
  const { data, error, reload } = useTargetsData(organization.id);
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    locationId: params.get('location') || '',
    areaId: params.has('area') ? params.get('area') : 'all',
    categoryId: '',
    search: params.get('search') || '',
    missingOnly: false,
  });
  const [edits, setEdits] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [limit, setLimit] = useState(PAGE);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState('');
  const { busy, error: saveError, run } = useItemsureAction();

  const locations = useMemo(() => (data?.locations || []).filter((l) => l.is_active), [data]);
  useEffect(() => {
    if (locations.length && !locations.some((l) => l.id === filters.locationId)) {
      setFilters((f) => ({ ...f, locationId: locations[0].id, areaId: 'all' }));
    }
  }, [locations, filters.locationId]);
  useEffect(() => setLimit(PAGE), [filters]);

  const itemsById = useMemo(() => Object.fromEntries((data?.items || []).map((i) => [i.id, i])), [data]);
  const dirtyKeys = useMemo(
    () => Object.keys(edits).filter((k) => isTargetChanged(edits[k], data?.targetsByKey[k])),
    [edits, data],
  );

  useEffect(() => {
    if (!dirtyKeys.length) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyKeys.length]);

  const rows = useMemo(() => {
    const location = locations.find((l) => l.id === filters.locationId);
    if (!data || !location) return [];
    const slots = [{ id: null, name: NO_AREA_LABEL }, ...location.storageAreas.filter((a) => a.is_active)].filter(
      (s) => filters.areaId === 'all' || (s.id || '') === filters.areaId,
    );
    const term = filters.search.trim().toLowerCase();
    return data.items
      .filter((i) => i.isActive)
      .filter((i) => !filters.categoryId || i.categoryId === filters.categoryId)
      .filter((i) => !term || i.name.toLowerCase().includes(term) || (i.sku || '').toLowerCase().includes(term))
      .flatMap((item) =>
        slots.map((slot) => {
          const key = targetKey(item.id, location.id, slot.id);
          return {
            key,
            item,
            areaName: slot.name,
            saved: data.targetsByKey[key] || null,
            balance: findBalance(data.balances, item.id, location.id, slot.id),
          };
        }),
      )
      .filter((r) => !filters.missingOnly || !r.saved);
  }, [data, locations, filters]);

  const onChange = useCallback(
    (key, field, value) => {
      setMessage('');
      setRowErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
      setEdits((prev) => {
        const saved = data?.targetsByKey[key];
        const base = prev[key] || { minimum: saved?.minimum_text ?? '', par: saved?.par_text ?? '' };
        return { ...prev, [key]: { ...base, [field]: value } };
      });
    },
    [data],
  );

  const save = () =>
    run(async () => {
      setMessage('');
      const { rows: payload, keys, errors } = buildSaveRows(edits, data.targetsByKey, itemsById);
      const results = payload.length ? await saveTargets(organization.id, payload) : [];
      const failed = { ...errors };
      const saved = [];
      results.forEach((r) => (r.ok ? saved.push(keys[r.index]) : (failed[keys[r.index]] = r.error)));
      // Reload after any server answer: a conflicted row keeps the person's numbers,
      // and the fresh levels let their next save replace the other person's.
      if (results.length) await reload();
      if (saved.length) notifyInventoryChanged();
      setEdits((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => failed[k])));
      setRowErrors(failed);
      const bad = Object.keys(failed).length;
      setMessage(`${saved.length ? `Saved ${saved.length}.` : 'Nothing saved.'}${bad ? ` ${bad} need${bad === 1 ? 's' : ''} fixing (marked below).` : ''}`);
    });

  const discard = () => {
    setEdits({});
    setRowErrors({});
    setMessage('');
  };

  const afterCopy = async () => {
    setCopying(false);
    await reload();
    notifyInventoryChanged();
  };

  const visible = rows.slice(0, limit);
  const hiddenDirty = dirtyKeys.filter((k) => !rows.some((r) => r.key === k)).length;
  const action = canEdit && locations.length > 1 ? (
    <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setCopying(true)} disabled={dirtyKeys.length > 0}
      title={dirtyKeys.length ? 'Save or discard your changes first' : undefined}>
      Copy to another location
    </button>
  ) : null;

  return (
    <div className="isu-page">
      <PageHead title="Par levels" description="Minimum is when an item counts as low. Par is how much you want on hand. Either is optional." action={action} />
      {data ? <ErrorNote message={error} /> : null}
      {!data && error ? <LoadFailed message={error} onRetry={reload} /> : null}
      {!data && !error ? <p className="isu-muted">Loading…</p> : null}
      {data && !locations.length ? <div className="isu-card isu-empty"><h2>No locations</h2><p className="isu-muted">Add a location first.</p></div> : null}

      {data && locations.length ? (
        <>
          <ItemsureTargetFilters filters={filters} setFilters={setFilters} locations={locations} categories={data.categories} />
          {!canEdit ? <p className="isu-notice">You can view levels here. Your role can&apos;t change them.</p> : null}

          {canEdit && (dirtyKeys.length || message || saveError) ? (
            <div className="isu-levels-bar" role="status">
              <p>
                {dirtyKeys.length ? `${dirtyKeys.length} unsaved change${dirtyKeys.length === 1 ? '' : 's'}` : message}
                {hiddenDirty ? ` (${hiddenDirty} hidden by filters)` : ''}
              </p>
              {dirtyKeys.length ? (
                <div className="isu-stock-actions">
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={discard} disabled={busy}>Discard</button>
                  <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <ErrorNote message={saveError} />
          {dirtyKeys.length && message ? <p className="isu-muted isu-small">{message}</p> : null}

          {rows.length ? (
            <ul className="isu-levels-list">
              {visible.map((row) => (
                <ItemsureTargetRow key={row.key} row={row} edit={edits[row.key]} error={rowErrors[row.key]}
                  dirty={dirtyKeys.includes(row.key)} canEdit={canEdit} onChange={onChange} />
              ))}
            </ul>
          ) : (
            <p className="isu-muted isu-center">{data.items.some((i) => i.isActive) ? 'Nothing matches these filters.' : 'Add items to your catalog first.'}</p>
          )}
          {rows.length > limit ? (
            <button type="button" className="isu-btn isu-btn--ghost" onClick={() => setLimit((n) => n + PAGE)}>
              Show more ({rows.length - limit} left)
            </button>
          ) : null}
        </>
      ) : null}

      <Modal open={copying} title="Copy levels to another location" onClose={() => setCopying(false)}>
        {data && copying ? <ItemsureTargetCopy locations={locations} defaultFromId={filters.locationId} onDone={afterCopy} /> : null}
      </Modal>
    </div>
  );
}
