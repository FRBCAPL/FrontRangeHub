import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useTargetsData from '../../hooks/useTargetsData.js';
import { listOpenPlans, loadRecommendations } from '../../services/itemsureRestockService.js';
import { notifyInventoryChanged, onInventoryChanged } from '../../utils/itemsureChanges.js';
import { findBalance, NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { categoryOptions, categoryPath, categoryTree, inCategory } from '../../utils/itemsureCategories.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import ItemsureRestockAction from './ItemsureRestockAction.jsx';
import ItemsureRestockCard from './ItemsureRestockCard.jsx';
import ItemsureRestockPlans from './ItemsureRestockPlans.jsx';
import { ErrorNote, Field, LoadFailed, Modal, PageHead } from './ItemsureUi.jsx';

const GROUPS = {
  location: { label: 'Location', of: (r) => r.location_name },
  area: { label: 'Spot', of: (r) => `${r.location_name} · ${r.area_name || NO_AREA_LABEL}` },
  category: { label: 'Category', of: (r, cats) => cats.get(r.category_id) || 'No category' },
  status: { label: 'Status', of: (r) => TARGET_STATUS[r.status].label },
};

function EmptyState({ data }) {
  const hasPar = data.targets.some((t) => t.par_text !== null);
  const pending = data.targets.filter((t) => !findBalance(data.balances, t.item_id, t.location_id, t.storage_area_id)).length;
  return (
    <div className="isu-card isu-empty">
      {hasPar ? (
        <>
          <h2>Nothing to buy or move</h2>
          <p className="isu-muted">Everything with warning levels is full enough.</p>
        </>
      ) : data.targets.length ? (
        <>
          <h2>Nothing is running low</h2>
          <p className="isu-muted">You&apos;ve set &ldquo;Warn me at&rdquo; numbers but no &ldquo;Fill up to&rdquo; numbers. Add a &ldquo;Fill up to&rdquo; to get suggested amounts.</p>
        </>
      ) : (
        <>
          <h2>No &ldquo;Fill up to&rdquo; numbers yet</h2>
          <p className="isu-muted">Open an item, choose Set levels, and enter &ldquo;Fill up to&rdquo;. ItemSure will then tell you how many to buy or move.</p>
        </>
      )}
      <p><Link to={`${ITEMSURE_PATH}/levels`}>Set warning levels for many items</Link></p>
      {pending ? <p className="isu-muted isu-small">{pending} level{pending === 1 ? ' is' : 's are'} set for stock that isn&apos;t set up yet. Count those first.</p> : null}
    </div>
  );
}

/** Below-par and low shortages with internal transfer suggestions first, then outside purchase. */
export default function ItemsureRestock() {
  const { organization, features, can } = useItemsureWorkspace();
  const { data, error: dataError, reload: reloadData } = useTargetsData(organization.id);
  const [recs, setRecs] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ locationId: '', categoryId: '', status: '', group: 'location' });
  const [action, setAction] = useState(null);
  const canTransfer = can('inventory.transfer');

  const load = useCallback(async () => {
    try {
      const [nextRecs, nextPlans] = await Promise.all([loadRecommendations(organization.id), listOpenPlans(organization.id)]);
      setRecs(nextRecs);
      setPlans(nextPlans);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [organization.id]);

  useEffect(() => {
    load();
    const stop = onInventoryChanged(() => {
      load();
      reloadData();
    });
    return stop;
  }, [load, reloadData]);

  const afterAction = async () => {
    setAction(null);
    notifyInventoryChanged();
  };

  const itemsById = useMemo(() => new Map((data?.items || []).map((i) => [i.id, i])), [data]);
  const tree = useMemo(() => categoryTree(data?.categories || []), [data]);
  const categoryNames = useMemo(() => new Map([...tree.byId.keys()].map((id) => [id, categoryPath(tree, id)])), [tree]);

  const shown = useMemo(
    () =>
      (recs || []).filter(
        (r) =>
          (!filters.locationId || r.location_id === filters.locationId) &&
          inCategory(tree, r, filters.categoryId) &&
          (!filters.status || r.status === filters.status),
      ),
    [recs, filters, tree],
  );

  const groups = useMemo(() => {
    const map = new Map();
    shown.forEach((r) => {
      const label = GROUPS[filters.group].of(r, categoryNames);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(r);
    });
    return [...map.entries()];
  }, [shown, filters.group, categoryNames]);

  const openAction = (kind, rec, move) => {
    const item = itemsById.get(rec.item_id);
    if (!item) return;
    setAction({
      kind,
      item,
      from: { locationId: move.location_id, storageAreaId: move.storage_area_id },
      to: { locationId: rec.location_id, storageAreaId: rec.storage_area_id },
      quantity: move.quantity,
    });
  };
  const openComplete = (plan, item) =>
    setAction({
      kind: 'complete',
      item,
      planId: plan.id,
      from: { locationId: plan.from_location_id, storageAreaId: plan.from_storage_area_id },
      to: { locationId: plan.to_location_id, storageAreaId: plan.to_storage_area_id },
      quantity: plan.quantity_text,
    });

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const ready = data && recs;

  return (
    <div className="isu-page">
      <PageHead
        title="Shopping list"
        description={features.transfers
          ? 'What to buy, and what you can move from another place instead. Amounts fill each place back up to its "Fill up to" number.'
          : 'What to buy. Amounts fill each place back up to its "Fill up to" number.'}
      />
      {ready ? <ErrorNote message={error || dataError} /> : null}
      {!ready && (error || dataError) ? <LoadFailed message={error || dataError} onRetry={() => { load(); reloadData(); }} /> : null}
      {!ready && !error && !dataError ? <p className="isu-muted">Loading…</p> : null}

      {ready && recs.length ? (
        <div className="isu-filters">
          <Field label="Location">
            <select value={filters.locationId} onChange={(e) => set({ locationId: e.target.value })}>
              <option value="">All locations</option>
              {data.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={filters.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              <option value="">All categories</option>
              {categoryOptions(tree).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="">Running low and needs topping up</option>
              <option value="low">Running low only</option>
              <option value="below_par">Needs topping up only</option>
            </select>
          </Field>
          <Field label="Group by">
            <select value={filters.group} onChange={(e) => set({ group: e.target.value })}>
              {Object.entries(GROUPS)
                .filter(([key]) => features.spots || key !== 'area' || filters.group === 'area')
                .map(([key, g]) => <option key={key} value={key}>{g.label}</option>)}
            </select>
          </Field>
        </div>
      ) : null}

      {ready && !recs.length ? <EmptyState data={data} /> : null}
      {ready && recs.length > 0 && !shown.length ? <p className="isu-muted">Nothing matches these filters.</p> : null}

      {groups.map(([label, rows]) => (
        <section key={label} className="isu-restock-group">
          <h2>{label} <span className="isu-muted isu-small">({rows.length})</span></h2>
          <ul className="isu-levels-list">
            {rows.map((r) => (
              <ItemsureRestockCard key={r.target_id} rec={r} canTransfer={canTransfer} showMoves={features.transfers} onAction={openAction} />
            ))}
          </ul>
        </section>
      ))}

      {data ? <ItemsureRestockPlans plans={plans} data={data} canTransfer={canTransfer} onComplete={openComplete} onChanged={async () => notifyInventoryChanged()} /> : null}

      <Modal open={Boolean(action)} title={action ? { transfer: 'Transfer stock', plan: 'Plan a transfer', complete: 'Complete planned transfer' }[action.kind] : ''} onClose={() => setAction(null)}>
        {action ? <ItemsureRestockAction action={action} locations={data.locations} onDone={afterAction} /> : null}
      </Modal>
    </div>
  );
}
