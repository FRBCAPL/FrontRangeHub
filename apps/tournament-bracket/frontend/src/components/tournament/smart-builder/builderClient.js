/**
 * Talks to the Smart Builder worker. One search at a time: a new run() supersedes the current one, and
 * messages for any other request id are ignored, so an old result can never replace a newer one.
 *
 *   const { id, done } = client.run(inputs, { onPreliminary, onProgress });
 *   done → final result (status 'final') | { status: 'cancelled', id }; rejects on a worker failure.
 *
 * onPreliminary receives quick estimates marked status 'preliminary' / preliminary: true; they must
 * never be shown as the final recommendation. If the worker crashes or times out it is discarded and
 * the next run() starts a fresh one. There is no main-thread fallback: the simulations temporarily
 * replace Date and Math.random, which must only happen inside the worker.
 */
export const CLIENT_TIMEOUT_MS = 120000;

export class BuilderError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'BuilderError';
    this.code = code;
  }
}

function defaultCreateWorker() {
  if (typeof Worker === 'undefined') throw new BuilderError('This browser cannot run the Smart Builder in the background.', 'unavailable');
  return new Worker(new URL('./smartBuilder.worker.js', import.meta.url), { type: 'module' });
}

export function createBuilderClient({ createWorker = defaultCreateWorker, timeoutMs = CLIENT_TIMEOUT_MS, cacheSize = 8 } = {}) {
  let worker = null;
  let active = null;
  let seq = 0;
  const cache = new Map();

  const settle = (fn) => {
    const a = active;
    active = null;
    if (a) { clearTimeout(a.timer); fn(a); }
  };

  function discardWorker() {
    const w = worker;
    worker = null;
    if (w) { w.onmessage = null; w.onerror = null; w.terminate(); }
  }

  function fail(message, code) {
    discardWorker();
    settle((a) => a.reject(new BuilderError(message, code)));
  }

  function onMessage(msg) {
    if (!active || !msg || msg.id !== active.id) return;
    if (msg.type === 'progress') active.onProgress?.(msg.simulations);
    else if (msg.type === 'preliminary') active.onPreliminary?.({ ...msg.result, status: 'preliminary', preliminary: true });
    else if (msg.type === 'final') {
      const result = { ...msg.result, status: 'final', preliminary: false };
      remember(active.key, result);
      settle((a) => a.resolve(result));
    } else if (msg.type === 'error') settle((a) => a.reject(new BuilderError(msg.message, 'failed')));
    else if (msg.type === 'cancelled') settle((a) => a.resolve({ status: 'cancelled', id: a.id }));
  }

  function remember(key, result) {
    cache.delete(key);
    cache.set(key, result);
    if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
  }

  function ensureWorker() {
    if (worker) return worker;
    worker = createWorker();
    worker.onmessage = (event) => onMessage(event.data);
    worker.onerror = (event) => { event?.preventDefault?.(); fail(event?.message || 'The Smart Builder stopped unexpectedly.', 'crashed'); };
    return worker;
  }

  function cancel() {
    if (!active) return;
    worker?.postMessage({ type: 'cancel', id: active.id });
    settle((a) => a.resolve({ status: 'cancelled', id: a.id }));
  }

  function run(inputs, { onPreliminary, onProgress, options } = {}) {
    cancel();
    const id = (seq += 1);
    const key = JSON.stringify({ inputs, options: options || null });
    if (cache.has(key)) return { id, done: Promise.resolve({ ...cache.get(key), fromCache: true }) };
    const done = new Promise((resolve, reject) => {
      active = { id, key, resolve, reject, onPreliminary, onProgress, timer: null };
    });
    try {
      ensureWorker().postMessage({ type: 'run', id, inputs, options });
      active.timer = setTimeout(() => fail('The Smart Builder took too long and was stopped.', 'timeout'), timeoutMs);
    } catch (err) {
      fail(err?.message || 'The Smart Builder could not start.', err?.code || 'unavailable');
    }
    return { id, done };
  }

  return {
    run,
    cancel,
    isRunning: () => active !== null,
    clearCache: () => cache.clear(),
    dispose() {
      cancel();
      discardWorker();
    },
  };
}
