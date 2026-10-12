import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBillingStatus } from '../services/duezyBillingService.js';

const BillingContext = createContext({ access: null, loading: false, refresh: () => {} });

/** Loads the signed-in owner's billing snapshot once and shares it with every Duezy screen. */
export function DuezyBillingProvider({ children }) {
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setAccess(await getBillingStatus());
    } catch {
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ access, loading, refresh }), [access, loading, refresh]);
  return createElement(BillingContext.Provider, { value }, children);
}

export default function useDuezyBilling() {
  return useContext(BillingContext);
}
