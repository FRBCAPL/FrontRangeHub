import { supabase } from '@shared/config/supabase.js';

const LOCAL_STORAGE_PREFIX = 'frph-arcade-scores';
const SUPABASE_MODE_KEY = 'frph-arcade-supabase-mode';
const EVENT_SERVER_HTTP_KEY = 'arcade-events-http';
const EVENT_WS_KEY = 'arcade-events-ws';
const ADMIN_PIN_KEY = 'arcade-admin-pin';
const TOP_SCORES_LIMIT = 10;
const EVENT_SERVER_TIMEOUT_MS = 4500;

/** null = unknown, 'supabase' | 'local' after first probe */
let supabaseArcadeMode = null;

function gameKey(machineId, gameNumber, gameName) {
  return `${machineId}|${gameNumber}|${gameName}`;
}

function readStoredMode() {
  try {
    const stored = sessionStorage.getItem(SUPABASE_MODE_KEY);
    if (stored === 'supabase' || stored === 'local') {
      return stored;
    }
  } catch {
    // ignore storage errors in kiosk browsers
  }
  return null;
}

function persistMode(mode) {
  supabaseArcadeMode = mode;
  try {
    sessionStorage.setItem(SUPABASE_MODE_KEY, mode);
  } catch {
    // ignore storage errors in kiosk browsers
  }
}

function isTableMissingError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  const status = error.status || error.statusCode;
  return (
    status === 404 ||
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

function isSupabaseSuspendedError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode;
  const message = String(error.message || error.details || error.hint || '').toLowerCase();
  const raw = JSON.stringify(error).toLowerCase();
  return (
    status === 402 ||
    status === 503 ||
    message.includes('exceed_egress_quota') ||
    message.includes('payment required') ||
    message.includes('service for this project is restricted') ||
    raw.includes('exceed_egress_quota')
  );
}

/** Clear cached kiosk/TV/admin mode after Supabase is restored or mis-detected as local. */
export function clearArcadeSupabaseModeCache() {
  supabaseArcadeMode = null;
  try {
    sessionStorage.removeItem(SUPABASE_MODE_KEY);
  } catch {
    // ignore
  }
}

/** HTTP base for Optiplex event server (scores/settings API). */
export function resolveEventServerBaseUrl() {
  if (typeof window === 'undefined') return null;

  try {
    const explicit = localStorage.getItem(EVENT_SERVER_HTTP_KEY);
    if (explicit) return explicit.replace(/\/$/, '');
  } catch {
    // ignore
  }

  try {
    const ws = localStorage.getItem(EVENT_WS_KEY);
    if (ws) return ws.replace(/^ws/i, 'http').replace(/\/$/, '');
  } catch {
    // ignore
  }

  const host = window.location.hostname || '';
  const port = window.location.port || '';
  if (port === '3080') {
    return `${window.location.protocol}//${host}:${port}`;
  }
  if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (port === '5173' || port === '4173' || port === '') {
      return `http://${host}:3080`;
    }
  }
  return null;
}

export function setEventServerBaseUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/$/, '');
  try {
    if (trimmed) {
      localStorage.setItem(EVENT_SERVER_HTTP_KEY, trimmed);
      localStorage.setItem(EVENT_WS_KEY, trimmed.replace(/^http/i, 'ws'));
    } else {
      localStorage.removeItem(EVENT_SERVER_HTTP_KEY);
    }
  } catch {
    // ignore
  }
}

export function getArcadeAdminPin() {
  try {
    return sessionStorage.getItem(ADMIN_PIN_KEY) || localStorage.getItem(ADMIN_PIN_KEY) || '';
  } catch {
    return '';
  }
}

export function setArcadeAdminPin(pin) {
  const value = String(pin || '').trim();
  try {
    if (value) {
      sessionStorage.setItem(ADMIN_PIN_KEY, value);
      localStorage.setItem(ADMIN_PIN_KEY, value);
    } else {
      sessionStorage.removeItem(ADMIN_PIN_KEY);
      localStorage.removeItem(ADMIN_PIN_KEY);
    }
  } catch {
    // ignore
  }
}

