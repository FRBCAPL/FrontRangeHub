import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listCatalog } from '../services/itemsureItemService.js';
import { listLocations } from '../services/itemsureLocationService.js';
import {
  getPosConnection, listItemContents, listPosItems, listPosLinks, listPosPours, syncCloverSales,
} from '../services/itemsurePosService.js';
import { listApprovedCounts, listSalesSyncs, salesHours, siteUsage } from '../services/itemsurePosSalesService.js';
import { listCategoryDefaults } from '../services/itemsureCategoryDefaultService.js';
import { listItemPieces } from '../services/itemsureItemContentService.js';
import { doublesByCategory, usualPourFor, withCategoryDefaults } from '../utils/itemsureCategoryDefaults.js';
import { countRounds, expectedUse, salesCovered, salesHourRange, salesIndex, usageRows } from '../utils/itemsurePosUsage.js';
import { listModifiers, modifierHours } from '../services/itemsurePosModifierService.js';
import { addModifierUse, asSalesRows, modifierSetup, modifierUse } from '../utils/itemsurePosModifiers.js';

const MAX_SYNC_MS = 44 * 24 * 3600 * 1000;

/**
 * Data for "Sales vs counts": the Clover connection, approved counts by site grouped into
 * daily rounds, and, for the chosen pair of rounds, what sales and counts each say was used
 * (each item over its own count times). Sales are brought in from Clover automatically the
 * first time a pair is opened (and on request).
 */
