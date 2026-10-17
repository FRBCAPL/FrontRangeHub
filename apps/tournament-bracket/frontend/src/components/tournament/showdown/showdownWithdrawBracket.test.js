import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { toBracket, partialShootoutEvent, settleShootouts } from './showdownTestKit.js';

const lastAudit = (s) => s.audit[s.audit.length - 1];
const outsider = (s) => s.players.find((p) => !s.qualification.qualifierIds.includes(p.id)
  && !(s.qualification.tie?.tiedIds || []).includes(p.id)).id;

describe('withdrawals before the bracket is confirmed', () => {
  it('a non-qualifier withdrawing leaves the drawn bracket untouched', () => {
    for (const n of [10, 16, 22]) {
      const { s, op } = toBracket(n, { seed: n });
      const drawn = E.drawPlayoff(s, op());
      const next = E.withdrawPlayer(drawn, outsider(drawn), op());
      assert.deepEqual(next.playoff, drawn.playoff);
      assert.deepEqual(next.matches, drawn.matches);
      assert.deepEqual(next.qualification, drawn.qualification);
      assert.equal(lastAudit(next).detail.effect, 'none');
      assert.equal(E.confirmPlayoff(next, op()).status, 'playoffs');
    }
  });

  it('a qualifier withdrawing invalidates the draw and is replaced', () => {
    const { s, op } = toBracket(16, { seed: 4 });
    const drawn = E.drawPlayoff(s, op());
    const leaving = drawn.qualification.qualifierIds[2];
    const next = E.withdrawPlayer(drawn, leaving, op());
    assert.equal(next.playoff, null);
    assert.equal(lastAudit(next).detail.effect, 'redraw');
    const settled = settleShootouts(next, op);
    assert.equal(settled.qualification.qualifierIds.length, settled.payoutPlan.qualifiers);
    assert.ok(!settled.qualification.qualifierIds.includes(leaving));
  });

  [12, 14, 16].forEach((n) => {
    it(`${n} entrants: a bye holder withdrawing before confirmation invalidates the draw; the bye is re-earned by standings`, () => {
      const { s, op } = toBracket(n, { seed: 8 });
      const drawn = E.drawPlayoff(s, op());
      const leaving = drawn.qualification.byeIds[0];
      const next = E.withdrawPlayer(drawn, leaving, op());
      assert.equal(next.playoff, null);
      const settled = settleShootouts(next, op);
      const redrawn = E.drawPlayoff(settled, op());
      assert.ok(!redrawn.qualification.byeIds.includes(leaving));
      assert.ok(!redrawn.qualification.qualifierIds.includes(leaving));
      assert.equal(redrawn.playoff.byes.length, s.payoutPlan.byes);
      assert.deepEqual(redrawn.playoff.byes.map((b) => b.playerId).sort(), [...redrawn.qualification.byeIds].sort());
    });
  });
});

describe('withdrawals during a shootout', () => {
  it('a player outside the tie and the qualifiers changes nothing', () => {
    const { s, op } = partialShootoutEvent(12);
    const next = E.withdrawPlayer(s, outsider(s), op());
    assert.deepEqual(next.shootouts, s.shootouts);
    assert.deepEqual(next.qualification, s.qualification);
    assert.equal(next.status, 'shootout');
  });

  it('a qualifier leaving before the shootout starts widens the shootout immediately', () => {
    const { s, op } = partialShootoutEvent(12);
    const leaving = s.qualification.qualifierIds[0];
    const next = E.withdrawPlayer(s, leaving, op());
    assert.equal(lastAudit(next).detail.effect, 'requalify');
    const settled = settleShootouts(next, op);
    assert.equal(settled.qualification.qualifierIds.length, settled.payoutPlan.qualifiers);
    assert.ok(!settled.qualification.qualifierIds.includes(leaving));
  });

  it('a qualifier leaving mid-shootout is replaced once the shootout finishes', () => {
    const { s, op } = partialShootoutEvent(12);
    const leaving = s.qualification.qualifierIds[0];
    const sh = E.activeShootout(s);
    const started = E.shootoutLag(s, sh.order[0], op());
    const next = E.withdrawPlayer(started, leaving, op());
    assert.equal(lastAudit(next).detail.effect, 'after-shootout');
    assert.deepEqual(next.shootouts, started.shootouts);
    const settled = settleShootouts(next, op);
    assert.equal(settled.status, 'bracket');
    assert.equal(settled.qualification.qualifierIds.length, settled.payoutPlan.qualifiers);
    assert.ok(!settled.qualification.qualifierIds.includes(leaving));
    s.qualification.qualifierIds.slice(1).forEach((id) => assert.ok(settled.qualification.qualifierIds.includes(id), 'other qualifiers keep their spots'));
  });
});