async function fetchEventServerJson(path, options = {}) {
  const base = resolveEventServerBaseUrl();
  if (!base) {
    return { reachable: false, reason: 'no_event_server_url' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || EVENT_SERVER_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    clearTimeout(timeout);
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { reachable: true, ok: res.ok, status: res.status, data, base };
  } catch (err) {
    clearTimeout(timeout);
    return {
      reachable: false,
      reason: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network')
    };
  }
}

async function getMachineFromEventServer(machineId) {
  const result = await fetchEventServerJson(
    `/api/settings?machine_id=${encodeURIComponent(machineId)}`
  );
  if (!result.reachable) {
    return { tried: false, reachable: false, reason: result.reason };
  }
  if (result.ok && result.data?.success && result.data?.data) {
    return {
      tried: true,
      success: true,
      data: result.data.data,
      source: 'optiplex',
      base: result.base
    };
  }
  return {
    tried: true,
    success: false,
    error: result.data?.error || 'Could not load settings from Optiplex.'
  };
}

async function updateMachineOnEventServer(machineId, patch) {
  const pin = getArcadeAdminPin();
  if (!pin) {
    return {
      tried: true,
      success: false,
      needsPin: true,
      error: 'Enter the staff PIN under Tools → Optiplex connection (same PIN as the tablet control panel).'
    };
  }

  const result = await fetchEventServerJson('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ pin, machine_id: machineId, settings: patch })
  });

  if (!result.reachable) {
    return { tried: false, reachable: false, reason: result.reason };
  }
  if (result.ok && result.data?.success) {
    return {
      tried: true,
      success: true,
      data: result.data.data,
      source: 'optiplex',
      base: result.base
    };
  }
  if (result.status === 403) {
    return {
      tried: true,
      success: false,
      needsPin: true,
      error: 'Incorrect staff PIN for the Optiplex.'
    };
  }
  return {
    tried: true,
    success: false,
    error: result.data?.error || 'Could not save settings on the Optiplex.'
  };
}

function hasAnyLocalScores() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX);
    if (!raw || raw === '{}') return false;
    const all = JSON.parse(raw);
    return Object.keys(all).some((key) => Array.isArray(all[key]) && all[key].length > 0);
  } catch {
    return false;
  }
}

async function resolveStorageMode() {
  if (supabaseArcadeMode) {
    return supabaseArcadeMode;
  }

  const stored = readStoredMode();
  if (stored) {
    supabaseArcadeMode = stored;
    return stored;
  }

  try {
    const { error } = await supabase
      .from('arcade_scores')
      .select('id')
      .limit(1);

    if (!error) {
      persistMode('supabase');
      return 'supabase';
    }

    if (isTableMissingError(error)) {
      persistMode('local');
      return 'local';
    }

    if (isSupabaseSuspendedError(error)) {
      supabaseArcadeMode = 'supabase';
      return 'supabase';
    }
  } catch {
    // transient network error — keep trying Supabase
  }

  supabaseArcadeMode = 'supabase';
  return 'supabase';
}

function readLocalScores(machineId, gameNumber, gameName) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX);
    const all = raw ? JSON.parse(raw) : {};
    return all[gameKey(machineId, gameNumber, gameName)] || [];
  } catch {
    return [];
  }
}

function writeLocalScores(machineId, gameNumber, gameName, scores) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX);
    const all = raw ? JSON.parse(raw) : {};
    all[gameKey(machineId, gameNumber, gameName)] = scores;
    localStorage.setItem(LOCAL_STORAGE_PREFIX, JSON.stringify(all));
  } catch (err) {
    console.warn('Arcade local score save failed:', err);
  }
}

function sortAndTrim(scores) {
  return [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_SCORES_LIMIT);
}

function mergeScore(existing, initials, score) {
  const normalizedInitials = initials.trim().toUpperCase().slice(0, 3);
  const next = [...existing];
  const index = next.findIndex((entry) => entry.initials === normalizedInitials);

  if (index >= 0) {
    if (score > next[index].score) {
      next[index] = {
        ...next[index],
        score,
        updated_at: new Date().toISOString()
      };
    }
  } else {
    next.push({
      initials: normalizedInitials,
      score,
      updated_at: new Date().toISOString()
    });
  }

  return sortAndTrim(next);
}

class ArcadeService {
  /**
   * Fetch top scores for a game. Uses Supabase when tables exist, else localStorage.
   */
  async getScores(machineId, gameNumber, gameName) {
    const mode = await resolveStorageMode();

    if (mode === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('arcade_scores')
          .select('initials, score, updated_at')
          .eq('machine_id', machineId)
          .eq('game_number', gameNumber)
          .order('score', { ascending: false })
          .limit(TOP_SCORES_LIMIT);

        if (!error && Array.isArray(data)) {
          return { success: true, data, source: 'supabase' };
        }

        if (isSupabaseSuspendedError(error)) {
          return {
            success: false,
            data: [],
            source: 'supabase',
            error:
              'Supabase cloud leaderboard is temporarily unavailable (plan egress limit). Scores are not deleted — restore the Supabase project to see them again.'
          };
        }

        if (isTableMissingError(error)) {
          persistMode('local');
        }
      } catch {
        // fall through only for kiosk offline use
      }
    }

