/**
 * Legends Arcade — formal event payloads.
 * Orchestrator builds these; TV, tablet, vision, and analytics consume them.
 */

export const PAYLOAD_SCHEMA_VERSION = 1;
export const MAX_PLAYER_NAME_LENGTH = 40;

/** Normalize tablet / kiosk player name for leaderboard storage (DB allows up to 40 chars). */
export function normalizePlayerName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .slice(0, MAX_PLAYER_NAME_LENGTH);
}

/**
 * Projected leaderboard rank (1–10) before the score is saved.
 */
export function computeProjectedRank(topScores, score) {
  if (!Number.isFinite(score)) return null;
  if (!Array.isArray(topScores) || !topScores.length) return 1;
  const greater = topScores.filter((row) => Number(row.score) > score).length;
  return Math.min(greater + 1, 10);
}

/**
 * Base score-event payload shared by NEW_HIGH_SCORE, ENTER_PLAYER, QUALIFIED, etc.
 */
export function buildScorePayload(session, fields = {}) {
  const gameName = fields.gameName ?? session?.gameName ?? null;
  const score = fields.score != null ? Math.floor(Number(fields.score)) : null;

  return {
    schemaVersion: PAYLOAD_SCHEMA_VERSION,
    machineId: fields.machineId ?? session?.machineId ?? null,
    gameNumber: fields.gameNumber ?? session?.gameNumber ?? null,
    gameName,
    game: gameName,
    score,
    rank: fields.rank ?? null,
    cutoff: fields.cutoff ?? null,
    confidence: fields.confidence ?? null,
    replayId: fields.replayId ?? null,
    screenshotUrl: fields.screenshotUrl ?? null,
    playerInitials: fields.playerInitials ?? null,
    confirmScore: Boolean(fields.confirmScore),
    reason: fields.reason ?? null
  };
}

export function buildGamePayload(session, fields = {}) {
  const gameName = fields.gameName ?? session?.gameName ?? null;
  return {
    schemaVersion: PAYLOAD_SCHEMA_VERSION,
    machineId: fields.machineId ?? session?.machineId ?? null,
    gameNumber: fields.gameNumber ?? session?.gameNumber ?? null,
    gameName,
    game: gameName
  };
}

export function buildLeaderboardPayload(session, scores, fields = {}) {
  return {
    ...buildGamePayload(session, fields),
    scores: Array.isArray(scores) ? scores : []
  };
}

export function buildPlayerPayload(session, initials, fields = {}) {
  const normalized = normalizePlayerName(initials);
  return {
    ...buildScorePayload(session, {
      ...fields,
      score: fields.score ?? session?.score,
      playerInitials: normalized
    }),
    initials: normalized
  };
}

/** Client helper — read payload with backward-compatible field names */
export function normalizeScorePayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  return {
    machineId: payload.machineId,
    gameNumber: payload.gameNumber,
    gameName: payload.gameName || payload.game,
    game: payload.game || payload.gameName,
    score: payload.score,
    rank: payload.rank,
    cutoff: payload.cutoff,
    confidence: payload.confidence,
    replayId: payload.replayId,
    screenshotUrl: payload.screenshotUrl,
    playerInitials: payload.playerInitials || payload.initials,
    confirmScore: Boolean(payload.confirmScore),
    initials: payload.initials || payload.playerInitials
  };
}
