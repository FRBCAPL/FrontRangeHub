/**
 * Runs setup time estimates in a background worker (the Builder's simulator, read-only). One estimate
 * at a time: a newer request stops the running one, so an old result never replaces a newer one.
 */
const CACHE_SIZE = 16;

function defaultCreateWorker() {
  if (typeof Worker === 'undefined') throw new Error('This browser cannot work out the time estimate.');
  return new Worker(new URL('../../smart-builder/setupEstimate.worker.js', import.meta.url), { type: 'module' });
}

export function createSetupEstimateClient({ createWorker = defaultCreateWorker } = {}) {
  let worker = null;
  let pending = null;
  let seq = 0;
  const cache = new Map();

  const stopWorker = () => {
    if (worker) { worker.onmessage = null; worker.onerror = null; worker.terminate(); }
    worker = null;
  };

  /** Resolves with the estimate, or with null when a newer request replaced this one. Rejects on failure. */
  function estimate(settings) {
    const key = JSON.stringify(settings);
    if (pending) { stopWorker(); pending.resolve(null); pending = null; }
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    const id = (seq += 1);
    return new Promise((resolve, reject) => {
      pending = { id, resolve };
      try {
        worker = worker || createWorker();
      } catch (err) {
        pending = null;
        reject(err);
        return;
      }
      worker.onmessage = ({ data }) => {
        if (!pending || data?.id !== id) return;
        pending = null;
        if (data.error) { reject(new Error(data.error)); return; }
        cache.set(key, data.result);
        if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
        resolve(data.result);
      };
      worker.onerror = (event) => {
        event?.preventDefault?.();
        stopWorker();
        if (pending?.id === id) { pending = null; reject(new Error('The time estimate stopped unexpectedly.')); }
      };
      worker.postMessage({ id, settings });
    });
  }

  return { estimate, dispose: () => { if (pending) pending.resolve(null); pending = null; stopWorker(); } };
}
