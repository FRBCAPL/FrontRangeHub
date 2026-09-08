import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { usaplVisitPageLabel } from './usaplVisitPages.js';

describe('usaplVisitPageLabel', () => {
  it('labels the info page', () => {
    assert.equal(usaplVisitPageLabel('/usapl/info'), 'Info');
  });
});
