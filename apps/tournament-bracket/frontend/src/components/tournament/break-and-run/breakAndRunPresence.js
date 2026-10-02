import { publicClient } from './breakAndRunCloud.js';

/**
 * "Operator screen is open" via Supabase Realtime presence — nothing is saved,
 * and Supabase drops the operator automatically when the tab closes or the device sleeps.
 */
function channelName(eventId) {
  return `bnr-operator-${eventId}`;
}

function removeChannel(client, channel) {
  try {
    client.removeChannel(channel);
  } catch {
    /* ignore */
  }
}

/** Operator side: announce presence on this pot until the returned stop() is called. */
export function announceBreakAndRunOperator(eventId) {
  const id = String(eventId || '').trim();
  if (!id) return () => {};
  const client = publicClient();
  const channel = client.channel(channelName(id), { config: { presence: { key: `op-${Date.now()}` } } });
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.track({ role: 'operator', at: new Date().toISOString() }).catch(() => {});
    }
  });
  return () => removeChannel(client, channel);
}

/** Viewer side: calls onChange(Set of pot ids with an operator present) whenever presence changes. */
export function watchBreakAndRunOperators(eventIds, onChange) {
  const ids = [...new Set((eventIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length || typeof onChange !== 'function') return () => {};
  const client = publicClient();
  const present = new Set();
  const channels = ids.map((id) => {
    const channel = client.channel(channelName(id));
    const update = () => {
      const hasOperator = Object.values(channel.presenceState() || {})
        .some((metas) => (metas || []).some((meta) => meta?.role === 'operator'));
      const had = present.has(id);
      if (hasOperator) present.add(id);
      else present.delete(id);
      if (had !== hasOperator) onChange(new Set(present));
    };
    channel
      .on('presence', { event: 'sync' }, update)
      .on('presence', { event: 'join' }, update)
      .on('presence', { event: 'leave' }, update)
      .subscribe();
    return channel;
  });
  return () => channels.forEach((channel) => removeChannel(client, channel));
}
