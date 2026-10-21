import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerHandler } from './builderWorkerCore.js';
import { searchSteps, searchSync } from './builderSearch.js';
import { withSeededMathRandom, withSimulatedClock } from './builderSimCashClimb.js';

const QUICK = { pass1Runs: 4, pass2Runs: 8 };
const EIGHT = { entrants: 8, tables: 4, entryFee: 20, targetMin: 300 };

function harness(opts) {
  const messages = [];
  const waiters = [];
  const post = (m) => {
    messages.push(m);
    waiters.splice(0).forEach((w) => w());
  };
  const handle = createWorkerHandler(post, opts);
  const until = (pred) => new Promise((resolve) => {
    const check = () => { const m = messages.find(pred); if (m) resolve(m); else waiters.push(check); };
    check();
  });
  return { handle, messages, until, of: (id) => messages.filter((m) => m.id === id).map((m) => m.type) };
}

test('a run posts progress, one preliminary and one final, all with its id', async () => {
  const h = harness();
  h.handle({ type: 'run', id: 1, inputs: EIGHT, options: QUICK });
  const final = await h.until((m) => m.type === 'final');
  const types = h.of(1).filter((t) => t !== 'progress');
  assert.deepEqual(types, ['preliminary', 'final']);
  assert.ok(h.of(1).includes('progress'));
  assert.equal(final.result.status, 'final');
  assert.equal(h.messages.find((m) => m.type === 'preliminary').result.status, 'preliminary');
  assert.equal(JSON.stringify(final.result), JSON.stringify(searchSync(EIGHT, QUICK).final));
});

test('cancel stops a run: no preliminary or final follows the cancellation', async () => {
  const h = harness();
  h.handle({ type: 'run', id: 7, inputs: { ...EIGHT, targetMin: 360 } });
  await h.until((m) => m.type === 'progress');
  h.handle({ type: 'cancel', id: 7 });
  await h.until((m) => m.type === 'cancelled');
  await new Promise((r) => setTimeout(r, 50));
  const types = h.of(7);
  assert.equal(types.at(-1), 'cancelled');
  assert.ok(!types.includes('final'));
});

test('a new run supersedes the current one; only the newest finishes', async () => {
  const h = harness();
  h.handle({ type: 'run', id: 1, inputs: { ...EIGHT, targetMin: 360 } });
  h.handle({ type: 'run', id: 2, inputs: EIGHT, options: QUICK });
  await h.until((m) => m.type === 'final');
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(h.of(1), ['cancelled']);
  assert.equal(h.of(2).at(-1), 'final');
  h.handle({ type: 'cancel', id: 1 });
  assert.equal(h.messages.filter((m) => m.type === 'final').length, 1);
});

test('a failing search reports an error, restores Date and Math.random, and does not affect the next run', async () => {
  const RealDate = Date;
  const realRandom = Math.random;
  function* failing(inputs, options) {
    let n = 0;
    for (const step of searchSteps(inputs, options)) {
      yield step;
      if ((n += 1) === 10) withSimulatedClock(() => withSeededMathRandom(() => 0.5, () => { throw new Error('simulation broke'); }));
    }
  }
  const h = harness({ search: (inputs, options) => (inputs.fail ? failing(inputs, options) : searchSteps(inputs, options)) });
  h.handle({ type: 'run', id: 1, inputs: { ...EIGHT, fail: true }, options: QUICK });
  const err = await h.until((m) => m.type === 'error');
  assert.equal(err.id, 1);
  assert.equal(err.message, 'simulation broke');
  assert.equal(Date, RealDate);
  assert.equal(Math.random, realRandom);
  h.handle({ type: 'run', id: 2, inputs: EIGHT, options: QUICK });
  const final = await h.until((m) => m.type === 'final');
  assert.equal(JSON.stringify(final.result), JSON.stringify(searchSync(EIGHT, QUICK).final));
});

test('a search that throws immediately is reported, not left running', async () => {
  const h = harness({ search: () => { throw new Error('bad options'); } });
  h.handle({ type: 'run', id: 3, inputs: EIGHT });
  assert.equal((await h.until((m) => m.type === 'error')).message, 'bad options');
});
