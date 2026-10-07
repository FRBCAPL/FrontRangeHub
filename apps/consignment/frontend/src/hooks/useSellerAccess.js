import { useCallback, useEffect, useState } from 'react';
import { onAuthChange } from '../services/consignmentAuctionService.js';
import { loadMySellerStatus, requestSellerAccess } from '../services/consignmentSellerAccessService.js';

/** Signed-in user's seller access, refreshed on login/logout. */
export default function useSellerAccess() {
  const [state, setState] = useState({ loading: true, loggedIn: false, seller: false, requestedAt: null, error: '' });

  const refresh = useCallback(async () => {
    try {
      const status = await loadMySellerStatus();
      setState({ loading: false, error: '', ...status });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    refresh();
    return onAuthChange(() => refresh());
  }, [refresh]);

  const request = useCallback(async () => {
    try {
      await requestSellerAccess();
      await refresh();
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
    }
  }, [refresh]);

  return { ...state, request };
}