    if (supabaseArcadeMode === 'local' || readStoredMode() === 'local') {
      return {
        success: true,
        data: readLocalScores(machineId, gameNumber, gameName),
        source: 'local'
      };
    }

    return {
      success: false,
      data: [],
      source: 'supabase',
      error: 'Could not load scores from Supabase.'
    };
  }

  /**
   * Save a score if it beats the player's existing best for that game.
   */
  async submitScore({ machineId, gameNumber, gameName, initials, score }) {
    const normalizedInitials = initials.trim().toUpperCase().slice(0, 3);
    if (!normalizedInitials || !Number.isFinite(score) || score <= 0) {
      return { success: false, error: 'Invalid initials or score.' };
    }

    const mode = await resolveStorageMode();

    if (mode === 'supabase') {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('arcade_scores')
          .select('id, score')
          .eq('machine_id', machineId)
          .eq('game_number', gameNumber)
          .eq('initials', normalizedInitials)
          .maybeSingle();

        if (!fetchError) {
          if (existing && score <= existing.score) {
            const all = await this.getScores(machineId, gameNumber, gameName);
            return { success: true, data: all.data, message: 'Score not higher than existing best.' };
          }

          const payload = {
            machine_id: machineId,
            game_number: gameNumber,
            game_name: gameName,
            initials: normalizedInitials,
            score: Math.floor(score),
            updated_at: new Date().toISOString()
          };

          if (existing?.id) {
            await supabase.from('arcade_scores').update(payload).eq('id', existing.id);
          } else {
            await supabase.from('arcade_scores').insert(payload);
          }

          const all = await this.getScores(machineId, gameNumber, gameName);
          return { success: true, data: all.data, source: 'supabase' };
        }

        if (isTableMissingError(fetchError)) {
          persistMode('local');
        }
      } catch {
        persistMode('local');
      }
    }

    const local = readLocalScores(machineId, gameNumber, gameName);
    const merged = mergeScore(local, normalizedInitials, Math.floor(score));
    writeLocalScores(machineId, gameNumber, gameName, merged);
    return { success: true, data: merged, source: 'local' };
  }

  /**
   * Staff/admin: add or update a leaderboard entry for any game (no "must beat prior" rule).
   */
  async adminAddScore({ machineId, gameNumber, gameName, initials, score, photoUrl = null }) {
    const displayName = initials.trim().slice(0, 40);
    if (!displayName || !Number.isFinite(score) || score <= 0) {
      return { success: false, error: 'Enter a name and a score greater than zero.' };
    }

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('arcade_scores')
        .select('id')
        .eq('machine_id', machineId)
        .eq('game_number', gameNumber)
        .eq('initials', displayName)
        .maybeSingle();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      const payload = {
        machine_id: machineId,
        game_number: gameNumber,
        game_name: gameName || `Game ${gameNumber}`,
        initials: displayName,
        score: Math.floor(score),
        updated_at: new Date().toISOString()
      };
      if (photoUrl) {
        payload.photo_url = photoUrl;
      }

      if (existing?.id) {
        const { error } = await supabase.from('arcade_scores').update(payload).eq('id', existing.id);
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, updated: true };
      }

      const { error } = await supabase.from('arcade_scores').insert(payload);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, updated: false };
    } catch (err) {
      return { success: false, error: err.message || 'Could not save score.' };
    }
  }

  async getTopScore(machineId, gameNumber, gameName) {
    const result = await this.getScores(machineId, gameNumber, gameName);
    return result.data?.[0] || null;
  }

  async getMachine(machineId) {
    const local = await getMachineFromEventServer(machineId);
    if (local.success) {
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('arcade_machines')
        .select('id, name, location, is_active, maintenance_mode, maintenance_message, price_text, tv_rotation_count, tv_rotation_games, tv_gom_number, tv_gom_prize, tv_gom_subtitle')
        .eq('id', machineId)
        .maybeSingle();

      if (!error && data) {
        return { success: true, data, source: 'supabase' };
      }
    } catch {
      // fall through
    }
    if (local.tried && local.error) {
      return { success: false, data: null, error: local.error, source: 'optiplex' };
    }
    return { success: false, data: null, source: 'none' };
  }

  async updateMachine(machineId, patch) {
    const local = await updateMachineOnEventServer(machineId, patch);
    if (local.success) {
      return local;
    }
    if (local.tried && (local.needsPin || local.error?.includes('PIN'))) {
      return { success: false, error: local.error, source: 'optiplex', needsPin: local.needsPin };
    }
    if (local.tried && local.success === false && local.reachable !== false) {
      return { success: false, error: local.error || 'Optiplex save failed.', source: 'optiplex' };
    }

    try {
      const { data, error } = await supabase
        .from('arcade_machines')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', machineId)
        .select()
        .maybeSingle();

      if (!error) {
        return {
          success: true,
          data,
          source: 'supabase',
          warning: 'Saved to website cloud only — Optiplex was unreachable. TV at the bar uses local settings until you save from the venue.'
        };
      }
      return { success: false, error: error.message, source: 'supabase' };
    } catch (err) {
      return { success: false, error: err.message || 'Update failed.', source: 'none' };
    }
  }

  async getAllScores(machineId, gameNumber, gameName = '', limit = 50) {
    try {
      const { data, error } = await supabase
        .from('arcade_scores')
        .select('id, initials, score, updated_at, game_name')
        .eq('machine_id', machineId)
        .eq('game_number', gameNumber)
        .order('score', { ascending: false })
        .limit(limit);

      if (error) {
        if (isSupabaseSuspendedError(error)) {
          return {
            success: false,
            data: [],
            source: 'supabase',
            error:
              'Supabase is blocking API access (egress quota exceeded). Your scores are still in the database — open Supabase dashboard → Billing and restore the project.'
          };
        }
        if (isTableMissingError(error)) {
          const local = readLocalScores(machineId, gameNumber, gameName);
          return {
            success: true,
            data: local.map((entry, index) => ({
              id: `local-${index}`,
              initials: entry.initials,
              score: entry.score,
              updated_at: entry.updated_at
            })),
            source: 'local'
          };
        }
        return { success: false, data: [], source: 'supabase', error: error.message || 'Could not load scores.' };
      }

      persistMode('supabase');
      return { success: true, data: data || [], source: 'supabase' };
    } catch (err) {
      return {
        success: false,
        data: [],
        source: 'supabase',
        error: err.message || 'Could not load scores.'
      };
    }
  }

  async deleteScore(scoreId) {
    if (String(scoreId).indexOf('local-') === 0) {
      return { success: false, error: 'Cannot delete local-only scores from admin. Clear on the tablet or enable Supabase.' };
    }

    try {
      const { error } = await supabase.from('arcade_scores').delete().eq('id', scoreId);
      if (!error) {
        return { success: true };
      }
      return { success: false, error: error.message };
    } catch (err) {
      return { success: false, error: err.message || 'Delete failed.' };
    }
  }

  async updateScoreEntry(scoreId, { initials, score }) {
    const normalizedInitials = initials.trim().toUpperCase().slice(0, 3);
    if (!normalizedInitials) {
      return { success: false, error: 'Invalid initials.' };
    }
    if (!Number.isFinite(score) || score <= 0) {
      return { success: false, error: 'Invalid score.' };
    }
    if (String(scoreId).indexOf('local-') === 0) {
      return { success: false, error: 'Cannot edit local-only scores from admin.' };
    }

    try {
      const { data: current, error: fetchError } = await supabase
        .from('arcade_scores')
        .select('id, initials, machine_id, game_number')
        .eq('id', scoreId)
        .maybeSingle();

      if (fetchError || !current) {
        return { success: false, error: fetchError?.message || 'Score not found.' };
      }

      if (normalizedInitials !== current.initials) {
        const { data: conflict, error: conflictError } = await supabase
          .from('arcade_scores')
          .select('id')
          .eq('machine_id', current.machine_id)
          .eq('game_number', current.game_number)
          .eq('initials', normalizedInitials)
          .maybeSingle();

        if (!conflictError && conflict && conflict.id !== scoreId) {
          return {
            success: false,
            error: `Initials "${normalizedInitials}" already have a score. Delete or edit that entry first.`
          };
        }
      }

      const { error } = await supabase
        .from('arcade_scores')
        .update({
          initials: normalizedInitials,
          score: Math.floor(score),
          updated_at: new Date().toISOString()
        })
        .eq('id', scoreId);

      if (!error) {
        return { success: true };
      }
      return { success: false, error: error.message };
    } catch (err) {
      return { success: false, error: err.message || 'Update failed.' };
    }
  }
}

const arcadeService = new ArcadeService();
export default arcadeService;
