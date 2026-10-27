import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from './builderRenderKit.test-support.mjs';

const base = { onCashClimb() {}, onShowdown() {}, showdownResume: '', onBreakAndRun() {}, onSingleElim() {}, onDoubleElim() {}, onBack() {} };
const buttons = (html) => html.match(/<button[^>]*>(?:(?!<\/button>).)*<\/button>/g) || [];
const strong = (b) => (b.match(/<strong>([^<]*)<\/strong>/) || [])[1];

test('the picker shows the three Cash Climb formats by their unambiguous names', async () => {
  const html = await render('../TournamentFormatPicker.jsx', { ...base, onCashClimbV3() {} });
  const names = buttons(html).map(strong).filter(Boolean);
  assert.deepEqual(names.slice(0, 3), ['Cash Climb', 'Cash Climb: King of the Hill', 'Cash Climb: Showdown']);
  const koth = buttons(html).find((b) => strong(b) === 'Cash Climb: King of the Hill');
  assert.match(koth, /cc-primary/, 'King of the Hill keeps its current primary styling');
  assert.doesNotMatch(buttons(html).find((b) => strong(b) === 'Cash Climb'), /cc-primary/);
});

test('without the Cash Climb handler the picker is otherwise unchanged', async () => {
  const without = await render('../TournamentFormatPicker.jsx', base);
  const withIt = await render('../TournamentFormatPicker.jsx', { ...base, onCashClimbV3() {} });
  const v3 = buttons(withIt).find((b) => strong(b) === 'Cash Climb');
  assert.equal(withIt.replace(v3, ''), without);
});
