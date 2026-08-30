import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { preferLocalTournament, savedEventSummary, savedStatusLabel, tournamentFromEventRow } from './cashClimbSaved.js';

describe('cash climb saved events', () => {
  it('keeps the local tablet copy when both exist', () => {
    const local = { id: 'local' };
    const cloud = { id: 'cloud' };
    assert.equal(preferLocalTournament(local, cloud).id, 'local');
  });

  it('restores the cloud event when local storage is empty', () => {
    assert.equal(preferLocalTournament(null, { id: 'cloud' }).id, 'cloud');
    assert.equal(preferLocalTournament(null, null), null);
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
