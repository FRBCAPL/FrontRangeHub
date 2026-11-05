import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { listPosLinks } from '../services/itemsurePosService.js';
import { listNotSoldInPos } from '../services/itemsureItemPosSkipService.js';
import { itemsNotOnClover, matchedItemIds } from '../utils/itemsurePosMatch.js';

/**
 * Items page "not matched to Clover" filter. Loads matches and Not sold in Clover marks itself,
 * and again whenever the page's location changes (the item window closing), so an item that was
 * just matched or marked drops off. { ready, error, keep(item) }; keep is null when `on` is false.
 */
export default function useCloverItemFilter(organizationId, on) {
  const { key } = useLocation();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!on) return undefined;
    let alive = true;
    Promise.all([listPosLinks(organizationId), listNotSoldInPos(organizationId)])
      .then(([links, notSold]) => alive && setData({ matched: matchedItemIds(links), notSold: notSold || new Set() }))
      .catch((e) => alive && setData({ error: e.message }));
    return () => {
      alive = false;
    };
  }, [organizationId, on, key]);

  const keep = useCallback(
    (item) => Boolean(data?.matched) && itemsNotOnClover([{ ...item, notSoldInPos: data.notSold.has(item.id) }], data.matched).length > 0,
    [data],
  );

  if (!on) return { ready: true, error: '', keep: null };
  return { ready: Boolean(data?.matched), error: data?.error || '', keep };
}
