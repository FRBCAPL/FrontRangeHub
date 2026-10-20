import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@shared/config/supabase.js';
import { getUsaplAuthUser, listUsaplMyCaptainClaims } from '../services/usaplCaptainClaims.js';

export function useUsaplCaptainSession() {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const nextUser = await getUsaplAuthUser();
      setUser(nextUser);
      setClaims(nextUser ? await listUsaplMyCaptainClaims() : []);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const { data } = supabase.auth.onAuthStateChange(() => {
      reload();
    });
    return () => data.subscription.unsubscribe();
  }, [reload]);

  return { user, claims, loading, reload };
}