export default function usePosSalesReport(organizationId) {
  const [base, setBase] = useState(null);
  const [siteId, setSiteId] = useState('');
  const [pair, setPair] = useState({ from: '', to: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const autoSynced = useRef(new Set());

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { connection, salesReady } = await getPosConnection(organizationId);
        if (!connection || !salesReady) {
          if (live) setBase({ connection, salesReady, counts: [] });
          return;
        }
        const [counts, links, ownPours, ownContents, catalog, locations, posItems, ownPieces, modifiers] = await Promise.all([
          listApprovedCounts(organizationId), listPosLinks(organizationId), listPosPours(organizationId),
          listItemContents(organizationId), listCatalog(organizationId), listLocations(organizationId), listPosItems(organizationId),
          listItemPieces(organizationId), listModifiers(organizationId).catch(() => null),
        ]);
        if (!live) return;
        const codes = new Map(catalog.units.map((u) => [u.id, u.code]));
        const { pours, contents, pieces } = withCategoryDefaults({
          links, pours: ownPours, contents: ownContents, pieces: ownPieces, items: catalog.items, categories: catalog.categories, defaults: catalog.categoryDefaults, units: catalog.units,
        });
        setBase({
          connection, salesReady, counts, links, pours, contents, pieces, locations, items: catalog.items, categories: catalog.categories, units: catalog.units,
          itemsById: new Map(catalog.items.map((i) => [i.id, i])),
          unitCodes: new Map(catalog.items.map((i) => [i.id, codes.get(i.base_unit_id) || ''])),
          posNames: new Map(posItems.map((p) => [p.external_id, p.name])),
          modifiers: modifierSetup(modifiers),
          doubles: doublesByCategory({ links, items: catalog.items, categories: catalog.categories, defaults: catalog.categoryDefaults }),
          usual: usualPourFor({ items: catalog.items, categories: catalog.categories, defaults: catalog.categoryDefaults, units: catalog.units }),
        });
        const first = connection.location_id && counts.some((c) => c.locationId === connection.location_id)
          ? connection.location_id : counts[0]?.locationId || '';
        setSiteId(first);
      } catch (e) {
        if (live) {
          setError(e.message);
          setBase((b) => b || { connection: null, salesReady: false, counts: [] });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [organizationId]);

  const counts = base?.counts;
  const rounds = useMemo(() => countRounds((counts || []).filter((c) => c.locationId === siteId)), [counts, siteId]);

  /** After a "Fix it": reload amounts and sizes only, keeping the chosen counts. */
  const refreshSetup = useCallback(async () => {
    try {
      const [links, ownPours, ownContents, defaults, ownPieces] = await Promise.all([
        listPosLinks(organizationId), listPosPours(organizationId), listItemContents(organizationId), listCategoryDefaults(organizationId),
        listItemPieces(organizationId),
      ]);
      setBase((b) => (b ? {
        ...b,
        links,
        ...withCategoryDefaults({ links, pours: ownPours, contents: ownContents, pieces: ownPieces, items: b.items, categories: b.categories, defaults, units: b.units }),
        doubles: doublesByCategory({ links, items: b.items, categories: b.categories, defaults }),
        usual: usualPourFor({ items: b.items, categories: b.categories, defaults, units: b.units }),
      } : b));
    } catch (e) {
      setError(e.message);
    }
  }, [organizationId]);
  useEffect(() => {
    setPair({ from: rounds[1]?.key || '', to: rounds[0]?.key || '' });
  }, [rounds]);

  const compare = useCallback(async ({ forceSync = false } = {}) => {
    const start = rounds.find((r) => r.key === pair.from);
    const end = rounds.find((r) => r.key === pair.to);
    if (!base?.links || !start || !end || start === end) {
      setResult(null);
      return;
    }
    setError('');
    setResult((r) => (r ? { ...r, loading: true } : { loading: true }));
    try {
      if (Date.parse(end.endAt) <= Date.parse(start.endAt)) throw new Error('Pick a "To" count that is later than the "From" count.');
      const usage = await siteUsage(siteId, start.endAt, end.endAt);
      if (usage.missing) throw new Error('This report needs one more database update (20261030003800_pos_site_usage.sql).');
      const times = (key) => usage.rows.map((u) => Date.parse(u[key]));
      const fromAt = usage.rows.length ? new Date(Math.min(...times('from_at'))).toISOString() : start.endAt;
      const toAt = usage.rows.length ? new Date(Math.max(...times('to_at'))).toISOString() : end.endAt;
      const key = `${siteId}|${pair.from}|${pair.to}`;
      let syncNote = '';
      const syncFrom = new Date(Math.max(Date.parse(fromAt), Date.parse(toAt) - MAX_SYNC_MS)).toISOString();
      const needSync = forceSync || (!autoSynced.current.has(key) && !salesCovered(await listSalesSyncs(organizationId), syncFrom, toAt));
      if (needSync) {
        autoSynced.current.add(key);
        setSyncing(true);
        try {
          const got = await syncCloverSales(organizationId, syncFrom, toAt);
          syncNote = `Brought in ${got?.lines ?? 0} sales from ${got?.orders ?? 0} Clover orders.`;
        } catch (e) {
          syncNote = `Could not bring in new sales: ${e.message} Showing what was brought in before.`;
        } finally {
          setSyncing(false);
        }
      }
      const range = salesHourRange(fromAt, toAt);
      const soldIn = salesIndex(await salesHours(organizationId, range.after, range.upTo));
      const windows = new Map(usage.rows.map((u) => [u.item_id, [u.from_at, u.to_at]]));
      const sold = (cloverId, itemId) => {
        const [from, to] = windows.get(itemId) || [fromAt, toAt];
        return soldIn(cloverId, from, to);
      };
      const expected = expectedUse({ links: base.links, sold, pours: base.pours, unitCodes: base.unitCodes, contents: base.contents, pieces: base.pieces });
      if (base.modifiers.rules.size) {
        const modRows = asSalesRows(await modifierHours(organizationId, range.after, range.upTo).catch(() => null));
        const modIn = salesIndex(modRows);
        addModifierUse(expected, modifierUse({
          keys: [...new Set(modRows.map((h) => h.external_id))],
          qtyFor: (cloverId, modifierId, itemId) => {
            const [from, to] = windows.get(itemId) || [fromAt, toAt];
            return modIn(`${cloverId}|${modifierId}`, from, to);
          },
          rules: base.modifiers.rules,
          names: base.modifiers.names,
          links: base.links, pours: base.pours, unitCodes: base.unitCodes, contents: base.contents, pieces: base.pieces, doubles: base.doubles, usual: base.usual,
        }));
      }
      setResult({ loading: false, fromAt, toAt, syncNote, rows: usageRows(usage.rows, expected, base.itemsById) });
    } catch (e) {
      setError(e.message);
      setResult(null);
    }
  }, [base, pair, rounds, siteId, organizationId]);

  useEffect(() => {
    compare();
  }, [compare]);

  return { base, siteId, setSiteId, rounds, pair, setPair, result, error, syncing, bringInSales: () => compare({ forceSync: true }), refreshSetup };
}
