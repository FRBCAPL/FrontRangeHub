/**
 * The Smart Builder screen's controller: one worker client for the screen's lifetime, a short pause after
 * typing, and at most one calculation at a time.
 *
 * status: 'invalid' | 'pending' | 'running' | 'refining' | 'final' | 'stopped' | 'error'
 *   running   the quick pass is under way
 *   refining  the quick pass is done; its results are deliberately NOT kept, so nothing provisional can
 *             be shown — only the refined final result is ever stored
 *   final     `result` is the refined result for the current inputs
 * Any input change clears the previous result at once, and results for older requests are dropped.
 */
import { createBuilderClient } from './builderClient.js';
import { parseBuilderForm } from './builderForm.js';

export const INPUT_PAUSE_MS = 400;

export const INITIAL_STATE = Object.freeze({ status: 'pending', problems: [], simulations: 0, result: null, error: null });

export const ERROR_MESSAGES = {
  unavailable: 'This browser cannot run the Smart Builder in the background, so it is not available here. A current version of Chrome, Edge, Safari or Firefox can.',
  crashed: 'The Smart Builder stopped unexpectedly. Try again.',
  timeout: 'The calculation took too long and was stopped. Try again.',
  failed: 'The calculation could not be finished. Try again.',
};

export function createBuilderSession({
  onChange = () => {},
  createClient = createBuilderClient,
  pauseMs = INPUT_PAUSE_MS,
  timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (t) => clearTimeout(t) },
} = {}) {
  const client = createClient();
  let state = INITIAL_STATE;
  let timer = null;
  let request = 0;
  let lastRaw = null;
  let disposed = false;

  const emit = (patch) => {
    if (disposed) return;
    state = { ...state, ...patch };
    onChange(state);
  };

  function start(raw) {
    const mine = (request += 1);
    const current = () => mine === request && !disposed;
    lastRaw = raw;
    emit({ status: 'running', problems: [], simulations: 0, result: null, error: null });
    const { done } = client.run(raw, {
      onProgress: (simulations) => { if (current()) emit({ simulations }); },
      onPreliminary: () => { if (current()) emit({ status: 'refining' }); },
    });
    done.then(
      (result) => { if (current() && result.status === 'final') emit({ status: 'final', result }); },
      (err) => {
        if (!current()) return;
        emit({ status: 'error', error: { code: err?.code || 'failed', message: ERROR_MESSAGES[err?.code] || ERROR_MESSAGES.failed, detail: err?.message || '' } });
      },
    );
  }

  function halt() {
    timers.clear(timer);
    timer = null;
    request += 1;
    client.cancel();
  }

  return {
    getState: () => state,
    /** New form values: clears any result now, then calculates after a short pause. */
    update(form) {
      halt();
      const { raw, problems } = parseBuilderForm(form);
      if (problems.length) { emit({ status: 'invalid', problems, simulations: 0, result: null, error: null }); return; }
      lastRaw = raw;
      emit({ status: 'pending', problems: [], simulations: 0, result: null, error: null });
      timer = timers.set(() => { timer = null; start(raw); }, pauseMs);
    },
    stop() {
      if (!['pending', 'running', 'refining'].includes(state.status)) return;
      halt();
      emit({ status: 'stopped', simulations: 0, result: null });
    },
    retry() {
      if (lastRaw && ['stopped', 'error'].includes(state.status)) { halt(); start(lastRaw); }
    },
    dispose() {
      halt();
      disposed = true;
      client.dispose();
    },
  };
}
