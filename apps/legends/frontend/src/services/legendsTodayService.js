import { BACKEND_URL } from '@shared/config/config.js';

/** CueSync website summary via atlasbackend's read-only proxy. Null when unavailable. */
export async function fetchLegendsSummary() {
  const response = await fetch(`${BACKEND_URL}/api/legends-site/today`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Legends today returned ${response.status}`);
  const data = await response.json();
  return data && typeof data === 'object' ? data.summary ?? null : null;
}
