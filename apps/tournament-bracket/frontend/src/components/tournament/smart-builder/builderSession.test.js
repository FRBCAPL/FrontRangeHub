import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuilderSession, ERROR_MESSAGES } from './builderSession.js';
import { FORM_DEFAULTS, parseBuilderForm, hoursText } from './builderForm.js';
import { BuilderError } from './builderClient.js';

function fakeClient() {
  const c = { runs: [], cancels: 0, disposed: false };
  c.run = (raw, handlers) => {
    const r = { raw, handlers, id: c.runs.length + 1 };
    r.done = new Promise((resolve, reject) => { r.resolve = resolve; r.reject = reject; });
    c.runs.push(r);
    return { id: r.id, done: r.done };
  };
  c.cancel = () => { c.cancels += 1; c.runs.at(-1)?.resolve({ status: 'cancelled' }); };
  c.dispose = () => { c.disposed = true; };
  return c;
}

function setup() {
  const client = fakeClient();
  const pending = [];
  const timers = { set: (fn) => pending.push(fn), clear: (t) => { if (t) pending[t - 1] = null; } };
  const states = [];
  const session = createBuilderSession({ createClient: () => client, timers, onChange: (s) => states.push(s) });
  const flush = () => pending.splice(0).forEach((fn) => fn && fn());
  const tick = () => new Promise((r) => setImmediate(r));
  return { client, session, states, flush, tick };
}

const FINAL = { status: 'final', preliminary: false, recommendation: { primary: { id: 'cc-1-1' } } };
const PRELIM = { status: 'preliminary', preliminary: true, recommendation: { primary: { id: 'PRELIMINARY-PICK' } } };

test('form parsing uses the Builder core checks and converts hours to minutes', () => {
  assert.deepEqual(parseBuilderForm(FORM_DEFAULTS), { raw: { entrants: 16, tables: 4, entryFee: 20, targetMin: 360, minutesPerGame: 10 }, problems: [] });
  assert.equal(parseBuilderForm({ ...FORM_DEFAULTS, hours: '5.5' }).raw.targetMin, 330);
  const bad = parseBuilderForm({ entrants: '8.5', tables: '0', hours: '', entryFee: '-1', minutesPerGame: '0' }).problems;
  assert.deepEqual(bad, [
    'Players must be a whole number.',
    'Tables must be a whole number of at least 1.',
    'Entry fee must be $0 or more.',
    'Target time must be more than 0 minutes.',
    'Minutes per game must be more than 0.',
  ]);
  assert.deepEqual(parseBuilderForm({ ...FORM_DEFAULTS, entrants: '1' }).problems, []);
  assert.equal(hoursText(345), '5.75');
});

test('a calculation goes pending → running → refining → final, and the preliminary result is never kept', async () => {
  const { client, session, states, flush, tick } = setup();
  session.update(FORM_DEFAULTS);
  assert.equal(session.getState().status, 'pending');
  assert.equal(client.runs.length, 0);
  flush();
  assert.equal(session.getState().status, 'running');
  assert.deepEqual(client.runs[0].raw, parseBuilderForm(FORM_DEFAULTS).raw);
  client.runs[0].handlers.onProgress(250);
  assert.equal(session.getState().simulations, 250);
  client.runs[0].handlers.onPreliminary(PRELIM);
  assert.equal(session.getState().status, 'refining');
  assert.equal(session.getState().result, null);
  client.runs[0].resolve(FINAL);
  await tick();
  assert.equal(session.getState().status, 'final');
  assert.equal(session.getState().result, FINAL);
  assert.ok(states.every((s) => !JSON.stringify(s).includes('PRELIMINARY-PICK')));
});

test('changing an input clears the result at once and an older result can never appear', async () => {
  const { client, session, flush, tick } = setup();
  session.update(FORM_DEFAULTS);
  flush();
  client.runs[0].resolve(FINAL);
  await tick();
  assert.equal(session.getState().status, 'final');
  session.update({ ...FORM_DEFAULTS, tables: '6' });
  assert.equal(session.getState().status, 'pending');
  assert.equal(session.getState().result, null);
  flush();
  const old = client.runs[1];
  session.update({ ...FORM_DEFAULTS, tables: '8' });
  flush();
  old.resolve(FINAL);
  old.handlers.onPreliminary(PRELIM);
  old.handlers.onProgress(999);
  await tick();
  assert.equal(session.getState().status, 'running');
  assert.notEqual(session.getState().simulations, 999);
  client.runs[2].resolve({ ...FINAL, tag: 'eight tables' });
  await tick();
  assert.equal(session.getState().result.tag, 'eight tables');
});

test('rapid typing starts only one calculation', () => {
  const { client, session, flush } = setup();
  ['1', '12', '12'].forEach((entrants) => session.update({ ...FORM_DEFAULTS, entrants }));
  flush();
  assert.equal(client.runs.length, 1);
  assert.equal(client.runs[0].raw.entrants, 12);
});

test('invalid inputs show the core problems and start nothing', () => {
  const { client, session, flush } = setup();
  session.update(FORM_DEFAULTS);
  flush();
  session.update({ ...FORM_DEFAULTS, tables: '0' });
  flush();
  assert.equal(session.getState().status, 'invalid');
  assert.deepEqual(session.getState().problems, ['Tables must be a whole number of at least 1.']);
  assert.equal(client.runs.length, 1);
  assert.ok(client.cancels >= 1);
});

test('stop cancels the calculation; calculate again reruns the same inputs', async () => {
  const { client, session, flush, tick } = setup();
  session.update(FORM_DEFAULTS);
  flush();
  session.stop();
  assert.equal(session.getState().status, 'stopped');
  client.runs[0].resolve(FINAL);
  await tick();
  assert.equal(session.getState().status, 'stopped');
  session.retry();
  assert.equal(client.runs.length, 2);
  assert.deepEqual(client.runs[1].raw, client.runs[0].raw);
  assert.equal(session.getState().status, 'running');
});

test('worker failures become clear, recoverable messages', async () => {
  for (const code of ['crashed', 'timeout', 'unavailable', 'failed']) {
    const { client, session, flush, tick } = setup();
    session.update(FORM_DEFAULTS);
    flush();
    client.runs[0].reject(new BuilderError('internal detail', code));
    await tick();
    assert.equal(session.getState().status, 'error');
    assert.equal(session.getState().error.message, ERROR_MESSAGES[code]);
    session.retry();
    assert.equal(session.getState().status, 'running');
    assert.equal(client.runs.length, 2);
  }
});

test('leaving the screen disposes the worker and ignores anything that arrives later', async () => {
  const { client, session, states, flush, tick } = setup();
  session.update(FORM_DEFAULTS);
  flush();
  session.dispose();
  assert.equal(client.disposed, true);
  const count = states.length;
  client.runs[0].resolve(FINAL);
  await tick();
  assert.equal(states.length, count);
});
