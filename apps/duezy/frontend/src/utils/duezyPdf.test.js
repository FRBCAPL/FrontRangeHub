import test from 'node:test';
import assert from 'node:assert/strict';
import { pdfText } from './duezyPdf.js';

test('pdfText swaps symbols the built-in PDF fonts lack', () => {
  assert.equal(pdfText('−$10 · Sep 15 – Oct 6 → done’s'), "-$10 · Sep 15 - Oct 6 -> done's");
  assert.equal(pdfText('Café 🎱 Sharks'), 'Café  Sharks');
  assert.equal(pdfText(null), '');
});
