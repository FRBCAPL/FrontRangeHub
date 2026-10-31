import { useCallback, useEffect, useState } from 'react';

const keyFor = (organizationId) => `itemsure:shopping-ticks:${organizationId}`;

function read(organizationId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(keyFor(organizationId)) || '[]'));
  } catch {
    return new Set();
  }
}

/**
 * "Got it" ticks on the shopping list, kept on this device only, per business.
 * Ticks change nothing in stock. Items no longer on the list (`listedIds`) drop their tick.
 */
export default function useShoppingTicks(organizationId, listedIds) {
  const [ticked, setTicked] = useState(() => read(organizationId));

  useEffect(() => setTicked(read(organizationId)), [organizationId]);

  const save = useCallback(
    (next) => {
      setTicked(next);
      try {
        localStorage.setItem(keyFor(organizationId), JSON.stringify([...next]));
      } catch {
        // Private browsing or full storage: ticks still work until the page reloads.
      }
    },
    [organizationId],
  );

  useEffect(() => {
    if (!listedIds) return;
    const kept = [...ticked].filter((id) => listedIds.has(id));
    if (kept.length !== ticked.size) save(new Set(kept));
  }, [listedIds, ticked, save]);

  const toggle = (itemId) => {
    const next = new Set(ticked);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    save(next);
  };
  const clear = () => save(new Set());
  return { ticked, toggle, clear };
}
