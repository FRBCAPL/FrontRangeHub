import { useEffect, useState } from 'react';
import duezy from '../services/duezyClient.js';

/**
 * Optional features that need a database update. Checked once per page load, so a screen never
 * offers something the database can't save yet (e.g. Double Play before duezy-double-play SQL).
 */
let doublePlayCheck = null;

function checkDoublePlay() {
  if (!doublePlayCheck) {
    doublePlayCheck = duezy
      .from('duezy_divisions')
      .select('matches_per_night')
      .limit(1)
      .then(({ error }) => !error)
      .catch(() => false);
  }
  return doublePlayCheck;
}

/** true once Double Play is supported, false if not, null while checking. */
export function useDoublePlaySupported() {
  const [supported, setSupported] = useState(null);
  useEffect(() => {
    let alive = true;
    checkDoublePlay().then((ok) => alive && setSupported(ok));
    return () => { alive = false; };
  }, []);
  return supported;
}
