import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listCatalog } from '../services/itemsureItemService.js';
import {
  getPosConnection, listItemContents, listPosItems, listPosLinks, listPosPours, syncCloverSales,
} from '../services/itemsurePosService.js';
import { listSalesSyncs, salesHours } from '../services/itemsurePosSalesService.js';
import { listItemPieces } from '../services/itemsureItemContentService.js';
import { withCategoryDefaults } from '../utils/itemsureCategoryDefaults.js';
import { salesCovered } from '../utils/itemsurePosUsage.js';
import { itemSalesRows, periodRange, salesTotals, unmatchedRows } from '../utils/itemsureCloverSales.js';

const MAX_SYNC_MS = 44 * 24 * 3600 * 1000;

const latestThrough = (syncs) => syncs.reduce((max, s) => (Date.parse(s.to_at) > Date.parse(max || 0) ? s.to_at : max), null);

/**
 * Data for the Clover sales page: for the chosen period, what each item sold and how much stock
 * that is. Missing sales are brought in from Clover once per period (and on request). Read only.
 */
export default function useCloverSales(organizationId) {
  const [base, setBase] = useState(null);
  const [period, setPeriod] = useState({ key: 'week', from: '', to: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [setupKey, setSetupKey] = useState(0);
  const autoSynced = useRef(new Set());

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { connection, salesReady } = await getPosConnection(organizationId);
        if (!connection || !salesReady) {
          if (live) setBase({ connection, salesReady });
          return;
        }
        const [links, ownPours, ownContents, catalog, posItems, ownPieces] = await Promise.all([
          listPosLinks(organizationId), listPosPours(organizationId), listItemContents(organizationId),
          listCatalog(organizationId), listPosItems(organizationId), listItemPieces(organizationId),
        ]);
        if (!live) return;
        const codes = new Map(catalog.units.map((u) => [u.id, u.code]));
        const { pours, contents, pieces } = withCategoryDefaults({
          links, pours: ownPours, contents: ownContents, pieces: ownPieces, items: catalog.items, categories: catalog.categories, defaults: catalog.categoryDefaults,
        });
        setBase({
          connection, salesReady, links, pours, contents, pieces,
          itemsById: new Map(catalog.items.map((i) => [i.id, i])),
          unitCodes: new Map(catalog.items.map((i) => [i.id, codes.get(i.base_unit_id) || ''])),
          posNames: new Map(posItems.map((p) => [p.external_id, p.name])),
        });
      } catch (e) {
        if (live) {
          setError(e.message);
          setBase((b) => b || { connection: null, salesReady: false });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [organizationId, setupKey]);

  const range = useMemo(() => periodRange(period.key, new Date(), period), [period]);

  const load = useCallback(async ({ forceSync = false } = {}) => {
    if (!base?.links || !range) {
      setResult(null);
      return;
    }
    setError('');
    setResult((r) => (r ? { ...r, loading: true } : { loading: true }));
    try {
      const toAt = new Date(Math.min(range.to.getTime(), Date.now())).toISOString();
      const fromAt = new Date(Math.max(range.from.getTime(), Date.parse(toAt) - MAX_SYNC_MS)).toISOString();
      const key = `${range.from.getTime()}|${range.to.getTime()}`;
      let syncs = await listSalesSyncs(organizationId);
      let syncNote = '';
      if (Date.parse(fromAt) < Date.parse(toAt) && (forceSync || (!autoSynced.current.has(key) && !salesCovered(syncs, fromAt, toAt)))) {
        autoSynced.current.add(key);
        setSyncing(true);
        try {
          const got = await syncCloverSales(organizationId, fromAt, toAt);
          syncNote = `Brought in ${got?.lines ?? 0} sales from ${got?.orders ?? 0} Clover orders.`;
          syncs = await listSalesSyncs(organizationId);
        } catch (e) {
          syncNote = `Could not bring in new sales: ${e.message} Showing what was brought in before.`;
        } finally {
          setSyncing(false);
        }
      }
      const hours = await salesHours(organizationId, new Date(range.from.getTime() - 1).toISOString(), new Date(range.to.getTime() - 1).toISOString());
      const totals = salesTotals(hours);
      const rows = itemSalesRows({ totals, ...base });
      setResult({
        loading: false,
        syncNote,
        through: latestThrough(syncs),
        total: [...totals.values()].reduce((sum, q) => sum + q, 0),
        rows,
        unmatched: unmatchedRows(totals, base.links, base.posNames),
      });
    } catch (e) {
      setError(e.message);
      setResult(null);
    }
  }, [base, range, organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    base, period, setPeriod, range, result, error, syncing,
    bringInSales: () => load({ forceSync: true }),
    refreshSetup: () => setSetupKey((k) => k + 1),
  };
}
