/**
 * Legends Arcade Event Engine — shared event contract.
 * Vision emits observations; orchestrator emits decisions; clients react.
 */

export const ArcadeRoles = Object.freeze({
  VISION: 'vision',
  TV: 'tv',
  TABLET: 'tablet',
  DEV: 'dev',
  REPLAY: 'replay',
  ADMIN: 'admin'
});

export const ArcadeStates = Object.freeze({
  IDLE: 'IDLE',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
  QUALIFYING: 'QUALIFYING',
  ENTER_NAME: 'ENTER_NAME',
  CELEBRATING: 'CELEBRATING',
  SHUTTING_DOWN: 'SHUTTING_DOWN'
});

/** Raw inputs from vision / dev simulator */
export const VisionEvents = Object.freeze({
  MENU_SELECTED: 'MENU_SELECTED',
  GAME_STARTED: 'GAME_STARTED',
  GAME_OVER: 'GAME_OVER',
  OCR_COMPLETE: 'OCR_COMPLETE'
});

/** Orchestrator broadcasts — clients subscribe to these */
export const ArcadeEvents = Object.freeze({
  GAME_SELECTED: 'GAME_SELECTED',
  GAME_STARTED: 'GAME_STARTED',
  GAME_OVER: 'GAME_OVER',
  OCR_COMPLETE: 'OCR_COMPLETE',
  QUALIFIED: 'QUALIFIED',
  NOT_QUALIFIED: 'NOT_QUALIFIED',
  NEW_HIGH_SCORE: 'NEW_HIGH_SCORE',
  ENTER_PLAYER: 'ENTER_PLAYER',
  SCORE_UNCERTAIN: 'SCORE_UNCERTAIN',
  PLAYER_SUBMITTED: 'PLAYER_SUBMITTED',
  PLAYER_IDENTIFIED: 'PLAYER_IDENTIFIED',
  PLAYER_TIMEOUT: 'PLAYER_TIMEOUT',
  REPLAY_READY: 'REPLAY_READY',
  LEADERBOARD_UPDATED: 'LEADERBOARD_UPDATED',
  BACK_TO_IDLE: 'BACK_TO_IDLE',
  VISION_DEGRADED: 'VISION_DEGRADED',
  STATE_CHANGED: 'STATE_CHANGED',
  SHUTDOWN_REQUESTED: 'SHUTDOWN_REQUESTED',
  SYSTEM_RESTARTING: 'SYSTEM_RESTARTING',
  LEADERBOARD_REFRESH: 'LEADERBOARD_REFRESH'
});

export const DEFAULT_MACHINE_ID = 'legends-cabinet-1';

export const ENVELOPE_SCHEMA_VERSION = 1;

export function createEventEnvelope(event, payload = {}, sessionId = null) {
  return {
    type: 'EVENT',
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
    event,
    payload,
    sessionId,
    timestamp: new Date().toISOString()
  };
}
