import assert from 'node:assert/strict';
import test from 'node:test';
import { pdfText, shoppingPdfSections } from '../src/utils/itemsureShoppingPdf.js';

test('pdfText swaps common symbols and drops emoji', () => {
  assert.equal(pdfText('Buy 3 − 1 → “ok”'), 'Buy 3 - 1 -> "ok"');
  assert.equal(pdfText('Milk \u2615'), 'Milk ');
});

test('shoppingPdfSections leaves out ticked rows and empty groups', () => {
  const groups = [
    {
      label: "Sam's Club",
      rows: [
        { itemId: 'a', name: 'Red Bull', unit: 'cs', total: '2', upTo: false },
        { itemId: 'b', name: 'Chips', unit: 'bag', total: '1', upTo: true },
      ],
    },
    {
      label: 'No supplier',
      rows: [{ itemId: 'c', name: 'Naps', unit: 'ea', total: null, upTo: false }],
    },
  ];
  const sections = shoppingPdfSections(groups, new Set(['b']));
  assert.equal(sections.length, 2);
  assert.equal(sections[0].label, "Sam's Club");
  assert.deepEqual(sections[0].rows, [{ name: 'Red Bull', amount: '2 cs' }]);
  assert.deepEqual(sections[1].rows, [{ name: 'Naps', amount: 'Amount not set' }]);
});
