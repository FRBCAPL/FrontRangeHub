import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { preferTournamentCopy, savedEventSummary, savedStatusLabel, tournamentFromEventRow } from './cashClimbSaved.js';

describe('cash climb saved events', () => {
  it('keeps the local tablet copy when the cloud event is a different id', () => {
    const local = { id: 'local', updated_at: '2026-09-01T10:00:00.000Z' };
    const cloud = { id: 'cloud', updated_at: '2026-09-01T12:00:00.000Z' };
    assert.equal(preferTournamentCopy(local, cloud).id, 'local');
  });

  it('uses the newer copy when both devices have the same event', () => {
    const local = { id: 'e1', updated_at: '2026-09-01T10:00:00.000Z' };
    const cloud = { id: 'e1', updated_at: '2026-09-01T12:00:00.000Z' };
    assert.equal(preferTournamentCopy(local, cloud).id, 'e1');
    assert.equal(preferTournamentCopy(local, cloud).updated_at, cloud.updated_at);
    assert.equal(preferTournamentCopy(cloud, local).updated_at, cloud.updated_at);
  });

  it('restores the cloud event when local storage is empty', () => {
    assert.equal(preferTournamentCopy(null, { id: 'cloud' }).id, 'cloud');
    assert.equal(preferTournamentCopy(null, null), null);
  });

  it('summarizes a database row for the setup list', () => {
    const item = savedEventSummary({
      id: 'e1',
      status: 'completed',
      updated_at: '2026-08-30',
      payload: { id: 'e1', name: 'Friday Cash Climb', tournamentDate: '2026-08-29' },
    });
    assert.equal(item.id, 'e1');
    assert.equal(item.status, 'completed');
    assert.equal(item.type, '');
    assert.equal(savedStatusLabel(item.status), 'Complete');
    assert.equal(item.tournament.name, 'Friday Cash Climb');
    assert.equal(item.tournament.updated_at, '2026-08-30');
  });

  it('keeps row timestamps on a public event payload', () => {
    const tournament = tournamentFromEventRow({
      id: 'e2',
      status: 'completed',
      updated_at: '2026-08-30T12:00:00.000Z',
      payload: { id: 'e2', name: 'QA', status: 'completed', completedAt: '2026-08-30T11:55:00.000Z' },
    });
    assert.equal(tournament.updated_at, '2026-08-30T12:00:00.000Z');
    assert.equal(tournament.completedAt, '2026-08-30T11:55:00.000Z');
    assert.equal(tournament.status, 'completed');
  });
});
