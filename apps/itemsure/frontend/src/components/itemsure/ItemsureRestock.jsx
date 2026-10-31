import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useTargetsData from '../../hooks/useTargetsData.js';
import useSuppliers from '../../hooks/useSuppliers.js';
import useShoppingTicks from '../../hooks/useShoppingTicks.js';
import { listOpenPlans, loadRecommendations } from '../../services/itemsureRestockService.js';
import { notifyInventoryChanged, onInventoryChanged } from '../../utils/itemsureChanges.js';
import { findBalance, NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { categoryPath, categoryTree, inCategory } from '../../utils/itemsureCategories.js';
import { buyGroups, moveRows, NO_SUPPLIER } from '../../utils/itemsureShoppingList.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { SITE } from '../../data/itemsureTerms.js';
import ItemsureRestockAction from './ItemsureRestockAction.jsx';
import ItemsureRestockPlans from './ItemsureRestockPlans.jsx';
import ItemsureShoppingBuy from './ItemsureShoppingBuy.jsx';
import ItemsureShoppingFilters from './ItemsureShoppingFilters.jsx';
import ItemsureShoppingMoves from './ItemsureShoppingMoves.jsx';
import { ErrorNote, LoadFailed, Modal, PageHead } from './ItemsureUi.jsx';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

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

/** What to buy (by supplier), what to move instead, and planned transfers. */
export default function ItemsureRestock() {
  const { organization, features, can } = useItemsureWorkspace();
  const { data, error: dataError, reload: reloadData } = useTargetsData(organization.id);
  const suppliers = useSuppliers(organization.id);
  const [recs, setRecs] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ locationId: '', categoryId: '', status: '', group: '' });
  const [action, setAction] = useState(null);
  const canTransfer = can('inventory.transfer');
  const showMoves = features.transfers;

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

  const reloadSuppliers = suppliers.reload;
  useEffect(() => {
    load();
    const stop = onInventoryChanged(() => {
      load();
      reloadData();
      reloadSuppliers();
    });
    return stop;
  }, [load, reloadData, reloadSuppliers]);

  const afterAction = async () => {
    setAction(null);
    notifyInventoryChanged();
  };

  const itemsById = useMemo(() => new Map((data?.items || []).map((i) => [i.id, i])), [data]);
  const tree = useMemo(() => categoryTree(data?.categories || []), [data]);
  const categoryNames = useMemo(() => new Map([...tree.byId.keys()].map((id) => [id, categoryPath(tree, id)])), [tree]);
  const listedIds = useMemo(() => (recs ? new Set(recs.map((r) => r.item_id)) : null), [recs]);
  const ticks = useShoppingTicks(organization.id, listedIds);

  const { available: hasSuppliers, links: supplierLinks, suppliers: supplierList } = suppliers;
  const groupChoices = useMemo(() => {
    const names = new Map(supplierList.map((s) => [s.id, s.name]));
    const choices = {};
    if (hasSuppliers) choices.supplier = { label: 'Supplier', of: (r) => names.get(supplierLinks.get(r.item_id)) || NO_SUPPLIER, last: NO_SUPPLIER };
    choices.location = { label: SITE, of: (r) => r.location_name };
    if (features.spots) choices.area = { label: 'Spot', of: (r) => `${r.location_name} · ${r.area_name || NO_AREA_LABEL}` };
    choices.category = { label: 'Category', of: (r) => categoryNames.get(r.category_id) || 'No category', last: 'No category' };
    choices.status = { label: 'Status', of: (r) => TARGET_STATUS[r.status].label };
    return choices;
  }, [hasSuppliers, supplierLinks, supplierList, features.spots, categoryNames]);
  const group = groupChoices[filters.group] ? filters.group : Object.keys(groupChoices)[0];

  const placed = useMemo(
    () => (recs || []).filter((r) => (!filters.locationId || r.location_id === filters.locationId) && inCategory(tree, r, filters.categoryId)),
    [recs, filters.locationId, filters.categoryId, tree],
  );
  const counts = useMemo(() => {
    const items = (status) => new Set(placed.filter((r) => !status || r.status === status).map((r) => r.item_id)).size;
    return { all: items(''), low: items('low'), below_par: items('below_par') };
  }, [placed]);
  const shown = useMemo(() => placed.filter((r) => !filters.status || r.status === filters.status), [placed, filters.status]);

  const toBuy = useMemo(() => {
    const choice = groupChoices[group];
    return buyGroups(shown, { showMoves, groupOf: choice.of, lastGroup: choice.last });
  }, [shown, showMoves, groupChoices, group]);
  const moves = useMemo(() => moveRows(shown, showMoves), [shown, showMoves]);

  const buyCount = new Set(toBuy.flatMap((g) => g.rows.map((r) => r.itemId))).size;
  const supplierCount = group === 'supplier' ? toBuy.filter((g) => g.label !== NO_SUPPLIER).length : 0;
  const summary = [
    buyCount ? `${plural(buyCount, 'item')} to buy${supplierCount ? ` from ${plural(supplierCount, 'supplier')}` : ''}` : 'Nothing to buy',
    moves.length ? `${moves.length} can be moved instead` : '',
  ].filter(Boolean).join(' \u00b7 ');

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
  const withLocation = (data?.locations.length || 0) > 1;

  return (
    <div className="isu-page">
      <PageHead
        title="Shopping list"
        description={showMoves
          ? 'What to buy, and what you can move from another place instead. Amounts fill each place back up to its "Fill up to" number.'
          : 'What to buy. Amounts fill each place back up to its "Fill up to" number.'}
      />
      {ready ? <ErrorNote message={error || dataError} /> : null}
      {!ready && (error || dataError) ? <LoadFailed message={error || dataError} onRetry={() => { load(); reloadData(); }} /> : null}
      {!ready && !error && !dataError ? <p className="isu-muted">Loading…</p> : null}

      {ready && recs.length ? (
        <>
          <p className="isu-shop-summary">{summary}</p>
          <ItemsureShoppingFilters filters={{ ...filters, group }} onChange={set} groups={groupChoices} locations={data.locations} tree={tree} counts={counts} />
        </>
      ) : null}

      {ready && !recs.length ? <EmptyState data={data} /> : null}
      {ready && recs.length > 0 && !shown.length ? <p className="isu-muted">Nothing matches these filters.</p> : null}

      {ready ? <ItemsureShoppingBuy groups={toBuy} ticks={ticks} withLocation={withLocation} /> : null}
      {ready ? <ItemsureShoppingMoves moves={moves} canTransfer={canTransfer} withLocation={withLocation} onAction={openAction} /> : null}
      {data ? <ItemsureRestockPlans plans={plans} data={data} canTransfer={canTransfer} onComplete={openComplete} onChanged={async () => notifyInventoryChanged()} /> : null}

      <Modal open={Boolean(action)} title={action ? { transfer: 'Transfer stock', plan: 'Plan a transfer', complete: 'Complete planned transfer' }[action.kind] : ''} onClose={() => setAction(null)}>
        {action ? <ItemsureRestockAction action={action} locations={data.locations} onDone={afterAction} /> : null}
      </Modal>
    </div>
  );
}
