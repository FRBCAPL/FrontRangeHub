/**
 * The worker's message handler, separate from the worker entry so it can be tested directly.
 *
 * In:  { type: 'run', id, inputs, options }   starts a search; a newer run supersedes the current one
 *      { type: 'cancel', id }                  stops that search
 * Out: { type: 'progress', id, simulations }
 *      { type: 'preliminary', id, result }     quick estimates, result.status 'preliminary'
 *      { type: 'final', id, result }           refined estimates, result.status 'final'
 *      { type: 'cancelled', id } | { type: 'error', id, message }
 *
 * The search runs in short slices and yields to the event loop between them, so cancel messages are read
 * within one slice. Slices only end between simulations, so the Date and Math.random substitutions made
 * during a simulation are never in place while other messages are handled.
 */
import { searchSteps } from './builderSearch.js';

export const SLICE_MS = 30;
const PROGRESS_EVERY = 25;

const clock = () => (typeof performance !== 'undefined' ? performance.now() : 0);

export function createWorkerHandler(post, { search = searchSteps, schedule = (fn) => setTimeout(fn, 0), now = clock } = {}) {
  let current = null;

  function finish(job, message) {
    if (current === job) current = null;
    post({ ...message, id: job.id });
  }

  function start({ id, inputs, options }) {
    const job = { id, cancelled: false, steps: null };
    current = job;
    const slice = () => {
      if (job.cancelled) { finish(job, { type: 'cancelled' }); return; }
      try {
        job.steps = job.steps || search(inputs, options);
        const end = now() + SLICE_MS;
        do {
          const { value, done } = job.steps.next();
          if (done) { finish(job, { type: 'error', message: 'The search ended without a result.' }); return; }
          if (value.type === 'progress' && value.simulations % PROGRESS_EVERY === 0) post({ type: 'progress', id, simulations: value.simulations });
          if (value.type === 'preliminary') post({ type: 'preliminary', id, result: value.result });
          if (value.type === 'final') { finish(job, { type: 'final', result: value.result }); return; }
        } while (now() < end);
      } catch (err) {
        finish(job, { type: 'error', message: err?.message || 'The Smart Builder search failed.' });
        return;
      }
      schedule(slice);
    };
    schedule(slice);
  }

  return function onMessage(msg) {
    if (msg?.type === 'cancel') {
      if (current && current.id === msg.id) current.cancelled = true;
    } else if (msg?.type === 'run') {
      if (current) current.cancelled = true;
      start(msg);
    }
  };
}
