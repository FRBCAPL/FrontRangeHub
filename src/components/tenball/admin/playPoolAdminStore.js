/**
 * Play Pool admin settings (browser-local for now).
 * Swap this module for a Supabase-backed service later without changing tab UIs.
 *
 * Named playPoolAdminStore.js (not …Settings.js) so Windows case-insensitive
 * imports do not collide with PlayPoolAdminSettings.jsx.
 */

import {
  GAME_EIGHT,
  GAME_NINE,
  GAME_ONE_POCKET,
  GAME_TEN
} from '../gameRules';

export const PLAY_POOL_ADMIN_STORAGE_KEY = 'frph-play-pool-admin-settings';
export const PLAY_POOL_ADMIN_CHANGE_EVENT = 'playPoolAdminSettingsChange';

export const DEFAULT_PLAY_POOL_ADMIN_SETTINGS = {
  modes: {
    [GAME_EIGHT]: true,
    [GAME_NINE]: true,
    [GAME_TEN]: true,
    [GAME_ONE_POCKET]: true
  },
  /** Timing-meter ease (1 = baseline; higher = easier). */
  skillLevel: 1,
  /** Reserved for AI tuning. */
  computerStrength: 'normal',
  tipsEnabled: true,
  showHowToPlayButton: true,
  defaultVsComputer: true,
  notes: ''
};

const MODE_KEYS = [GAME_EIGHT, GAME_NINE, GAME_TEN, GAME_ONE_POCKET];

function clampSkill(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function normalize(raw) {
  const base = { ...DEFAULT_PLAY_POOL_ADMIN_SETTINGS, ...(raw || {}) };
  const modes = { ...DEFAULT_PLAY_POOL_ADMIN_SETTINGS.modes, ...(raw?.modes || {}) };
  MODE_KEYS.forEach((key) => {
    modes[key] = modes[key] !== false;
  });
  // Always keep at least one mode on.
  if (!MODE_KEYS.some((key) => modes[key])) {
    modes[GAME_TEN] = true;
  }
  const strength = String(base.computerStrength || 'normal').toLowerCase();
  return {
    modes,
    skillLevel: clampSkill(base.skillLevel),
    computerStrength: ['easy', 'normal', 'hard'].includes(strength) ? strength : 'normal',
    tipsEnabled: base.tipsEnabled !== false,
    showHowToPlayButton: base.showHowToPlayButton !== false,
    defaultVsComputer: base.defaultVsComputer !== false,
    notes: typeof base.notes === 'string' ? base.notes.slice(0, 2000) : ''
  };
}

export function getPlayPoolAdminSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(PLAY_POOL_ADMIN_STORAGE_KEY) || 'null');
    return normalize(raw);
  } catch {
    return normalize(null);
  }
}

export function setPlayPoolAdminSettings(next) {
  const normalized = normalize({
    ...getPlayPoolAdminSettings(),
    ...next,
    modes: {
      ...getPlayPoolAdminSettings().modes,
      ...(next?.modes || {})
    }
  });
  localStorage.setItem(PLAY_POOL_ADMIN_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(PLAY_POOL_ADMIN_CHANGE_EVENT, { detail: normalized }));
  return normalized;
}

export function resetPlayPoolAdminSettings() {
  localStorage.removeItem(PLAY_POOL_ADMIN_STORAGE_KEY);
  const defaults = normalize(null);
  window.dispatchEvent(new CustomEvent(PLAY_POOL_ADMIN_CHANGE_EVENT, { detail: defaults }));
  return defaults;
}

export function isPlayPoolModeEnabled(modeId, settings = getPlayPoolAdminSettings()) {
  return settings?.modes?.[modeId] !== false;
}

/** React-friendly subscription for live game + admin tabs. */
export function subscribePlayPoolAdminSettings(listener) {
  const onCustom = (event) => listener(event.detail || getPlayPoolAdminSettings());
  const onStorage = (event) => {
    if (event.key === PLAY_POOL_ADMIN_STORAGE_KEY) listener(getPlayPoolAdminSettings());
  };
  window.addEventListener(PLAY_POOL_ADMIN_CHANGE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(PLAY_POOL_ADMIN_CHANGE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
