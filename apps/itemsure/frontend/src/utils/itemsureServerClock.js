import itemsure from '../services/itemsureClient.js';
import { noteServerTime } from './itemsureServerTimes.js';

export { anchorForDraft, latestServerTime, noteServerTime } from './itemsureServerTimes.js';

const PING_MS = 20000;
let users = 0;
let timer = null;

async function ping() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const { data, error } = await itemsure.rpc('server_time');
  if (!error && data) noteServerTime(data);
}

function onVisible() {
  if (document.visibilityState === 'visible') ping();
}

/** Keeps the anchor fresh while a counting screen is open. Returns a stop function. */
export function startServerClock() {
  users += 1;
  if (users === 1) {
    ping();
    timer = setInterval(ping, PING_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', ping);
  }
  return () => {
    users -= 1;
    if (users === 0) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', ping);
    }
  };
}
