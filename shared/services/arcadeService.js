import { supabase } from '@shared/config/supabase.js';

const LOCAL_STORAGE_PREFIX = 'frph-arcade-scores';
const SUPABASE_MODE_KEY = 'frph-arcade-supabase-mode';
const TOP_SCORES_LIMIT = 10;

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
  } catch {
    // fall through to local mode
  }

  persistMode('local');
  return 'local';
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

        if (isTableMissingError(error)) {
          persistMode('local');
        }
      } catch {
        persistMode('local');
      }
    }

    return {
      success: true,
      data: readLocalScores(machineId, gameNumber, gameName),
      source: 'local'
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

  async getTopScore(machineId, gameNumber, gameName) {
    const result = await this.getScores(machineId, gameNumber, gameName);
    return result.data?.[0] || null;
  }

  async getMachine(machineId) {
    try {
      const { data, error } = await supabase
        .from('arcade_machines')
        .select('id, name, location, is_active, maintenance_mode, maintenance_message, price_text')
        .eq('id', machineId)
        .maybeSingle();

      if (!error && data) {
        return { success: true, data };
      }
    } catch {
      // fall through
    }
    return { success: false, data: null };
  }

  async updateMachine(machineId, patch) {
    try {
      const { data, error } = await supabase
        .from('arcade_machines')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', machineId)
        .select()
        .maybeSingle();

      if (!error) {
        return { success: true, data };
      }
      return { success: false, error: error.message };
    } catch (err) {
      return { success: false, error: err.message || 'Update failed.' };
    }
  }

  async getAllScores(machineId, gameNumber, gameName = '', limit = 50) {
    const mode = await resolveStorageMode();

    if (mode === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('arcade_scores')
          .select('id, initials, score, updated_at, game_name')
          .eq('machine_id', machineId)
          .eq('game_number', gameNumber)
          .order('score', { ascending: false })
          .limit(limit);

        if (!error && Array.isArray(data)) {
          return { success: true, data, source: 'supabase' };
        }
      } catch {
        // fall through
      }
    }

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

  async updateScoreValue(scoreId, score) {
    if (!Number.isFinite(score) || score <= 0) {
      return { success: false, error: 'Invalid score.' };
    }
    if (String(scoreId).indexOf('local-') === 0) {
      return { success: false, error: 'Cannot edit local-only scores from admin.' };
    }

    try {
      const { error } = await supabase
        .from('arcade_scores')
        .update({ score: Math.floor(score), updated_at: new Date().toISOString() })
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
