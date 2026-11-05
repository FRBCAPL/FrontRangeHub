import { useEffect, useState } from 'react';
import { getPosConnection } from '../services/itemsurePosService.js';
import { getPosAutoStatus } from '../services/itemsurePosAutoService.js';
import { getPosStockStatus } from '../services/itemsurePosStockService.js';
import { onInventoryChanged } from '../utils/itemsureChanges.js';
import { cloverProblem } from '../utils/itemsureTodayClover.js';

const quietly = (promise) => promise.catch(() => null);

/**
 * Clover status for the Today list (read-only): { problem, takeOn, stockThrough }.
 * manage: may fix Clover settings (connection and import problems). take: may take sales off stock.
 */
export default function useTodayClover(organizationId, { manage, take }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!manage && !take) return undefined;
    let alive = true;
    const load = async () => {
      const [conn, auto, stock] = await Promise.all([
        manage ? quietly(getPosConnection(organizationId)) : null,
        manage ? quietly(getPosAutoStatus(organizationId)) : null,
        take ? quietly(getPosStockStatus(organizationId)) : null,
      ]);
      if (!alive) return;
      setStatus({
        problem: cloverProblem(conn?.connection, auto?.missing ? null : auto),
        takeOn: Boolean(stock?.on),
        stockThrough: stock?.stock_through || null,
      });
    };
    load();
    const off = onInventoryChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, [organizationId, manage, take]);

  return status;
}
