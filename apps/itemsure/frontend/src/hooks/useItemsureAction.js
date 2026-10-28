import { useCallback, useState } from 'react';

/** Runs an async action with busy and error state. Returns true on success. */
export default function useItemsureAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (e) {
      setError(e?.message || 'Something went wrong.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
