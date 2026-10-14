import { supabase } from '@shared/config/supabase.js';

let offsetMs = 0;
let syncing = null;

/** Current time on the server's clock (device time until syncServerClock finishes). */
export function serverNow() {
  return Date.now() + offsetMs;
}

/** Measures device-vs-server clock difference once per page load. Falls back to the device clock. */
export function syncServerClock() {
  if (!syncing) {
    syncing = (async () => {
      const sentAt = Date.now();
      const { data, error } = await supabase.rpc('consignment_server_now');
      const receivedAt = Date.now();
      const server = new Date(data).getTime();
      if (error || !Number.isFinite(server)) return;
      offsetMs = server - (sentAt + receivedAt) / 2;
    })().catch(() => {});
  }
  return syncing;
}
