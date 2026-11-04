import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { listCatalog } from '../../services/itemsureItemService.js';
import {
  addPosLink, listItemContents, listPosItems, listPosLinks, listPosPours, removePosLink, saveItemContent, setPosPour,
} from '../../services/itemsurePosService.js';
import { withCategoryDefaults } from '../../utils/itemsureCategoryDefaults.js';
import { listItemPieces, saveItemPieces } from '../../services/itemsureItemContentService.js';
import { groupByMainMatch, MATCH_FILTERS, posRows, suggestMatch } from '../../utils/itemsurePosMatch.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsurePosMatchRow from './ItemsurePosMatchRow.jsx';
import ItemsurePosSuggestReview from './ItemsurePosSuggestReview.jsx';

const SHOW_AT_ONCE = 60;

/**
 * Match Clover items to ItemSure items: "Not matched" first, with suggestions by name and a
 * "Match all suggestions" shortcut. Matching never changes stock. `reloadKey` changes after
 * Clover items are brought in again; `onChanged` runs after anything here is saved.
 */
export default function ItemsurePosMatch({ organizationId, canMatch, reloadKey, onChanged }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('todo');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(SHOW_AT_ONCE);
  const [asking, setAsking] = useState(() => new Set()); // just matched: "Anything else?" until Done
  const [reviewing, setReviewing] = useState(false);
  const { busy, error, setError, run } = useItemsureAction();

  const load = useCallback(async () => {
    try {
      const [posItems, links, catalog, ownPours, ownContents, ownPieces] = await Promise.all([
        listPosItems(organizationId), listPosLinks(organizationId), listCatalog(organizationId),
        listPosPours(organizationId), listItemContents(organizationId), listItemPieces(organizationId),
      ]);
      const filled = withCategoryDefaults({
        links, pours: ownPours, contents: ownContents, pieces: ownPieces, items: catalog.items, categories: catalog.categories, defaults: catalog.categoryDefaults,
      });
      setData({ posItems, links, items: catalog.items, units: catalog.units, ...filled, piecesReady: ownPieces !== null });
    } catch (e) {
      setError(e.message);
      setData((d) => d || { posItems: [], links: new Map(), items: [], units: [], pours: null, contents: null });
    }
  }, [organizationId, setError]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);
  const refresh = async () => {
    await load();
    onChanged?.();
  };

  const itemsById = useMemo(() => new Map((data?.items || []).map((i) => [i.id, i])), [data]);
  const choices = useMemo(() => (data?.items || []).filter((i) => i.is_active), [data]);
  const pourInfo = useMemo(() => {
    if (!data?.pours) return null;
    const codes = new Map((data.units || []).map((u) => [u.id, u.code]));
    return {
      pours: data.pours,
      contents: data.contents,
      contentFrom: data.contentFrom,
      pieces: data.pieces,
      piecesFrom: data.piecesFrom,
      piecesReady: data.piecesReady,
      unitFor: (itemId) => (data.units || []).find((u) => u.id === itemsById.get(itemId)?.base_unit_id) || null,
      unitCodeFor: (itemId) => codes.get(itemsById.get(itemId)?.base_unit_id) || '' };
  }, [data, itemsById]);
  const rows = useMemo(() => (data ? posRows(data.posItems, data.links, { filter, search, keep: asking }) : []), [data, filter, search, asking]);
  const suggestions = useMemo(() => {
    const map = new Map();
    if (!data || !canMatch) return map;
    for (const p of rows) {
      if ((data.links.get(p.external_id) || []).length) continue;
      const s = suggestMatch(p.name, choices);
      if (s) map.set(p.external_id, s);
    }
    return map;
  }, [data, rows, choices, canMatch]);
  const counts = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(Object.keys(MATCH_FILTERS).map((k) => [k, posRows(data.posItems, data.links, { filter: k }).length]));
  }, [data]);

  if (!data) return <p className="isu-muted">Loading Clover items…</p>;
  if (!data.posItems.length) {
    return <p className="isu-muted">No Clover items yet. Tap &ldquo;Bring in Clover items&rdquo; above.</p>;
  }

  const setAsk = (externalId, on) => setAsking((s) => {
    const next = new Set(s);
    if (on) next.add(externalId);
    else next.delete(externalId);
    return next;
  });
  const add = (externalId, itemId) => run(async () => {
    const first = !(data.links.get(externalId) || []).length;
    await addPosLink(organizationId, externalId, itemId);
    if (first) setAsk(externalId, true);
    await refresh();
  });
  const remove = (externalId, itemId) => run(async () => {
    await removePosLink(organizationId, externalId, itemId);
    await refresh();
  });
  const savePour = (externalId, itemId, amount, unit, contentMl, pieces) => run(async () => {
    if (contentMl !== undefined) await saveItemContent(organizationId, itemId, contentMl);
    if (pieces !== undefined) await saveItemPieces(organizationId, itemId, pieces);
    await setPosPour(organizationId, externalId, itemId, amount, unit);
    await refresh();
  });
  const grouped = filter === 'done';
  const row = (p) => (
    <ItemsurePosMatchRow
      key={p.external_id}
      pos={p}
      matchedIds={data.links.get(p.external_id) || []}
      itemsById={itemsById}
      choices={choices}
      suggestion={suggestions.get(p.external_id) || null}
      canMatch={canMatch}
      busy={busy}
      asking={asking.has(p.external_id) && (data.links.get(p.external_id) || []).length > 0}
      onDone={() => setAsk(p.external_id, false)}
      onAdd={(itemId) => add(p.external_id, itemId)}
      onRemove={(itemId) => remove(p.external_id, itemId)}
      pourInfo={pourInfo}
      onSavePour={(itemId, amount, unit, contentMl, pieces) => savePour(p.external_id, itemId, amount, unit, contentMl, pieces)}
    />
  );
  const matchAll = () => run(async () => {
    for (const [externalId, item] of suggestions) await addPosLink(organizationId, externalId, item.id);
    await refresh();
  });
  const matchSome = async (list) => {
    const ok = await run(async () => {
      for (const { pos, item } of list) await addPosLink(organizationId, pos.external_id, item.id);
    });
    await refresh();
    if (ok) setReviewing(false);
  };

  return (
    <div className="isu-stack isu-pos-match">
      <p className="isu-muted isu-small">
        Tell ItemSure which of your items each Clover item uses, and how much each sale uses (like 1.5 oz of rum). A drink can use more than one item. This never changes stock.
      </p>
      <div className="isu-pos-filters" role="group" aria-label="Show">
        {Object.entries(MATCH_FILTERS).map(([key, label]) => (
          <button key={key} type="button" className={`isu-chip${filter === key ? ' is-active' : ''}`} aria-pressed={filter === key} onClick={() => { setFilter(key); setLimit(SHOW_AT_ONCE); }}>
            {label} ({counts[key] || 0})
          </button>
        ))}
      </div>
      <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setLimit(SHOW_AT_ONCE); }} placeholder="Find a Clover item" aria-label="Find a Clover item" />
      {canMatch && suggestions.size ? (
        <div className="isu-pos-actions">
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setReviewing(true)}>
            Review {suggestions.size} suggestion{suggestions.size === 1 ? '' : 's'}
          </button>
          {suggestions.size > 1 ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={matchAll}>
              Match all {suggestions.size} suggestions
            </button>
          ) : null}
        </div>
      ) : null}
      <Modal open={reviewing} title="Review suggested matches" onClose={() => setReviewing(false)}>
        {reviewing ? (
          <ItemsurePosSuggestReview
            suggestions={rows.filter((p) => suggestions.has(p.external_id)).map((p) => ({ pos: p, item: suggestions.get(p.external_id) }))}
            busy={busy}
            error={error}
            onMatch={matchSome}
            onCancel={() => setReviewing(false)}
          />
        ) : null}
      </Modal>
      <ErrorNote message={error} />
      {!rows.length ? <p className="isu-muted">{filter === 'todo' && !search ? 'Everything is matched.' : 'Nothing matches.'}</p> : null}
      {grouped ? (
        groupByMainMatch(rows, data.links, itemsById).map((g) => (
          <details key={g.key || 'other'} className="isu-pos-group" open={Boolean(search.trim())}>
            <summary className="isu-pos-group-title">{g.label} <span className="isu-muted isu-small">({g.rows.length})</span></summary>
            <ul className="isu-pos-list">{g.rows.map(row)}</ul>
          </details>
        ))
      ) : (
        <ul className="isu-pos-list">{rows.slice(0, limit).map(row)}</ul>
      )}
      {!grouped && rows.length > limit ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setLimit((n) => n + SHOW_AT_ONCE)}>
          Show more ({rows.length - limit} left)
        </button>
      ) : null}
    </div>
  );
}
