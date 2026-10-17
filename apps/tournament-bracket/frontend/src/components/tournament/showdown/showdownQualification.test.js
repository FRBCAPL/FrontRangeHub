import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveQualification, resolveByes, shootoutMatchesTie } from './showdownQualification.js';

const done = (groupIds, spots, survivors) => ({ status: 'complete', groupIds, spots, survivors });

describe('showdown qualification cutoff', () => {
  it('sends only the tie that crosses the cutoff to a shootout', () => {
    const r = resolveQualification({ groups: [['a'], ['b'], ['c', 'd', 'e'], ['f']], spots: 3 });
    assert.equal(r.status, 'needs-shootout');
    assert.deepEqual(r.qualifiedIds, ['a', 'b']);
    assert.deepEqual(r.tiedIds, ['c', 'd', 'e']);
    assert.equal(r.openSpots, 1);
  });

  it('does not shoot out ties that sit inside or below the cutoff', () => {
    assert.equal(resolveQualification({ groups: [['a', 'b'], ['c'], ['d']], spots: 2 }).status, 'resolved');
    const r = resolveQualification({ groups: [['a'], ['b'], ['c', 'd']], spots: 2 });
    assert.deepEqual(r.qualifiedIds, ['a', 'b']);
    assert.deepEqual(r.notQualifiedIds, ['c', 'd']);
  });

  it('applies a finished shootout', () => {
    const r = resolveQualification({ groups: [['a'], ['b'], ['c', 'd', 'e']], spots: 3, shootouts: [done(['c', 'd', 'e'], 1, ['d'])] });
    assert.equal(r.status, 'resolved');
    assert.deepEqual(r.qualifiedIds, ['a', 'b', 'd']);
  });

  it('fills a vacancy with the next eligible player', () => {
    const r = resolveQualification({ groups: [['a'], ['b'], ['c'], ['d']], spots: 2, withdrawnIds: ['b'] });
    assert.deepEqual(r.qualifiedIds, ['a', 'c']);
  });

  it('a vacancy left by a shootout winner goes to a new shootout among the remaining tied players', () => {
    const r = resolveQualification({
      groups: [['a'], ['b'], ['c', 'd', 'e']], spots: 3, withdrawnIds: ['d'], shootouts: [done(['c', 'd', 'e'], 1, ['d'])],
    });
    assert.equal(r.status, 'needs-shootout');
    assert.deepEqual(r.tiedIds.sort(), ['c', 'e']);
    assert.equal(r.openSpots, 1);
  });

  it('other shootout survivors keep their spots when one survivor withdraws', () => {
    const r = resolveQualification({
      groups: [['a'], ['c', 'd', 'e', 'f']], spots: 3, withdrawnIds: ['c'], shootouts: [done(['c', 'd', 'e', 'f'], 2, ['c', 'd'])],
    });
    assert.equal(r.status, 'needs-shootout');
    assert.deepEqual(r.qualifiedIds, ['a', 'd']);
    assert.deepEqual(r.tiedIds.sort(), ['e', 'f']);
    assert.equal(r.openSpots, 1);
  });

  it('a withdrawal above the cutoff opens one more spot for the tied group', () => {
    const r = resolveQualification({ groups: [['a'], ['b'], ['c', 'd', 'e']], spots: 3, withdrawnIds: ['a'] });
    assert.equal(r.status, 'needs-shootout');
    assert.equal(r.openSpots, 2);
  });

  it('reports when too few eligible players remain', () => {
    const r = resolveQualification({ groups: [['a'], ['b'], ['c']], spots: 4, withdrawnIds: ['c'] });
    assert.equal(r.status, 'short');
    assert.equal(r.missing, 2);
  });

  it('matches an in-progress shootout to the same tie', () => {
    assert.equal(shootoutMatchesTie({ groupIds: ['c', 'd'], spots: 1 }, { tiedIds: ['d', 'c'], openSpots: 1 }), true);
    assert.equal(shootoutMatchesTie({ groupIds: ['c', 'd'], spots: 1 }, { tiedIds: ['c', 'e'], openSpots: 1 }), false);
  });
});

describe('showdown byes', () => {
  const q = (n) => Array.from({ length: n }, (_, i) => `q${i + 1}`);
  const done = (groupIds, survivors) => ({ kind: 'bye', groupIds, spots: survivors.length, status: 'complete', survivors });

  it('go to the highest-ranked qualifiers', () => {
    const groups = q(7).map((id) => [id]);
    assert.deepEqual(resolveByes({ groups, qualifierIds: q(7), byes: 1 }), { status: 'resolved', byeIds: ['q1'] });
    assert.deepEqual(resolveByes({ groups, qualifierIds: q(5).slice(0, 5), byes: 3 }).byeIds, ['q1', 'q2', 'q3']);
  });

  it('a whole tied group gets byes when it fits', () => {
    const groups = [['q1'], ['q2', 'q3'], ['q4'], ['q5'], ['q6']];
    assert.deepEqual(resolveByes({ groups, qualifierIds: q(6), byes: 3 }), { status: 'resolved', byeIds: ['q1', 'q2', 'q3'] });
  });

  it('a tied group larger than the byes left needs a bye shootout among those players only', () => {
    const groups = [['q1'], ['q2', 'q3', 'q4'], ['q5'], ['q6']];
    const r = resolveByes({ groups, qualifierIds: q(6), byes: 2 });
    assert.deepEqual(r, { status: 'needs-shootout', byeIds: ['q1'], tiedIds: ['q2', 'q3', 'q4'], openSpots: 1 });
  });

  it('a finished bye shootout settles it; its losers stay qualified', () => {
    const groups = [['q1'], ['q2', 'q3', 'q4'], ['q5'], ['q6']];
    const r = resolveByes({ groups, qualifierIds: q(6), byes: 2, shootouts: [done(['q2', 'q3', 'q4'], ['q4'])] });
    assert.deepEqual(r, { status: 'resolved', byeIds: ['q1', 'q4'] });
  });

  it('the whole field tied for every bye: one shootout decides them all', () => {
    const r = resolveByes({ groups: [q(5)], qualifierIds: q(5), byes: 3 });
    assert.deepEqual(r, { status: 'needs-shootout', byeIds: [], tiedIds: q(5), openSpots: 3 });
  });

  it('only qualifiers are ranked for byes', () => {
    const groups = [['x', 'q1'], ['q2'], ['y'], ['q3'], ['q4'], ['q5'], ['q6'], ['q7']];
    assert.deepEqual(resolveByes({ groups, qualifierIds: q(7), byes: 1 }).byeIds, ['q1']);
  });

  it('no byes for 4- and 8-player fields', () => {
    assert.deepEqual(resolveByes({ groups: [q(8)], qualifierIds: q(8), byes: 0 }), { status: 'resolved', byeIds: [] });
  });

  it('cutoff and bye shootouts are told apart', () => {
    assert.equal(shootoutMatchesTie({ kind: 'bye', groupIds: ['c', 'd'], spots: 1 }, { tiedIds: ['d', 'c'], openSpots: 1 }), false);
    assert.equal(shootoutMatchesTie({ kind: 'bye', groupIds: ['c', 'd'], spots: 1 }, { tiedIds: ['d', 'c'], openSpots: 1 }, 'bye'), true);
  });
});
