import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from './builderRenderKit.test-support.mjs';
import { smartBuilderAvailable } from './smartBuilderAccess.js';
import { SMART_BUILDER_ENABLED } from './builderFlags.js';
const pickerProps = { onCashClimb() {}, onShowdown() {}, showdownResume: '', onBreakAndRun() {}, onSingleElim() {}, onDoubleElim() {}, onBack() {} };

test('the entry point is development-only while SMART_BUILDER_ENABLED is false', () => {
  assert.equal(SMART_BUILDER_ENABLED, false);
  assert.match(readFileSync(new URL('../showdown/cloud/showdownCloud.js', import.meta.url), 'utf8'), /^const DEV_WRITES_LIVE = false;$/m);
  assert.equal(smartBuilderAvailable({ DEV: false, PROD: true }), false);
  assert.equal(smartBuilderAvailable({ DEV: true, PROD: true }), false);
  assert.equal(smartBuilderAvailable({}), false);
  assert.equal(smartBuilderAvailable(), false);
  assert.equal(smartBuilderAvailable({ DEV: true, PROD: false }), true);
  assert.equal(smartBuilderAvailable({ DEV: false, PROD: true }, true), true);
});

test('the format picker is unchanged unless the Builder is offered', async () => {
  const without = await render('../TournamentFormatPicker.jsx', pickerProps);
  const withIt = await render('../TournamentFormatPicker.jsx', { ...pickerProps, onSmartBuilder() {} });
  assert.doesNotMatch(without, /Help me choose/);
  const button = withIt.match(/<button[^>]*>(?:(?!<\/button>).)*Help me choose(?:(?!<\/button>).)*<\/button>/)[0];
  assert.equal(withIt.replace(button, ''), without);
  ['Cash Climb', 'Cash Climb Showdown', 'Break &amp; Run', 'Single elimination', 'Double elimination', 'Back'].forEach((label) => assert.ok(without.includes(label), label));
});

test('the tournament app only reaches the Builder through the gate, lazily, with no route', () => {
  const src = readFileSync(new URL('../TournamentBracketApp.jsx', import.meta.url), 'utf8');
  assert.match(src, /if \(screen === 'smart-builder' && smartBuilderAvailable\(\)\)/);
  assert.match(src, /onSmartBuilder=\{smartBuilderAvailable\(\) \? \(\) => setScreen\('smart-builder'\) : undefined\}/);
  assert.match(src, /React\.lazy\(\(\) => import\('\.\/smart-builder\/SmartBuilderApp\.jsx'\)\)/);
  assert.equal((src.match(/setScreen\('smart-builder'\)/g) || []).length, 1);
  assert.doesNotMatch(src, /navigate\([^)]*smart/i);
});
