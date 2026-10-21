import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createBuilderClient } from './builderClient.js';
import { searchSync } from './builderSearch.js';

const QUICK = { pass1Runs: 6, pass2Runs: 12 };
const EIGHT = { entrants: 8, tables: 4, entryFee: 20, targetMin: 300 };
const THREAD = new URL('./builderWorkerThread.test-support.mjs', import.meta.url);

/** A Node worker thread shaped like a browser Worker. */
function threadWorker(url = THREAD, opts) {
  const w = new Worker(url, opts);
  const shim = {
    onmessage: null,
    onerror: null,
    postMessage: (m) => w.postMessage(m),
    terminate: () => { shim.terminated = true; return w.terminate(); },
  };
  w.on('message', (data) => shim.onmessage?.({ data }));
  w.on('error', (e) => shim.onerror?.({ message: e.message }));
  return shim;
}

/** A worker the test drives by hand. */
function fakeWorker() {
  const w = { sent: [], terminated: false, onmessage: null, onerror: null };
  w.postMessage = (m) => w.sent.push(m);
  w.terminate = () => { w.terminated = true; };
  w.reply = (data) => w.onmessage?.({ data });
  return w;
}

test('final result from the worker thread matches the search; preliminary comes first and is labelled', async () => {
  const client = createBuilderClient({ createWorker: () => threadWorker() });
  const seen = [];
  try {
    const { done } = client.run(EIGHT, { options: QUICK, onPreliminary: (r) => seen.push(r) });
    const final = await done;
    assert.equal(seen.length, 1);
    assert.equal(seen[0].status, 'preliminary');
    assert.equal(seen[0].preliminary, true);
    assert.equal(final.status, 'final');
    assert.equal(final.preliminary, false);
    assert.equal(JSON.stringify(final.recommendation), JSON.stringify(searchSync(EIGHT, QUICK).final.recommendation));
    const again = await client.run(EIGHT, { options: QUICK }).done;
    assert.equal(again.fromCache, true);
    assert.equal(client.isRunning(), false);
  } finally {
    client.dispose();
  }
});

test('the main thread stays responsive and its Date and Math.random are never replaced', async () => {
  const client = createBuilderClient({ createWorker: () => threadWorker() });
  const RealDate = Date;
  const realRandom = Math.random;
  let last = performance.now();
  let worstGap = 0;
  let replaced = false;
  const timer = setInterval(() => {
    const t = performance.now();
    worstGap = Math.max(worstGap, t - last);
    last = t;
    if (Date !== RealDate || Math.random !== realRandom) replaced = true;
  }, 5);
  try {
    const t0 = performance.now();
    const elu0 = performance.eventLoopUtilization();
    await client.run({ ...EIGHT, targetMin: 360 }, { options: { pass1Runs: 10, pass2Runs: 20 } }).done;
    const busy = performance.eventLoopUtilization(elu0).utilization;
    assert.ok(performance.now() - t0 > 500, 'the search ran long enough to measure');
    // Utilization counts only this thread's own work, so other processes on a busy machine barely move it;
    // a search on the main thread would hold it near 1. The gap bound only catches long freezes.
    assert.ok(busy < 0.5, `main thread busy ${Math.round(busy * 100)}% of the search`);
    assert.ok(worstGap < 1000, `main thread blocked for ${Math.round(worstGap)} ms`);
    assert.equal(replaced, false);
  } finally {
    clearInterval(timer);
    client.dispose();
  }
});

test('a newer run supersedes an older one, which resolves as cancelled and never delivers results', async () => {
  const client = createBuilderClient({ createWorker: () => threadWorker() });
  const late = [];
  try {
    const first = client.run({ ...EIGHT, targetMin: 360 }, { onPreliminary: () => late.push('first preliminary') });
    const second = client.run(EIGHT, { options: QUICK });
    assert.deepEqual(await first.done, { status: 'cancelled', id: first.id });
    const final = await second.done;
    assert.equal(final.status, 'final');
    assert.equal(final.inputs.targetMin, 300);
    assert.deepEqual(late, []);
  } finally {
    client.dispose();
  }
});

test('cancel leaves the client ready for the next run', async () => {
  const client = createBuilderClient({ createWorker: () => threadWorker() });
  try {
    const { done } = client.run({ ...EIGHT, targetMin: 360 });
    client.cancel();
    assert.equal((await done).status, 'cancelled');
    assert.equal(client.isRunning(), false);
    assert.equal((await client.run(EIGHT, { options: QUICK }).done).status, 'final');
  } finally {
    client.dispose();
  }
});

test('messages for an old request id are ignored', async () => {
  const w = fakeWorker();
  const client = createBuilderClient({ createWorker: () => w });
  const a = client.run(EIGHT);
  const prelims = [];
  const b = client.run({ ...EIGHT, targetMin: 360 }, { onPreliminary: (r) => prelims.push(r) });
  w.reply({ type: 'preliminary', id: a.id, result: { inputs: { targetMin: 300 } } });
  w.reply({ type: 'final', id: a.id, result: { inputs: { targetMin: 300 } } });
  assert.equal(client.isRunning(), true);
  assert.deepEqual(prelims, []);
  w.reply({ type: 'final', id: b.id, result: { inputs: { targetMin: 360 } } });
  assert.equal((await b.done).inputs.targetMin, 360);
  assert.equal((await a.done).status, 'cancelled');
  assert.deepEqual(w.sent.map((m) => m.type), ['run', 'cancel', 'run']);
  client.dispose();
});

test('a crashed worker rejects the run and the next run starts a fresh worker', async () => {
  const workers = [];
  const crashing = 'require("node:worker_threads").parentPort.on("message", () => { throw new Error("worker crashed"); });';
  const client = createBuilderClient({
    createWorker: () => {
      const w = workers.length ? threadWorker() : threadWorker(crashing, { eval: true });
      workers.push(w);
      return w;
    },
  });
  try {
    await assert.rejects(client.run(EIGHT).done, (err) => err.code === 'crashed' && /worker crashed/.test(err.message));
    assert.equal(workers[0].terminated, true);
    assert.equal(client.isRunning(), false);
    assert.equal((await client.run(EIGHT, { options: QUICK }).done).status, 'final');
    assert.equal(workers.length, 2);
  } finally {
    client.dispose();
  }
});

test('a worker error message or a timeout rejects without leaving the client stuck', async () => {
  const workers = [];
  const client = createBuilderClient({ timeoutMs: 40, createWorker: () => { const w = fakeWorker(); workers.push(w); return w; } });
  const failed = client.run(EIGHT);
  workers[0].reply({ type: 'error', id: failed.id, message: 'search failed' });
  await assert.rejects(failed.done, (err) => err.code === 'failed');
  await assert.rejects(client.run({ ...EIGHT, targetMin: 330 }).done, (err) => err.code === 'timeout');
  assert.equal(workers[0].terminated, true);
  const next = client.run({ ...EIGHT, targetMin: 360 });
  assert.equal(workers.length, 2);
  workers[1].reply({ type: 'final', id: next.id, result: { inputs: {} } });
  assert.equal((await next.done).status, 'final');
  client.dispose();
});

test('without Web Worker support the run is rejected as unavailable, never run on the main thread', async () => {
  const client = createBuilderClient();
  await assert.rejects(client.run(EIGHT).done, (err) => err.code === 'unavailable');
  assert.equal(client.isRunning(), false);
});
