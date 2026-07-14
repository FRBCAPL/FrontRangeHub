/* Legends Arcade TV — auto-cycling leaderboard display (ES5) */
(function () {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var LOCAL_KEY = 'frph-arcade-scores';
  var MODE_KEY = 'frph-arcade-supabase-mode';
  var GAMES_URL = resolveGamesUrl();
  var KIOSK_URL = 'https://frontrangepool.com/arcade-kiosk-lite';
  var TOP_LIMIT = 10;
  var GOM_SCORES_LIMIT = 6;
  var ROTATE_MS = 12000;
  var ROTATE_MS_EMPTY = 5000;
  var INSTRUCTIONS_ROTATE_MS = 20000;
  var TITLE_TRANSITION_MS = 2500;
  var ROTATION_LIMIT = 8;
  var CLASSICS_SHOW = 18;
  var CHAMPS_LIMIT = 8;
  var TITLE_COLOR_STEP_COUNT = 3;
  var ARCADE_COLOR_STOPS = '#22d3ee, #a78bfa, #f472b6, #fbbf24, #a3e635, #22d3ee';
  var TITLE_GLOW_STOPS = [
    'drop-shadow(0 0 12px rgba(34, 211, 238, 0.9)) drop-shadow(0 0 26px rgba(34, 211, 238, 0.6)) drop-shadow(0 0 48px rgba(34, 211, 238, 0.32))',
    'drop-shadow(0 0 12px rgba(167, 139, 250, 0.9)) drop-shadow(0 0 26px rgba(167, 139, 250, 0.6)) drop-shadow(0 0 48px rgba(167, 139, 250, 0.32))',
    'drop-shadow(0 0 12px rgba(244, 114, 182, 0.9)) drop-shadow(0 0 26px rgba(244, 114, 182, 0.6)) drop-shadow(0 0 48px rgba(244, 114, 182, 0.32))',
    'drop-shadow(0 0 12px rgba(251, 191, 36, 0.9)) drop-shadow(0 0 26px rgba(251, 191, 36, 0.6)) drop-shadow(0 0 48px rgba(251, 191, 36, 0.32))',
    'drop-shadow(0 0 12px rgba(163, 230, 53, 0.9)) drop-shadow(0 0 26px rgba(163, 230, 53, 0.6)) drop-shadow(0 0 48px rgba(163, 230, 53, 0.32))'
  ];
  var TITLE_GRADIENT_STYLES = [
    { image: 'linear-gradient(90deg, ' + ARCADE_COLOR_STOPS + ')', size: '400% 100%', axis: 'x' },
    { image: 'linear-gradient(270deg, ' + ARCADE_COLOR_STOPS + ')', size: '400% 100%', axis: 'x-rev' },
    { image: 'linear-gradient(180deg, ' + ARCADE_COLOR_STOPS + ')', size: '100% 400%', axis: 'y' },
    { image: 'linear-gradient(0deg, ' + ARCADE_COLOR_STOPS + ')', size: '100% 400%', axis: 'y-rev' },
    { image: 'linear-gradient(135deg, ' + ARCADE_COLOR_STOPS + ')', size: '360% 360%', axis: 'diag' },
    { image: 'linear-gradient(45deg, ' + ARCADE_COLOR_STOPS + ')', size: '360% 360%', axis: 'diag-rev' },
    { image: 'linear-gradient(60deg, ' + ARCADE_COLOR_STOPS + ')', size: '380% 280%', axis: 'diag' },
    { image: 'linear-gradient(120deg, ' + ARCADE_COLOR_STOPS + ')', size: '380% 280%', axis: 'diag-rev' },
    { image: 'radial-gradient(ellipse at 25% 50%, ' + ARCADE_COLOR_STOPS + ')', size: '280% 280%', axis: 'x' },
    { image: 'radial-gradient(ellipse at 75% 50%, ' + ARCADE_COLOR_STOPS + ')', size: '280% 280%', axis: 'x-rev' },
    { image: 'radial-gradient(circle at 50% 40%, ' + ARCADE_COLOR_STOPS + ')', size: '320% 320%', axis: 'y' },
    { image: 'radial-gradient(ellipse at 50% 80%, ' + ARCADE_COLOR_STOPS + ')', size: '300% 300%', axis: 'y-rev' }
  ];
  var titleColorStep = 0;
  var currentTitleStyle = null;
  var titleColorTimer = null;
  var SLIDE_FADE_MS = 650;
  var QR_GLOW_COLORS = [
    { r: 34, g: 211, b: 238 },
    { r: 167, g: 139, b: 250 },
    { r: 244, g: 114, b: 182 },
    { r: 251, g: 191, b: 36 },
    { r: 163, g: 230, b: 53 }
  ];
  var QR_GLOW_HOLD_MIN_MS = 3500;
  var QR_GLOW_HOLD_MAX_MS = 11000;
  var QR_GLOW_TRANSITION_MIN_MS = 2200;
  var QR_GLOW_TRANSITION_MAX_MS = 5500;
  var QR_GLOW_PAUSE_MIN_MS = 2000;
  var QR_GLOW_PAUSE_MAX_MS = 8000;
  var QR_GROW_SHIFT_MIN_MS = 12000;
  var QR_GROW_SHIFT_MAX_MS = 16000;
  var QR_GROW_WAIT_MIN_MS = 10000;
  var QR_GROW_WAIT_MAX_MS = 22000;
  var qrGlowActiveEl = null;
  var tvSettings = {
    count: 8,
    gameNumbers: null
  };
  var gameOfMonth = {
    number: 4,
    name: 'Galaga',
    prizeLine: 'WIN A FREE BURGER',
    subtitle: 'Highest score wins — ask staff for details!'
  };

  function resolveGamesUrl() {
    var path = '';
    var host = '';
    try {
      path = location.pathname || '';
      host = location.hostname || '';
    } catch (e0) {
      path = '';
      host = '';
    }
    if (path.indexOf('/tv') === 0 || path.indexOf('/arcade-tv') >= 0) {
      if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        return '/api/games?v=20250719a';
      }
    }
    return '../arcade-kiosk-lite/games.json?v=20250719a';
  }

  function useEventServerScores() {
    var port = '';
    var host = '';
    var pathName = '';
    try {
      port = location.port || '';
      host = location.hostname || '';
      pathName = location.pathname || '';
    } catch (ePort) {
      return false;
    }
    if (port === '3080') return true;
    return (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host))
      && (pathName.indexOf('/tv') === 0 || pathName.indexOf('/arcade-tv') >= 0);
  }

  var machine = null;
  var games = [];
  var storageMode = null;
  var slides = [];
  var slideIndex = 0;
  var rotateTimer = null;
  var rotationPausedByUser = false;
  var rotateDeadline = null;
  var rotateRemainingMs = null;
  var scoreCache = {};
  var rotationGames = [];
  var classicsList = [];
  var championsData = [];
  var prizeWinsData = [];
  var prizeWinsTotal = 0;
  var PRIZE_WINS_LIMIT = 8;
  var transitioning = false;

  function $(id) {
    return document.getElementById(id);
  }

  function trim(str) {
    return (str || '').replace(/^\s+|\s+$/g, '');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderGameNumberHtml(number, sizeClass) {
    var size = sizeClass || 'banner';
    return '<span class="tv-game-number-block tv-game-number-block--' + size + '">'
      + '<span class="tv-game-number-label">Game Number</span>'
      + '<span class="tv-game-number-value">#' + number + '</span>'
      + '</span>';
  }

  function formatScore(n) {
    var num = parseInt(n, 10);
    if (isNaN(num)) return String(n || '0');
    var s = String(num);
    var out = '';
    var i;
    for (i = s.length; i > 0; i -= 3) {
      out = s.substring(Math.max(0, i - 3), i) + (out ? ',' + out : '');
    }
    return out;
  }

  function xhr(method, url, body, callback) {
    var req = new XMLHttpRequest();
    req.open(method, url, true);
    req.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    req.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_ANON_KEY);
    req.setRequestHeader('Content-Type', 'application/json');
    req.onreadystatechange = function () {
      if (req.readyState !== 4) return;
      var ok = req.status >= 200 && req.status < 300;
      var data = null;
      try {
        if (req.responseText) data = JSON.parse(req.responseText);
      } catch (e) {
        data = null;
      }
      callback(ok, req.status, data, req.responseText);
    };
    req.send(body ? JSON.stringify(body) : null);
  }

  function isTableMissing(status, data, text) {
    if (status === 404) return true;
    var msg = '';
    if (data && data.message) msg = String(data.message).toLowerCase();
    else if (text) msg = String(text).toLowerCase();
    return msg.indexOf('does not exist') >= 0 || msg.indexOf('could not find') >= 0;
  }

  function isSupabaseSuspended(status, text) {
    if (status === 402 || status === 503) return true;
    var msg = String(text || '').toLowerCase();
    return msg.indexOf('exceed_egress_quota') >= 0
      || msg.indexOf('payment required') >= 0
      || msg.indexOf('service for this project is restricted') >= 0;
  }

  var cloudOffline = false;

  function setCloudOffline(active) {
    cloudOffline = active;
    var label = $('tv-status-label');
    var block = $('tv-status');
    var indicator = $('tv-online-indicator');
    if (!label) return;
    if (active) {
      if (indicator) indicator.className = 'tv-online-indicator';
      label.textContent = 'offline';
      label.className = 'tv-status-label is-ready';
      if (block) block.className = 'tv-status-block is-ready';
    } else {
      updateOnlineStatus();
    }
  }

  function readMode() {
    try {
      return sessionStorage.getItem(MODE_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeMode(mode) {
    storageMode = mode;
    try {
      sessionStorage.setItem(MODE_KEY, mode);
    } catch (e) {}
    updateOnlineStatus();
  }

  function resolveStorageMode(done) {
    if (storageMode) {
      done(storageMode);
      return;
    }
    var stored = readMode();
    if (stored === 'supabase' || stored === 'local') {
      storageMode = stored;
      done(stored);
      return;
    }
    var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=id&limit=1';
    xhr('GET', url, null, function (ok, status, data, text) {
      if (ok) {
        writeMode('supabase');
        setCloudOffline(false);
        done('supabase');
      } else if (isSupabaseSuspended(status, text)) {
        storageMode = 'supabase';
        setCloudOffline(true);
        done('supabase');
      } else if (isTableMissing(status, data, text)) {
        writeMode('local');
        done('local');
      } else {
        storageMode = 'supabase';
        done('supabase');
      }
    });
  }

  function gameStorageKey(gameNumber, gameName) {
    return machine.id + '|' + gameNumber + '|' + gameName;
  }

  function readLocalScores(gameNumber, gameName) {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      var all = raw ? JSON.parse(raw) : {};
      return all[gameStorageKey(gameNumber, gameName)] || [];
    } catch (e) {
      return [];
    }
  }

  function fetchSupabaseScores(gameNumber, selectFields, callback) {
    var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=' + selectFields
      + '&machine_id=eq.' + encodeURIComponent(machine.id)
      + '&game_number=eq.' + encodeURIComponent(String(gameNumber))
      + '&order=score.desc&limit=' + TOP_LIMIT;
    xhr('GET', url, null, callback);
  }

  function shouldRetryScoresWithoutPhoto(status, text) {
    if (status === 400) return true;
    var msg = String(text || '').toLowerCase();
    return msg.indexOf('photo_url') >= 0 || msg.indexOf('column') >= 0;
  }

  function getScores(gameNumber, gameName, done) {
    var cacheKey = gameNumber + '|' + gameName;
    if (useEventServerScores() && machine && machine.id) {
      var apiUrl = '/api/scores?machine_id=' + encodeURIComponent(machine.id)
        + '&game_number=' + encodeURIComponent(String(gameNumber));
      xhr('GET', apiUrl, null, function (ok, status, data) {
        var rows = ok && data && data.success ? (data.data || []) : [];
        scoreCache[cacheKey] = rows;
        done(rows);
      });
      return;
    }
    resolveStorageMode(function (mode) {
      if (mode === 'supabase') {
        fetchSupabaseScores(gameNumber, 'initials,score,updated_at,photo_url', function (ok, status, data, text) {
          if (ok && data) {
            setCloudOffline(false);
            scoreCache[cacheKey] = data;
            done(data);
            return;
          }
          if (isSupabaseSuspended(status, text)) {
            setCloudOffline(true);
            scoreCache[cacheKey] = [];
            done([]);
            return;
          }
          if (shouldRetryScoresWithoutPhoto(status, text)) {
            fetchSupabaseScores(gameNumber, 'initials,score,updated_at', function (ok2, status2, data2, text2) {
              if (ok2 && data2) {
                setCloudOffline(false);
                scoreCache[cacheKey] = data2;
                done(data2);
                return;
              }
              if (isSupabaseSuspended(status2, text2)) {
                setCloudOffline(true);
                scoreCache[cacheKey] = [];
                done([]);
                return;
              }
              if (isTableMissing(status2, data2, text2)) writeMode('local');
              var local = readLocalScores(gameNumber, gameName);
              scoreCache[cacheKey] = local;
              done(local);
            });
            return;
          }
          if (isTableMissing(status, data, text)) writeMode('local');
          var localScores = readLocalScores(gameNumber, gameName);
          scoreCache[cacheKey] = localScores;
          done(localScores);
        });
      } else {
        var localScores = readLocalScores(gameNumber, gameName);
        scoreCache[cacheKey] = localScores;
        done(localScores);
      }
    });
  }

  function parseUpdatedAt(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    var t = Date.parse(val);
    return isNaN(t) ? 0 : t;
  }

  function readLocalScoredGamesMap() {
    var map = {};
    var key;
    var parts;
    var gn;
    var gname;
    var scores;
    var j;
    var maxTs;
    var ts;
    if (!machine || !machine.id) return map;
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      var all = raw ? JSON.parse(raw) : {};
      for (key in all) {
        if (!all.hasOwnProperty(key)) continue;
        parts = key.split('|');
        if (parts.length < 3 || parts[0] !== machine.id) continue;
        gn = parseInt(parts[1], 10);
        gname = parts.slice(2).join('|');
        scores = all[key];
        if (!gn || !scores || !scores.length) continue;
        maxTs = 0;
        for (j = 0; j < scores.length; j++) {
          ts = parseUpdatedAt(scores[j].updated_at);
          if (ts > maxTs) maxTs = ts;
        }
        if (!map[gn] || maxTs > map[gn].updated) {
          map[gn] = { game_number: gn, game_name: gname, updated: maxTs };
        }
      }
    } catch (e) {}
    return map;
  }

  function loadScoredGamesMap(done) {
    if (useEventServerScores() && machine && machine.id) {
      var gamesUrl = '/api/scores/games?machine_id=' + encodeURIComponent(machine.id);
      xhr('GET', gamesUrl, null, function (ok, status, data) {
        var map = {};
        var i;
        var row;
        if (ok && data && data.success && data.data) {
          for (i = 0; i < data.data.length; i++) {
            row = data.data[i];
            if (!row.game_number) continue;
            map[row.game_number] = {
              game_number: row.game_number,
              game_name: row.game_name,
              updated: parseUpdatedAt(row.updated_at)
            };
          }
        }
        done(map);
      });
      return;
    }
    resolveStorageMode(function (mode) {
      if (mode === 'supabase' && machine && machine.id) {
        var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=game_number,game_name,updated_at'
          + '&machine_id=eq.' + encodeURIComponent(machine.id)
          + '&order=updated_at.desc';
        xhr('GET', url, null, function (ok, status, data, text) {
          var map = {};
          var i;
          var row;
          var gn;
          if (ok && data) {
            for (i = 0; i < data.length; i++) {
              row = data[i];
              gn = row.game_number;
              if (!gn || map[gn]) continue;
              map[gn] = {
                game_number: gn,
                game_name: row.game_name,
                updated: parseUpdatedAt(row.updated_at)
              };
            }
            done(map);
            return;
          }
          if (isTableMissing(status, data, text)) writeMode('local');
          done(readLocalScoredGamesMap());
        });
      } else {
        done(readLocalScoredGamesMap());
      }
    });
  }

  function getRotationLimit() {
    return tvSettings.count || ROTATION_LIMIT;
  }

  function finalizeRotation(rotation) {
    var limit = getRotationLimit();
    var gom = findGameByNumber(gameOfMonth.number);
    var result = [];
    var used = {};
    var i;
    var g;

    if (gom) {
      result.push(gom);
      used[gom.number] = true;
    }

    for (i = 0; i < rotation.length && result.length < limit; i++) {
      g = rotation[i];
      if (!g || used[g.number]) continue;
      result.push(g);
      used[g.number] = true;
    }

    return result;
  }

  function applyTvSettingsRow(row) {
    var nums = [];
    var g;
    var i;
    if (!row) {
      tvSettings.gameNumbers = null;
      return;
    }
    if (row.tv_rotation_count) {
      tvSettings.count = Math.max(1, Math.min(20, parseInt(row.tv_rotation_count, 10) || 8));
    }
    if (row.tv_rotation_games && row.tv_rotation_games.length) {
      for (i = 0; i < row.tv_rotation_games.length; i++) {
        nums.push(parseInt(row.tv_rotation_games[i], 10));
      }
      tvSettings.gameNumbers = nums;
    } else {
      tvSettings.gameNumbers = null;
    }
    if (row.tv_gom_number) {
      gameOfMonth.number = parseInt(row.tv_gom_number, 10) || gameOfMonth.number;
    }
    if (row.tv_gom_prize) {
      gameOfMonth.prizeLine = row.tv_gom_prize;
    }
    if (row.tv_gom_subtitle) {
      gameOfMonth.subtitle = row.tv_gom_subtitle;
    }
    if (row.tv_instructions_rotate_sec != null) {
      INSTRUCTIONS_ROTATE_MS = Math.max(5, Math.min(120, parseInt(row.tv_instructions_rotate_sec, 10) || 20)) * 1000;
    }
    g = findGameByNumber(gameOfMonth.number);
    if (g) gameOfMonth.name = g.name;
  }

  function loadTvSettings(done) {
    if (!machine || !machine.id) {
      if (done) done();
      return;
    }
    if (useEventServerScores()) {
      var settingsUrl = '/api/settings?machine_id=' + encodeURIComponent(machine.id);
      xhr('GET', settingsUrl, null, function (ok, status, data) {
        var row = ok && data && data.success ? data.data : null;
        applyTvSettingsRow(row);
        if (done) done();
      });
      return;
    }
    var url = SUPABASE_URL + '/rest/v1/arcade_machines?select=tv_rotation_count,tv_rotation_games,tv_gom_number,tv_gom_prize,tv_gom_subtitle'
      + '&id=eq.' + encodeURIComponent(machine.id);
    xhr('GET', url, null, function (ok, status, data, text) {
      var row = ok && data && data[0] ? data[0] : null;
      applyTvSettingsRow(row);
      if (done) done();
    });
  }

  function buildRotationGamesFromPick(numbers, done) {
    var rotation = [];
    var limit = getRotationLimit();
    var i;
    var g;
    for (i = 0; i < numbers.length && rotation.length < limit; i++) {
      g = findGameByNumber(parseInt(numbers[i], 10));
      if (g) rotation.push(g);
    }
    done(rotation);
  }

  function buildRotationGames(scoredMap, done) {
    var rotation = [];
    var used = {};
    var classics = [];
    var classicSet = {};
    var tier1 = [];
    var tier2 = [];
    var tier3 = [];
    var gn;
    var num;
    var g;
    var i;
    var j;
    var item;

    if (window.ArcadeActivity) {
      classics = ArcadeActivity.getClassicPopularGames(games, 999);
    }
    for (i = 0; i < classics.length; i++) {
      classicSet[classics[i].number] = true;
    }

    /* 1 — classics with real scores (most recent first) */
    for (i = 0; i < classics.length; i++) {
      g = classics[i];
      if (scoredMap[g.number]) {
        tier1.push({ game: g, updated: scoredMap[g.number].updated || 0 });
      }
    }
    tier1.sort(function (a, b) {
      return b.updated - a.updated;
    });

    /* 2 — non-classics with real scores (most recent first) */
    for (gn in scoredMap) {
      if (!scoredMap.hasOwnProperty(gn)) continue;
      num = parseInt(gn, 10);
      if (!num || classicSet[num]) continue;
      g = findGameByNumber(num);
      if (!g) {
        g = { number: scoredMap[gn].game_number, name: scoredMap[gn].game_name || ('Game ' + gn) };
      }
      tier2.push({ game: g, updated: scoredMap[gn].updated || 0 });
    }
    tier2.sort(function (a, b) {
      return b.updated - a.updated;
    });

    /* 3 — classics without scores yet (curated order) */
    for (i = 0; i < classics.length; i++) {
      g = classics[i];
      if (!scoredMap[g.number]) {
        tier3.push(g);
      }
    }

    function addTier(entries, withUpdated) {
      for (j = 0; j < entries.length && rotation.length < getRotationLimit(); j++) {
        item = withUpdated ? entries[j].game : entries[j];
        if (used[item.number]) continue;
        rotation.push(item);
        used[item.number] = true;
      }
    }

    addTier(tier1, true);
    addTier(tier2, true);
    addTier(tier3, false);

    done(rotation);
  }

  function findGameByNumber(num) {
    var i;
    for (i = 0; i < games.length; i++) {
      if (games[i].number === num) return games[i];
    }
    return null;
  }

  function loadGames(done) {
    xhr('GET', GAMES_URL, null, function (ok, status, data) {
      if (!ok || !data) {
        done(false);
        return;
      }
      machine = data.machine || { id: 'legends-cabinet-1', name: 'Legends Brews & Cues', location: 'Arcade Cabinet' };
      games = data.games || [];
      done(true);
    });
  }

  function maxRestRowsSingleColumn() {
    var vh = window.innerHeight || document.documentElement.clientHeight || 720;
    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var portrait = vh > vw;
    var signage = isSignage32Display();
    var reserved = portrait ? vh * 0.32 : vh * 0.34;
    var restArea = Math.max(vh - reserved, vh * 0.3);
    var rowH = Math.max(28, vh * (signage ? 0.036 : portrait ? 0.042 : 0.045));
    var max = Math.floor(restArea / rowH);
    if (portrait) {
      if (max < 3) max = 3;
      if (max > (signage ? 11 : 10)) max = signage ? 11 : 10;
    } else {
      if (max < 2) max = 2;
      if (max > 8) max = 8;
    }
    return max;
  }

  function isPortraitDisplay() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    return h > w;
  }

  /** 32" portrait TV — typically 1080×1920 signage */
  function isSignage32Display() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    return h > w && h >= 1280 && w >= 700;
  }

  function isCompactDisplay() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    var minDim = Math.min(w, h);
    if (minDim < 640) return true;
    if (h > w && w < 720) return true;
    if (w >= h && h < 700) return true;
    return false;
  }

  function applyDisplayMetrics() {
    var root = document.documentElement;
    var w = window.innerWidth || root.clientWidth || 1920;
    var h = window.innerHeight || root.clientHeight || 1080;
    var portrait = h > w;
    var minDim = Math.min(w, h);
    var qrPx = Math.round(Math.min(Math.max(minDim * 0.175, 84), 280));
    var footerGutterPx = Math.round(qrPx * 1.05);
    var padBottomPx;
    if (portrait) {
      padBottomPx = Math.round(Math.min(Math.max(minDim * 0.13, 68), 176));
    } else {
      padBottomPx = Math.round(Math.min(Math.max(h * 0.11, 52), 120));
    }
    var scale = Math.min(minDim / 720, Math.max(w, h) / 1280);
    scale = Math.max(0.55, Math.min(scale, 1.2));
    root.style.setProperty('--tv-qr-width', qrPx + 'px');
    root.style.setProperty('--tv-footer-gutter', footerGutterPx + 'px');
    root.style.setProperty('--tv-pad-bottom', padBottomPx + 'px');
    root.style.setProperty('--tv-ui-scale', scale.toFixed(3));
    return { portrait: portrait, compact: isCompactDisplay() };
  }

  function applyDisplayProfile() {
    var root = document.documentElement;
    var metrics;
    if (!root) return;
    metrics = applyDisplayMetrics();
    root.classList.toggle('tv-portrait', metrics.portrait);
    root.classList.toggle('tv-landscape', !metrics.portrait);
    root.classList.toggle('tv-compact', metrics.compact);
    root.classList.toggle('tv-signage-32', isSignage32Display());
    scheduleFitBrandTitle();
    scheduleFitInstructionsSlide();
  }

  function fitBrandTitle() {
    var title = document.querySelector('.tv-brand-title');
    var titleRow = document.querySelector('.tv-header-title-row');
    var available;
    var lo;
    var hi;
    var mid;

    if (!title || !titleRow) return;

    lo = 12;
    hi = isSignage32Display() ? 110 : (isCompactDisplay() ? 72 : 90);
    title.style.fontSize = lo + 'px';
    available = titleRow.clientWidth - 14;

    while (lo < hi) {
      mid = Math.ceil((lo + hi) / 2);
      title.style.fontSize = mid + 'px';
      void title.offsetWidth;
      if (title.scrollWidth <= available) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    title.style.fontSize = lo + 'px';
  }

  function scheduleFitBrandTitle() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitBrandTitle);
      return;
    }
    fitBrandTitle();
  }

  var instructionsFitTimer = null;

  function resetInstructionsFit() {
    var steps = document.querySelector('.tv-instructions-steps');
    if (steps) steps.style.zoom = '';
  }

  function fitInstructionsSlide() {
    var stage = $('tv-slide');
    var steps;
    var lo;
    var hi;
    var mid;
    if (!stage || !stage.classList.contains('tv-slide--instructions')) {
      resetInstructionsFit();
      return;
    }
    steps = stage.querySelector('.tv-instructions-steps');
    if (!steps) return;

    steps.style.zoom = '1';
    void steps.offsetHeight;

    if (steps.scrollHeight <= steps.clientHeight + 2) return;

    // Keep text large on portrait; only shrink a little if needed to fit all 8 cells.
    lo = isPortraitDisplay() ? 0.9 : 0.6;
    hi = 1;
    while (hi - lo > 0.01) {
      mid = (lo + hi) / 2;
      steps.style.zoom = String(mid);
      void steps.offsetHeight;
      if (steps.scrollHeight > steps.clientHeight + 2) hi = mid;
      else lo = mid;
    }
    steps.style.zoom = String(lo);
  }

  function scheduleFitInstructionsSlide() {
    if (instructionsFitTimer) clearTimeout(instructionsFitTimer);
    instructionsFitTimer = setTimeout(function () {
      instructionsFitTimer = null;
      var run = function () {
        fitInstructionsSlide();
      };
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(run);
        return;
      }
      run();
    }, 60);
  }

  function shouldSplitRestScores(restCount) {
    if (isSignage32Display()) return false;
    return restCount > maxRestRowsSingleColumn();
  }

  function photoSrc(url) {
    var u = trim(url);
    if (!u) return '';
    if (u.indexOf('data:image/') === 0) return u;
    if (u.indexOf('https://') === 0 || u.indexOf('http://') === 0) return u;
    return '';
  }

  function renderPlayerPhotoHtml(entry, sizeClass) {
    var src = photoSrc(entry && entry.photo_url);
    var safe;
    if (!src) return '';
    safe = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return '<img class="tv-player-photo tv-player-photo--' + sizeClass + '" src="' + safe + '" alt="">';
  }

  function formatScoreDate(val) {
    if (!val) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }
  }

  function renderScoreRowHtml(entry, rank, isFirst) {
    var html = '';
    var rowTag = isFirst ? 'div' : 'li';
    var rowClass = isFirst ? 'tv-score-first is-gold' : 'tv-score-row';
    var photoSize = isFirst ? 'first' : 'rest';
    var dateLabel = formatScoreDate(entry.updated_at);
    html += '<' + rowTag + ' class="' + rowClass + '">';
    html += '<span class="tv-rank">' + rank + '</span>';
    html += '<div class="tv-player-cell">';
    html += renderPlayerPhotoHtml(entry, photoSize);
    html += '<div class="tv-player-meta">';
    html += '<span class="tv-player">' + escapeHtml(entry.initials || '???') + '</span>';
    if (dateLabel) {
      html += '<span class="tv-score-date">' + escapeHtml(dateLabel) + '</span>';
    }
    html += '</div>';
    html += '</div>';
    html += '<span class="tv-points">' + formatScore(entry.score) + '</span>';
    html += '</' + rowTag + '>';
    return html;
  }

  function isGameOfMonth(game) {
    return game && game.number === gameOfMonth.number;
  }

  function renderGameBannerHtml(game, isGom) {
    var html = '';
    html += '<div class="tv-game-banner' + (isGom ? ' tv-game-banner--gom' : '') + '">';
    html += renderGameNumberHtml(game.number, 'banner');
    if (isGom) {
      html += '<div class="tv-game-banner-title-wrap">';
      html += '<p class="tv-gom-banner-eyebrow">Game of the Month</p>';
      html += '<h2 class="tv-game-name">' + escapeHtml(game.name) + '</h2>';
      html += '<p class="tv-gom-banner-prize">' + escapeHtml(gameOfMonth.prizeLine || 'Win Prizes!') + '</p>';
      html += '</div>';
    } else {
      html += '<h2 class="tv-game-name">' + escapeHtml(game.name) + '</h2>';
    }
    html += '</div>';
    return html;
  }

  function renderScoresHtml(game, scores) {
    var html = '';
    var i;
    html += renderGameBannerHtml(game, isGameOfMonth(game));
    if (!scores || !scores.length) {
      html += '<div class="tv-no-scores">';
      if (cloudOffline) {
        html += '<p class="tv-empty tv-no-scores-msg">High scores temporarily unavailable — check back soon!</p>';
      } else {
        html += '<p class="tv-empty tv-no-scores-msg">No scores yet — be the first!</p>';
      }
      html += '<div class="tv-no-scores-promo-wrap">';
      html += '<img class="tv-no-scores-promo" src="scan-promo.png" alt="Legends Arcade — scan for games, see high scores, submit your score">';
      html += '</div>';
      html += '</div>';
      return html;
    }
    html += '<div class="tv-scores-board">';
    html += renderScoreRowHtml(scores[0], 1, true);

    if (scores.length > 1) {
      var rest = [];
      var splitAt;
      var leftCol;
      var rightCol;
      var r;
      var j;

      for (i = 1; i < scores.length && i < TOP_LIMIT; i++) {
        rest.push(scores[i]);
      }

      if (shouldSplitRestScores(rest.length)) {
        splitAt = Math.ceil(rest.length / 2);
        leftCol = rest.slice(0, splitAt);
        rightCol = rest.slice(splitAt);

        html += '<div class="tv-scores-grid tv-scores-grid--split">';
        html += '<ol class="tv-scores-col">';
        for (j = 0; j < leftCol.length; j++) {
          r = j + 2;
          html += renderScoreRowHtml(leftCol[j], r, false);
        }
        html += '</ol>';
        html += '<ol class="tv-scores-col">';
        for (j = 0; j < rightCol.length; j++) {
          r = splitAt + j + 2;
          html += renderScoreRowHtml(rightCol[j], r, false);
        }
        html += '</ol>';
        html += '</div>';
      } else {
        html += '<div class="tv-scores-rest">';
        html += '<ol class="tv-scores-col tv-scores-col--single">';
        for (j = 0; j < rest.length; j++) {
          html += renderScoreRowHtml(rest[j], j + 2, false);
        }
        html += '</ol>';
        html += '</div>';
      }
    }

    html += '</div>';
    return html;
  }

  function getChampionForGame(gameNumber, gameName) {
    var key = gameNumber + '|' + gameName;
    var scores = scoreCache[key];
    var k;
    if (!scores || !scores.length) {
      for (k in scoreCache) {
        if (!scoreCache.hasOwnProperty(k)) continue;
        if (k.indexOf(String(gameNumber) + '|') === 0) {
          scores = scoreCache[k];
          break;
        }
      }
    }
    if (!scores || !scores.length) return null;
    var initials = String(scores[0].initials || '').trim();
    if (!initials || initials === '???') return null;
    return {
      initials: initials,
      score: parseInt(scores[0].score, 10) || 0
    };
  }

  function renderClassicsHtml() {
    var html = '';
    var i;
    var g;
    var champ;
    html += '<h2 class="tv-slide-title">Arcade Classics</h2>';
    html += '<div class="tv-classics-grid">';
    for (i = 0; i < classicsList.length && i < CLASSICS_SHOW; i++) {
      g = classicsList[i];
      champ = getChampionForGame(g.number, g.name);
      html += '<div class="tv-classic-card">';
      html += renderGameNumberHtml(g.number, 'classic');
      html += '<div class="tv-classic-info">';
      html += '<span class="tv-classic-name">' + escapeHtml(g.name) + '</span>';
      if (champ) {
        html += '<span class="tv-classic-champ">' + escapeHtml(champ.initials) + ' · ' +
          escapeHtml(formatScore(champ.score)) + '</span>';
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderPromoScoresHtml(scores) {
    var html = '';
    var i;
    if (!scores || !scores.length) {
      html += '<div class="tv-promo-scores-empty">';
      if (cloudOffline) {
        html += '<p class="tv-empty tv-no-scores-msg">High scores temporarily unavailable — check back soon!</p>';
      } else {
        html += '<p class="tv-empty tv-no-scores-msg">No scores yet — be the first!</p>';
      }
      html += '</div>';
      return html;
    }
    html += '<div class="tv-promo-scores-board">';
    html += renderScoreRowHtml(scores[0], 1, true);
    if (scores.length > 1) {
      html += '<ol class="tv-scores-col tv-promo-scores-col">';
      for (i = 1; i < scores.length && i < GOM_SCORES_LIMIT; i++) {
        html += renderScoreRowHtml(scores[i], i + 1, false);
      }
      html += '</ol>';
    }
    html += '</div>';
    return html;
  }

  function renderPromoHtml() {
    var g = findGameByNumber(gameOfMonth.number) || { number: gameOfMonth.number, name: gameOfMonth.name };
    var cacheKey = g.number + '|' + g.name;
    var scores = scoreCache[cacheKey] || [];
    var emptyScores = !scores || !scores.length;
    var html = '<div class="tv-promo-slide tv-promo-slide--stacked' + (emptyScores ? ' tv-promo-slide--empty-scores' : '') + '">';
    html += '<div class="tv-promo-main">';
    html += '<div class="tv-promo-eyebrow-wrap">';
    html += '<p class="tv-promo-eyebrow">Game of the Month</p>';
    html += '</div>';
    html += '<div class="tv-promo-title-row">';
    html += renderGameNumberHtml(g.number, 'promo');
    html += '<h2 class="tv-promo-game-name">' + escapeHtml(g.name) + '</h2>';
    html += '</div>';
    html += '<p class="tv-promo-prize">' + escapeHtml(gameOfMonth.prizeLine) + '</p>';
    if (gameOfMonth.subtitle) {
      html += '<p class="tv-promo-sub">' + escapeHtml(gameOfMonth.subtitle) + '</p>';
    }
    html += '</div>';
    html += '<div class="tv-promo-scores">';
    html += renderPromoScoresHtml(scores);
    html += '</div>';
    html += '</div>';
    return html;
  }

  function makePromoSlide(game) {
    var g = game || findGameByNumber(gameOfMonth.number)
      || { number: gameOfMonth.number, name: gameOfMonth.name };
    var scores = scoreCache[g.number + '|' + g.name] || [];
    return {
      type: 'promo',
      game: g,
      hasScores: scores.length > 0,
      html: renderPromoHtml()
    };
  }

  function countSlidesByType(list, slideType) {
    var n = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].type === slideType) n++;
    }
    return n;
  }

  function insertMiddlePromoSlide(content) {
    var gom;
    var mid;
    if (!content.length) return content;
    gom = findGameByNumber(gameOfMonth.number);
    if (!gom || countSlidesByType(content, 'promo') !== 1) return content;
    mid = Math.max(1, Math.floor(content.length / 2));
    content.splice(mid, 0, makePromoSlide(gom));
    return content;
  }

  function renderChampionsHtml() {
    var html = '';
    var i;
    var row;
    var champDate;
    var priorInitials;
    html += '<h2 class="tv-slide-title">Champions</h2>';
    if (!championsData.length) {
      html += '<p class="tv-empty">No champions yet — play a game!</p>';
      return html;
    }
    html += '<ul class="tv-champs-list">';
    for (i = 0; i < championsData.length; i++) {
      row = championsData[i];
      champDate = formatScoreDate(row.updated_at);
      priorInitials = String(row.priorInitials || '').trim();
      html += '<li class="tv-champ-row">';
      html += '<span class="tv-champ-game">' + escapeHtml(row.gameName) + '</span>';
      html += '<div class="tv-champ-player-block">';
      html += '<span class="tv-champ-player">' + escapeHtml(row.initials) + ' · ' +
        escapeHtml(formatScore(row.score)) + '</span>';
      if (priorInitials && priorInitials !== '???' &&
          priorInitials.toUpperCase() !== String(row.initials || '').trim().toUpperCase()) {
        html += '<span class="tv-champ-prior">Prev ' + escapeHtml(priorInitials);
        if (row.priorScore != null && !isNaN(row.priorScore) && Number(row.priorScore) > 0) {
          html += ' · ' + escapeHtml(formatScore(row.priorScore));
        }
        html += '</span>';
      }
      if (champDate) {
        html += '<span class="tv-champ-date">' + escapeHtml(champDate) + '</span>';
      }
      html += '</div>';
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function renderInstructionStep(num, title, bodyHtml) {
    return '<li class="tv-instruction-step">'
      + '<span class="tv-instruction-num">' + num + '</span>'
      + '<div class="tv-instruction-body">'
      + '<strong class="tv-instruction-title">' + escapeHtml(title) + '</strong>'
      + '<span class="tv-instruction-text">' + bodyHtml + '</span>'
      + '</div></li>';
  }

  function renderInstructionQrSlot() {
    return '<li class="tv-instruction-qr-slot" aria-label="Scan for games">'
      + '<div class="tv-instr-qr">'
      + '<span class="tv-instr-qr-glow">'
      + '<img src="scan-for-games-qr.png" alt="Scan for games" width="320" height="400">'
      + '</span>'
      + '<p class="tv-instr-qr-label">Scan for games</p>'
      + '</div></li>';
  }

  function renderQrFillerSlideHtml() {
    return '<div class="tv-qr-slide">'
      + '<h2 class="tv-qr-slide-title">Scan for Games</h2>'
      + '<div class="tv-qr-slide-frame">'
      + '<span class="tv-qr-slide-glow tv-instr-qr-glow">'
      + '<img src="scan-for-games-qr.png" alt="Scan for games" width="320" height="400">'
      + '</span>'
      + '</div>'
      + '<p class="tv-qr-slide-label">Full arcade game list on your phone</p>'
      + '</div>';
  }

  function makeQrFillerSlide() {
    return {
      type: 'qr',
      html: renderQrFillerSlideHtml()
    };
  }

  // Auto-synced from instructions-preview.html — do not edit by hand
  var INSTRUCTIONS_SLIDE_HTML = "<div class=\"tv-instructions-slide\">\r\n          <h2 class=\"tv-slide-title tv-instructions-heading\">How to Play<br>\r\n            <strong class=\"tv-instruction-title tv-instructions-lead\"><span class=\"tv-instructions-lead-line\">FIND, SELECT, AND LOAD A GAME</span><span class=\"tv-instructions-lead-line\">BEFORE INSERTING QUARTERS.</span></strong></h2>\r\n          <ol class=\"tv-instructions-steps\">\r\n\r\n            <li class=\"tv-instruction-step tv-instruction-step--find\">\r\n              <span class=\"tv-instruction-num\">1</span>\r\n              <div class=\"tv-instruction-body\">\r\n                <strong class=\"tv-instruction-title\">Find your game</strong>\r\n                <span class=\"tv-instruction-text\">Find game numbers on the Leaderboards</span>\r\n                <span class=\"tv-instruction-text\">Scan the QR Code</span>\r\n                <span class=\"tv-instruction-text\">Or browse the cabinet menu</span>\r\n              </div>\r\n            </li>\r\n\r\n            <li class=\"tv-instruction-step\">\r\n              <span class=\"tv-instruction-num\">2</span>\r\n              <div class=\"tv-instruction-body\">\r\n                <strong class=\"tv-instruction-title\">Select your game</strong>\r\n                <span class=\"tv-instruction-text\">Move the <strong>joystick</strong> to highlight, <br> Press <span class=\"tv-instr-btn tv-instr-btn--1up\">1UP</span> to select.</span>\r\n                <span class=\"tv-instruction-note\">Do not insert quarters yet.</span>\r\n              </div>\r\n            </li>\r\n\r\n            <li class=\"tv-instruction-step\">\r\n              <span class=\"tv-instruction-num\">3</span>\r\n              <div class=\"tv-instruction-body\">\r\n                <strong class=\"tv-instruction-title\">Wait for the game to load</strong>\r\n                <span class=\"tv-instruction-text\">A loading screen appears for a few seconds.</span>\r\n                <span class=\"tv-instruction-note\">That is normal — not a glitch.</span>\r\n                <span class=\"tv-instruction-note\">Do not insert quarters until it finishes.</span>\r\n              </div>\r\n            </li>\r\n\r\n            <li class=\"tv-instruction-step\">\r\n              <span class=\"tv-instruction-num\">4</span>\r\n              <div class=\"tv-instruction-body\">\r\n                <strong class=\"tv-instruction-title\">Insert credits</strong>\r\n                <span class=\"tv-instruction-text\">After the game loads, add credits</span>\r\n                <span class=\"tv-instruction-note\">(some $.25, others $.50).</span>\r\n              </div>\r\n            </li>\r\n\r\n            <li class=\"tv-instruction-step\">\r\n              <span class=\"tv-instruction-num\">5</span>\r\n              <div class=\"tv-instruction-body\">\r\n                <strong class=\"tv-instruction-title\">Play</strong>\r\n                <span class=\"tv-instruction-text\">Press</span>\r\n                <span class=\"tv-instruction-text\"><span class=\"tv-instr-btn\">1UP OR 2UP</span></span>\r\n                <span class=\"tv-instruction-text\">to begin playing.</span>\r\n              </div>\r\n            </li>\r\n\r\n            <li class=\"tv-instruction-step tv-instruction-step--dense\">\r\n              <span class=\"tv-instruction-num\">6</span>\r\n              <div class=\"tv-instruction-body\">\r\n                <strong class=\"tv-instruction-title\">Back to the main menu</strong>\r\n                <span class=\"tv-instruction-text\"><strong>Hold <span class=\"tv-instr-btn\">1UP</span></strong> until the popup appears.</span>\r\n                <span class=\"tv-instruction-text\"><span class=\"tv-instr-btn tv-instr-btn--small\">Continue</span> keeps playing</span>\r\n                <span class=\"tv-instruction-text\"><span class=\"tv-instr-btn tv-instr-btn--small\">Exit</span> returns to the list.</span>\r\n              </div>\r\n            </li>\r\n\r\n            <li class=\"tv-instruction-step\">\r\n              <span class=\"tv-instruction-num\">7</span>\r\n              <div class=\"tv-instruction-body\">\r\n                <strong class=\"tv-instruction-title\">High score?</strong>\r\n                <span class=\"tv-instruction-text\">We'll show it here</span>\r\n                <span class=\"tv-instruction-text\">Use the tablet to enter your name.</span>\r\n                <span class=\"tv-instruction-note\">Beat a champ — win a prize!</span>\r\n              </div>\r\n            </li>\r\n\r\n            <li class=\"tv-instruction-qr-slot\" aria-label=\"Scan for games\">\r\n              <div class=\"tv-instr-qr\">\r\n                <p class=\"tv-instr-qr-label\">Scan for games</p>\r\n                <span class=\"tv-instr-qr-glow\">\r\n                  <img src=\"scan-for-games-qr.png\" alt=\"Scan for games\" width=\"320\" height=\"400\">\r\n                </span>\r\n                <p class=\"tv-instr-qr-label\">Scan for games</p>\r\n              </div>\r\n            </li>\r\n\r\n          </ol>\r\n        </div>";

  function renderInstructionsHtml() {
    return INSTRUCTIONS_SLIDE_HTML;
  }

  /** Insert the instructions slide after every N content slides (4th slot in rotation). */
  var INSTRUCTIONS_EVERY_N = 3;

  /** Pad content so instructions land every 4th slide when the deck loops. */
  function padContentSlidesForInstructions(contentSlides, everyN) {
    var padded;
    if (!contentSlides.length) return contentSlides;
    padded = contentSlides.slice();
    while (padded.length % everyN !== 0) {
      padded.push(makeQrFillerSlide());
    }
    return padded;
  }

  function interleaveInstructionsSlide(contentSlides, instructionsSlide) {
    var list = [];
    var i;
    var sinceInstructions = 0;
    if (!contentSlides.length) {
      return instructionsSlide ? [instructionsSlide] : [];
    }
    for (i = 0; i < contentSlides.length; i++) {
      list.push(contentSlides[i]);
      sinceInstructions++;
      if (sinceInstructions === INSTRUCTIONS_EVERY_N && instructionsSlide) {
        list.push(instructionsSlide);
        sinceInstructions = 0;
      }
    }
    return list;
  }

  function buildSlides() {
    var content = [];
    var i;
    var g;
    var scores;
    var instructionsSlide = { type: 'instructions', html: renderInstructionsHtml() };

    for (i = 0; i < rotationGames.length; i++) {
      g = rotationGames[i];
      scores = scoreCache[g.number + '|' + g.name] || [];
      if (isGameOfMonth(g)) {
        content.push(makePromoSlide(g));
      } else {
        content.push({
          type: 'scores',
          game: g,
          hasScores: scores.length > 0,
          html: renderScoresHtml(g, scores)
        });
      }
    }

    if (!rotationGames.length) {
      g = findGameByNumber(4) || findGameByNumber(1) || games[0];
      if (g) {
        scores = scoreCache[g.number + '|' + g.name] || [];
        if (isGameOfMonth(g)) {
          content.push(makePromoSlide(g));
        } else {
          content.push({
            type: 'scores',
            game: g,
            hasScores: scores.length > 0,
            html: renderScoresHtml(g, scores)
          });
        }
      }
    }

    content.push({ type: 'classics', html: renderClassicsHtml() });
    content.push({ type: 'champions', html: renderChampionsHtml() });
    if (prizeWinsData && prizeWinsData.length) {
      content.push({ type: 'prizewins', html: renderPrizeWinsHtml() });
    }

    insertMiddlePromoSlide(content);
    content = padContentSlidesForInstructions(content, INSTRUCTIONS_EVERY_N);
    return interleaveInstructionsSlide(content, instructionsSlide);
  }

  function updateHeaderTagline() {
    var el = $('tv-header-tagline');
    var prizeEl = $('tv-header-prizeline');
    if (!el) return;
    var slide = slides[slideIndex];
    var showScoresHeader = slide && (slide.type === 'scores' || slide.type === 'promo');
    if (prizeEl) prizeEl.hidden = false;
    if (showScoresHeader) {
      el.textContent = 'High Scores';
      el.hidden = false;
    } else {
      el.hidden = true;
    }
    scheduleFitBrandTitle();
  }

  function renderDots() {
    var dots = $('tv-dots');
    var hint = $('tv-footer-hint');
    var html = '';
    var i;
    if (!dots) return;
    for (i = 0; i < slides.length; i++) {
      html += '<span class="tv-dot' + (i === slideIndex ? ' is-active' : '') + '"></span>';
    }
    dots.innerHTML = html;
    if (hint) {
      var slide = slides[slideIndex];
      if (slide && slide.type === 'promo') {
        hint.textContent = 'Game of the Month — play #' + (gameOfMonth.number) + ' on the cabinet';
      } else if (slide && slide.type === 'scores' && slide.game && isGameOfMonth(slide.game)) {
        hint.textContent = 'Game of the Month — play #' + (gameOfMonth.number) + ' on the cabinet';
      } else if (slide && slide.type === 'instructions') {
        hint.textContent = 'Need help? This screen shows how to use the arcade cabinet';
      } else if (slide && slide.type === 'qr') {
        hint.textContent = 'Scan for games — see the full arcade list';
      } else {
        hint.textContent = 'Use the tablet to submit scores';
      }
    }
    updateHeaderTagline();
  }

  function pickTitleGradientStyle() {
    return TITLE_GRADIENT_STYLES[Math.floor(Math.random() * TITLE_GRADIENT_STYLES.length)];
  }

  function titlePosForStep(axis, stepIndex, stepCount) {
    var pct = stepIndex * (100 / stepCount);
    if (stepIndex >= stepCount) pct = 100;
    if (axis === 'x') return pct + '% 50%';
    if (axis === 'x-rev') return (100 - pct) + '% 50%';
    if (axis === 'y') return '50% ' + pct + '%';
    if (axis === 'y-rev') return '50% ' + (100 - pct) + '%';
    if (axis === 'diag') return pct + '% ' + pct + '%';
    if (axis === 'diag-rev') return (100 - pct) + '% ' + pct + '%';
    return pct + '% 50%';
  }

  function applyTitleGradientStyle(title, style) {
    title.style.backgroundImage = style.image;
    title.style.backgroundSize = style.size;
  }

  function beginTitleColorTransition(done) {
    var title = document.querySelector('.tv-brand-title');
    var stepCount = TITLE_COLOR_STEP_COUNT;
    var step;
    var style;
    var fromPos;
    var toPos;
    var fromGlow;
    var toGlow;
    var sec;
    var transition;
    var finished;
    var onTransitionEnd;
    var fallbackTimer;
    if (!title) return;

    step = titleColorStep % stepCount;
    if (step === 0) {
      currentTitleStyle = pickTitleGradientStyle();
    }
    style = currentTitleStyle;

    fromGlow = step;
    toGlow = (step + 1) % stepCount;
    fromPos = titlePosForStep(style.axis, step, stepCount);
    if (step === stepCount - 1) {
      toPos = titlePosForStep(style.axis, stepCount, stepCount);
    } else {
      toPos = titlePosForStep(style.axis, step + 1, stepCount);
    }

    sec = (TITLE_TRANSITION_MS / 1000) + 's';
    transition = 'background-position ' + sec + ' linear, filter ' + sec + ' linear';

    finished = false;
    onTransitionEnd = function (e) {
      if (e.target !== title || finished) return;
      if (e.propertyName !== 'background-position') return;
      finished = true;
      title.removeEventListener('transitionend', onTransitionEnd);
      clearTimeout(fallbackTimer);
      if (done) done();
    };

    title.style.transition = 'none';
    applyTitleGradientStyle(title, style);
    title.style.backgroundPosition = fromPos;
    title.style.filter = TITLE_GLOW_STOPS[fromGlow];

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        title.addEventListener('transitionend', onTransitionEnd);
        title.style.transition = transition;
        title.style.backgroundPosition = toPos;
        title.style.filter = TITLE_GLOW_STOPS[toGlow];
        fallbackTimer = setTimeout(function () {
          if (finished) return;
          finished = true;
          title.removeEventListener('transitionend', onTransitionEnd);
          if (done) done();
        }, TITLE_TRANSITION_MS + 150);
      });
    });

    titleColorStep += 1;
  }

  function runTitleColorCycleStep() {
    beginTitleColorTransition(function () {
      runTitleColorCycleStep();
    });
  }

  function startTitleColorCycle() {
    if (titleColorTimer) clearTimeout(titleColorTimer);
    titleColorTimer = null;
    titleColorStep = 0;
    currentTitleStyle = null;
    runTitleColorCycleStep();
  }

  function stopTitleColorCycle() {
    if (titleColorTimer) clearTimeout(titleColorTimer);
    titleColorTimer = null;
  }

  function isInstructionsSlide(slideType, html) {
    return slideType === 'instructions'
      || Boolean(html && html.indexOf('tv-instructions-slide') >= 0);
  }

  function suppressCornerQrEffects() {
    var left = document.querySelector('.tv-corner-qr--left');
    var right = document.querySelector('.tv-corner-qr--right');
    var orphans = document.querySelectorAll('.tv-corner-qr-placeholder');
    var i;

    if (qrGlowActiveEl) {
      finishQrGlowShift(qrGlowActiveEl);
    }
    for (i = 0; i < orphans.length; i++) {
      clearQrColorTimer(orphans[i]);
      if (orphans[i].parentNode) {
        orphans[i].parentNode.removeChild(orphans[i]);
      }
    }
    if (left) {
      clearQrGrowTimer(left);
      left.classList.remove('is-glow-shifting');
      clearQrMove(left);
      removeQrPlaceholder(left);
    }
    if (right) {
      clearQrGrowTimer(right);
      right.classList.remove('is-glow-shifting');
      clearQrMove(right);
      removeQrPlaceholder(right);
    }
  }

  function applyInstructionsChrome(slideType, html) {
    var instructionsOn = isInstructionsSlide(slideType, html);
    var qrSlideOn = slideType === 'qr';
    var app = $('tv-app');
    var left;
    var right;
    if (app) {
      app.classList.toggle('tv-app--instructions', instructionsOn);
      app.classList.toggle('tv-app--qr-slide', qrSlideOn);
    }
    document.documentElement.classList.toggle('tv-instructions-mode', instructionsOn);
    document.documentElement.classList.toggle('tv-qr-slide-mode', qrSlideOn);
    if (instructionsOn || qrSlideOn) {
      suppressCornerQrEffects();
      return;
    }
    left = document.querySelector('.tv-corner-qr--left');
    right = document.querySelector('.tv-corner-qr--right');
    if (left && !left._qrGrowTimer) scheduleNextQrGrow(left);
    if (right && !right._qrGrowTimer) scheduleNextQrGrow(right);
  }

  function onSlideActivated() {
    var app = $('tv-app');
    var stage = $('tv-slide');
    var slide = slides[slideIndex];
    if (app && stage) {
      app.classList.toggle('tv-app--empty-scores', stage.classList.contains('tv-slide--empty'));
      applyInstructionsChrome(slide && slide.type, stage.innerHTML);
    }
    renderDots();
    if (stage && stage.classList.contains('tv-slide--instructions')) {
      scheduleFitInstructionsSlide();
    } else {
      resetInstructionsFit();
    }
  }

  function slideClassName(html, state, slideType) {
    var cls = 'tv-slide';
    if (state) cls += ' ' + state;
    if (html && html.indexOf('tv-no-scores') >= 0) cls += ' tv-slide--empty';
    if (isInstructionsSlide(slideType, html)) {
      cls += ' tv-slide--instructions';
    }
    if (slideType === 'promo') {
      cls += ' tv-slide--promo';
    }
    if (slideType === 'qr') {
      cls += ' tv-slide--qr';
    }
    return cls;
  }

  function finishSlideActivation(stage, html, nextIndex) {
    var slide = slides[nextIndex];
    if (nextIndex !== slideIndex) resetSlideRotationClock();
    stage.innerHTML = html;
    stage.className = slideClassName(html, '', slide && slide.type);
    slideIndex = nextIndex;
    void stage.offsetHeight;
    stage.className = slideClassName(html, 'is-active', slide && slide.type);
    onSlideActivated();
    transitioning = false;
    rescheduleRotationForCurrentSlide();
  }

  function showSlide(index, animate) {
    var stage = $('tv-slide');
    var fallbackTimer;
    var onFadeOutEnd;
    var currentSlide;
    if (!stage || !slides.length) return;
    var nextIndex = index % slides.length;
    var slide = slides[nextIndex];
    var html = slide.html || '<p class="tv-empty">Loading...</p>';

    if (!animate) {
      if (nextIndex !== slideIndex) resetSlideRotationClock();
      stage.className = slideClassName(html, 'is-active', slide && slide.type);
      stage.innerHTML = html;
      slideIndex = nextIndex;
      onSlideActivated();
      rescheduleRotationForCurrentSlide();
      return;
    }

    if (transitioning) return;
    transitioning = true;
    currentSlide = slides[slideIndex];
    stage.className = slideClassName(
      (currentSlide && currentSlide.html) || stage.innerHTML,
      'is-exiting',
      currentSlide && currentSlide.type
    );

    onFadeOutEnd = function (e) {
      if (e.target !== stage || e.propertyName !== 'opacity') return;
      stage.removeEventListener('transitionend', onFadeOutEnd);
      clearTimeout(fallbackTimer);
      if (!transitioning) return;
      finishSlideActivation(stage, html, nextIndex);
    };

    stage.addEventListener('transitionend', onFadeOutEnd);
    fallbackTimer = setTimeout(function () {
      stage.removeEventListener('transitionend', onFadeOutEnd);
      if (!transitioning) return;
      finishSlideActivation(stage, html, nextIndex);
    }, SLIDE_FADE_MS + 100);
  }

  function clearRotateTimer() {
    if (rotateTimer) {
      clearTimeout(rotateTimer);
      rotateTimer = null;
    }
  }

  function captureRotateRemaining() {
    if (rotateDeadline != null) {
      rotateRemainingMs = Math.max(0, rotateDeadline - Date.now());
    }
    rotateDeadline = null;
  }

  function resetSlideRotationClock() {
    rotateRemainingMs = null;
    rotateDeadline = null;
  }

  function advanceSlide() {
    if (!slides.length) return;
    showSlide(slideIndex + 1, true);
  }

  function slideIsEmptyScores(slide) {
    var scores;
    var k;
    if (!slide || slide.type !== 'scores') return false;
    if (slide.html && slide.html.indexOf('tv-no-scores') >= 0) return true;
    if (slide.hasScores === false) return true;
    if (!slide.game) return false;
    scores = scoreCache[slide.game.number + '|' + slide.game.name] || [];
    if (!scores.length && slide.game.number) {
      for (k in scoreCache) {
        if (!scoreCache.hasOwnProperty(k)) continue;
        if (k.indexOf(String(slide.game.number) + '|') === 0) {
          scores = scoreCache[k];
          break;
        }
      }
    }
    return !scores || !scores.length;
  }

  function getSlideRotateMs(index) {
    var slide = slides[index % slides.length];
    if (slide && slide.type === 'instructions') return INSTRUCTIONS_ROTATE_MS;
    if (slide && slide.type === 'qr') return ROTATE_MS_EMPTY;
    if (slide && slide.type === 'promo' && slide.hasScores === false) return ROTATE_MS_EMPTY;
    if (slide && slide.type === 'scores' && slideIsEmptyScores(slide)) return ROTATE_MS_EMPTY;
    return ROTATE_MS;
  }

  function rescheduleRotationForCurrentSlide() {
    if (rotationPausedForCelebration || rotationPausedByUser || celebrationActive || celebrationStartTimer) return;
    if (!slides.length) return;
    clearRotateTimer();
    var ms = rotateRemainingMs != null ? rotateRemainingMs : getSlideRotateMs(slideIndex);
    rotateRemainingMs = null;
    rotateDeadline = Date.now() + ms;
    rotateTimer = setTimeout(function () {
      rotateDeadline = null;
      advanceSlide();
    }, ms);
  }

  function startRotation() {
    rescheduleRotationForCurrentSlide();
  }

  function buildChampionsFromScoreCache() {
    var rows = [];
    var key;
    var parts;
    var scores;
    for (key in scoreCache) {
      if (!scoreCache.hasOwnProperty(key)) continue;
      scores = scoreCache[key];
      if (!scores || !scores.length) continue;
      parts = key.split('|');
      rows.push({
        gameNumber: parts.length ? parseInt(parts[0], 10) || null : null,
        gameName: parts.length > 1 ? parts.slice(1).join('|') : 'Game',
        initials: scores[0].initials || '???',
        score: parseInt(scores[0].score, 10) || 0,
        updated_at: scores[0].updated_at || null,
        priorInitials: scores.length > 1 ? (scores[1].initials || null) : null,
        priorScore: scores.length > 1 ? (parseInt(scores[1].score, 10) || null) : null
      });
    }
    rows.sort(function (a, b) {
      return b.score - a.score;
    });
    if (rows.length > CHAMPS_LIMIT) {
      rows = rows.slice(0, CHAMPS_LIMIT);
    }
    return rows;
  }

  function enrichChampionsPriorFromCache() {
    var i;
    var row;
    var scores;
    var k;
    var cacheKey;
    for (i = 0; i < championsData.length; i++) {
      row = championsData[i];
      if (row.priorInitials) continue;
      scores = null;
      if (row.gameNumber) {
        cacheKey = row.gameNumber + '|' + row.gameName;
        scores = scoreCache[cacheKey];
        if (!scores || scores.length < 2) {
          for (k in scoreCache) {
            if (!scoreCache.hasOwnProperty(k)) continue;
            if (k.indexOf(String(row.gameNumber) + '|') === 0) {
              scores = scoreCache[k];
              break;
            }
          }
        }
      }
      if (scores && scores.length > 1) {
        row.priorInitials = scores[1].initials || null;
        row.priorScore = parseInt(scores[1].score, 10) || null;
      }
    }
  }

  function loadChampions(done) {
    if (useEventServerScores() && machine && machine.id) {
      var champsUrl = '/api/scores/champions?machine_id=' + encodeURIComponent(machine.id)
        + '&limit=' + encodeURIComponent(String(CHAMPS_LIMIT));
      xhr('GET', champsUrl, null, function (ok, status, data) {
        var rows = [];
        var i;
        if (ok && data && data.success && data.data) {
          for (i = 0; i < data.data.length; i++) {
            rows.push({
              gameNumber: data.data[i].game_number || null,
              gameName: data.data[i].game_name || ('Game ' + data.data[i].game_number),
              initials: data.data[i].initials || '???',
              score: parseInt(data.data[i].score, 10) || 0,
              updated_at: data.data[i].updated_at || null,
              priorInitials: data.data[i].prior_initials || null,
              priorScore: data.data[i].prior_score != null ? parseInt(data.data[i].prior_score, 10) : null
            });
          }
        }
        championsData = rows.length ? rows : buildChampionsFromScoreCache();
        enrichChampionsPriorFromCache();
        if (done) done();
      });
      return;
    }
    resolveStorageMode(function (mode) {
      if (mode === 'supabase' && machine && machine.id) {
        var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=game_number,game_name,initials,score,updated_at'
          + '&machine_id=eq.' + encodeURIComponent(machine.id)
          + '&order=score.desc&limit=250';
        xhr('GET', url, null, function (ok, status, data, text) {
          var byGame = {};
          var rows = [];
          var i;
          var gn;
          var top;
          var prior;
          if (ok && data && data.length) {
            for (i = 0; i < data.length; i++) {
              gn = data[i].game_number;
              if (!gn) continue;
              if (!byGame[gn]) byGame[gn] = [];
              if (byGame[gn].length >= 2) continue;
              byGame[gn].push(data[i]);
            }
            for (gn in byGame) {
              if (!byGame.hasOwnProperty(gn)) continue;
              top = byGame[gn];
              if (!top || !top.length) continue;
              prior = top.length > 1 ? top[1] : null;
              rows.push({
                gameNumber: parseInt(gn, 10) || null,
                gameName: top[0].game_name || ('Game ' + gn),
                initials: top[0].initials || '???',
                score: parseInt(top[0].score, 10) || 0,
                updated_at: top[0].updated_at || null,
                priorInitials: prior ? (prior.initials || null) : null,
                priorScore: prior ? (parseInt(prior.score, 10) || null) : null
              });
            }
            rows.sort(function (a, b) {
              return b.score - a.score;
            });
            if (rows.length > CHAMPS_LIMIT) {
              rows = rows.slice(0, CHAMPS_LIMIT);
            }
            championsData = rows;
          } else {
            championsData = buildChampionsFromScoreCache();
          }
          enrichChampionsPriorFromCache();
          if (done) done();
        });
        return;
      }
      championsData = buildChampionsFromScoreCache();
      enrichChampionsPriorFromCache();
      if (done) done();
    });
  }

  function loadPrizeWins(done) {
    // Prize wins are tracked live by the local event server only.
    if (!useEventServerScores() || !machine || !machine.id) {
      prizeWinsData = [];
      if (done) done();
      return;
    }
    var url = '/api/prizes/recent?machine_id=' + encodeURIComponent(machine.id)
      + '&limit=' + encodeURIComponent(String(PRIZE_WINS_LIMIT));
    xhr('GET', url, null, function (ok, status, data) {
      var rows = [];
      var i;
      if (ok && data && data.success && data.data) {
        for (i = 0; i < data.data.length; i++) {
          rows.push({
            initials: data.data[i].initials || '???',
            gameName: data.data[i].game_name || ('Game ' + data.data[i].game_number),
            score: parseInt(data.data[i].score, 10) || 0,
            beatenScore: data.data[i].beaten_score != null ? parseInt(data.data[i].beaten_score, 10) : null,
            beatenChampInitials: data.data[i].beaten_champ_initials || '',
            prizeText: data.data[i].prize_text || 'Prize',
            wonAt: data.data[i].won_at || null
          });
        }
      }
      prizeWinsData = rows;
      prizeWinsTotal = (ok && data && typeof data.total === 'number') ? data.total : rows.length;
      if (done) done();
    });
  }

  function renderPrizeWinBeatenHtml(row) {
    var champ = String(row.beatenChampInitials || '').trim();
    var beaten = row.beatenScore;
    var hasScore = beaten != null && !isNaN(beaten) && Number(beaten) > 0;
    if (!champ && !hasScore) return '';
    var html = '<span class="tv-prizewin-beaten">';
    if (champ && hasScore) {
      html += 'Beat ' + escapeHtml(champ) + ' · ' + escapeHtml(formatScore(beaten));
    } else if (champ) {
      html += 'Beat ' + escapeHtml(champ);
    } else {
      html += 'Previous high · ' + escapeHtml(formatScore(beaten));
    }
    html += '</span>';
    return html;
  }

  function renderPrizeWinsHtml() {
    var html = '';
    var i;
    var row;
    var when;
    var beatenHtml;
    var total = prizeWinsTotal || prizeWinsData.length;
    html += '<h2 class="tv-slide-title tv-prizewins-title">🏆 Prize Winners</h2>';
    html += '<p class="tv-prizewins-tally">' + total +
      (total === 1 ? ' champ beaten — free reward won!' : ' champs beaten — free rewards won!') + '</p>';
    html += '<ul class="tv-prizewins-list">';
    for (i = 0; i < prizeWinsData.length; i++) {
      row = prizeWinsData[i];
      when = formatScoreDate(row.wonAt);
      beatenHtml = renderPrizeWinBeatenHtml(row);
      html += '<li class="tv-prizewin-row">';
      html += '<div class="tv-prizewin-meta">';
      html += '<span class="tv-prizewin-game">' + escapeHtml(row.gameName) +
        (when ? ' · ' + escapeHtml(when) : '') + '</span>';
      if (beatenHtml) html += beatenHtml;
      html += '</div>';
      html += '<span class="tv-prizewin-player">' + escapeHtml(row.initials) +
        ' · ' + escapeHtml(formatScore(row.score)) + '</span>';
      html += '<span class="tv-prizewin-prize">' + escapeHtml(row.prizeText) + '</span>';
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function prefetchScoreSlides(done) {
    var list = rotationGames.length ? rotationGames.slice() : [];
    var fallback = findGameByNumber(4) || findGameByNumber(1) || games[0];
    var gomGame = findGameByNumber(gameOfMonth.number);
    var seen = {};
    var unique = [];
    var pending;
    var i;

    if (!list.length && fallback) list = [fallback];
    if (gomGame) list.push(gomGame);

    for (i = 0; i < classicsList.length && i < CLASSICS_SHOW; i++) {
      if (!classicsList[i] || seen[classicsList[i].number]) continue;
      seen[classicsList[i].number] = true;
      unique.push(classicsList[i]);
    }

    for (i = 0; i < list.length; i++) {
      if (!list[i] || seen[list[i].number]) continue;
      seen[list[i].number] = true;
      unique.push(list[i]);
    }

    pending = unique.length;
    if (!pending) {
      if (done) done();
      return;
    }

    for (i = 0; i < unique.length; i++) {
      (function (game) {
        getScores(game.number, game.name, function () {
          pending -= 1;
          if (pending <= 0 && done) done();
        });
      })(unique[i]);
    }
  }

  function recoverSupabaseModeIfNeeded(done) {
    var cached = readMode();
    if (storageMode !== 'local' && cached !== 'local') {
      if (done) done();
      return;
    }
    var hasLocal = false;
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      if (raw && raw.length > 2 && raw !== '{}') hasLocal = true;
    } catch (e) {}
    if (hasLocal) {
      if (done) done();
      return;
    }
    storageMode = null;
    try {
      sessionStorage.removeItem(MODE_KEY);
    } catch (e2) {}
    resolveStorageMode(function () {
      if (done) done();
    });
  }

  function refreshData(done) {
    recoverSupabaseModeIfNeeded(function () {
      loadTvSettings(function () {
      loadScoredGamesMap(function (scoredMap) {
        function afterRotation(rotation) {
          rotationGames = finalizeRotation(rotation || []);
          if (window.ArcadeActivity) {
            classicsList = ArcadeActivity.getClassicPopularGames(games, CLASSICS_SHOW);
          } else {
            classicsList = games.slice(0, CLASSICS_SHOW);
          }
          prefetchScoreSlides(function () {
            loadChampions(function () {
              loadPrizeWins(function () {
                slides = buildSlides();
                if (slides.length && slideIndex >= slides.length) {
                  slideIndex = 0;
                }
                showSlide(slideIndex, false);
                if (pendingCelebrateGameNumber && isInCelebrationFlow()) {
                  focusSlideForGame(pendingCelebrateGameNumber);
                }
                if (done) done();
              });
            });
          });
        }

        if (tvSettings.gameNumbers && tvSettings.gameNumbers.length) {
          buildRotationGamesFromPick(tvSettings.gameNumbers, afterRotation);
        } else {
          buildRotationGames(scoredMap, afterRotation);
        }
      });
      });
    });
  }

  function updateOnlineStatus() {
    var indicator = $('tv-online-indicator');
    var label = $('tv-status-label');
    if (!indicator || !label) return;
    resolveStorageMode(function (mode) {
      var isOnline = mode === 'supabase';
      var block = $('tv-status');
      indicator.className = isOnline ? 'tv-online-indicator is-online' : 'tv-online-indicator';
      label.textContent = isOnline ? 'online' : 'ready';
      label.className = isOnline ? 'tv-status-label' : 'tv-status-label is-ready';
      if (block) {
        block.className = isOnline ? 'tv-status-block' : 'tv-status-block is-ready';
      }
      scheduleFitBrandTitle();
    });
  }

  function bindVisibilityRefresh() {
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshData();
    }, false);
  }

  function bindResizeRefresh() {
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        applyDisplayProfile();
        scheduleFitBrandTitle();
        refreshData();
      }, 250);
    }, false);
  }

  function randomQrMs(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pickQrGlowColor(exclude) {
    var color;
    var tries = 0;
    do {
      color = QR_GLOW_COLORS[Math.floor(Math.random() * QR_GLOW_COLORS.length)];
      tries += 1;
    } while (
      exclude
      && color.r === exclude.r
      && color.g === exclude.g
      && color.b === exclude.b
      && tries < 8
    );
    return color;
  }

  function applyQrGlowColor(el, color) {
    if (!color) {
      color = pickQrGlowColor(el._qrGlowColor || null);
    }
    el._qrGlowColor = color;
    el.style.setProperty('--qr-glow-r', String(color.r));
    el.style.setProperty('--qr-glow-g', String(color.g));
    el.style.setProperty('--qr-glow-b', String(color.b));
  }

  function clearQrColorTimer(el) {
    if (!el || !el._qrColorTimer) return;
    clearTimeout(el._qrColorTimer);
    el._qrColorTimer = null;
  }

  function clearQrGrowTimer(el) {
    if (!el || !el._qrGrowTimer) return;
    clearTimeout(el._qrGrowTimer);
    el._qrGrowTimer = null;
  }

  function scheduleNextQrColor(el) {
    var holdMs = randomQrMs(QR_GLOW_HOLD_MIN_MS, QR_GLOW_HOLD_MAX_MS);
    var transitionMs = randomQrMs(QR_GLOW_TRANSITION_MIN_MS, QR_GLOW_TRANSITION_MAX_MS);
    var pauseMs = randomQrMs(QR_GLOW_PAUSE_MIN_MS, QR_GLOW_PAUSE_MAX_MS);

    clearQrColorTimer(el);
    el._qrColorTimer = setTimeout(function () {
      playQrColorOnly(el, transitionMs);
      el._qrColorTimer = setTimeout(function () {
        scheduleNextQrColor(el);
      }, transitionMs + pauseMs);
    }, holdMs);
  }

  function setQrMoveToCenter(el) {
    var rect = el.getBoundingClientRect();
    var footer = document.querySelector('.tv-footer');
    var footerRect;
    var moveX = (window.innerWidth / 2) - (rect.left + rect.width / 2);
    var moveY = 0;
    var growScale;
    var scaledHalf;
    var centerY;
    var targetCenterY;
    var gap = 16;

    growScale = parseFloat(getComputedStyle(el).getPropertyValue('--qr-grow-scale')) || 1.55;

    if (footer) {
      footerRect = footer.getBoundingClientRect();
      scaledHalf = rect.height * growScale / 2;
      centerY = rect.top + rect.height / 2;
      targetCenterY = footerRect.top - gap - scaledHalf;
      moveY = targetCenterY - centerY;
    } else {
      moveY = -(window.innerHeight * 0.1);
    }

    el.style.setProperty('--qr-move-x', moveX + 'px');
    el.style.setProperty('--qr-move-y', moveY + 'px');
  }

  function clearQrMove(el) {
    el.style.removeProperty('--qr-move-x');
    el.style.removeProperty('--qr-move-y');
  }

  function copyQrStyleVars(fromEl, toEl) {
    var style = window.getComputedStyle(fromEl);
    toEl.style.setProperty('--qr-glow-r', style.getPropertyValue('--qr-glow-r').trim() || '163');
    toEl.style.setProperty('--qr-glow-g', style.getPropertyValue('--qr-glow-g').trim() || '230');
    toEl.style.setProperty('--qr-glow-b', style.getPropertyValue('--qr-glow-b').trim() || '53');
    toEl.style.setProperty('--qr-pulse-duration', style.getPropertyValue('--qr-pulse-duration').trim() || '6s');
    toEl.style.setProperty('--qr-color-transition', style.getPropertyValue('--qr-color-transition').trim() || '2.5s');
  }

  function createQrPlaceholder(el) {
    var placeholder;
    if (document.documentElement.classList.contains('tv-instructions-mode')) return null;
    removeQrPlaceholder(el);
    placeholder = el.cloneNode(true);
    placeholder.classList.remove('is-glow-shifting');
    placeholder.classList.add('tv-corner-qr-placeholder');
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.removeProperty('--qr-move-x');
    placeholder.style.removeProperty('--qr-move-y');
    placeholder.style.removeProperty('--qr-shift-duration');
    copyQrStyleVars(el, placeholder);
    applyQrGlowColor(placeholder, pickQrGlowColor(null));
    placeholder.style.setProperty('--qr-pulse-duration', (randomQrMs(5200, 7600) / 1000) + 's');
    document.body.appendChild(placeholder);
    el._qrPlaceholder = placeholder;
    scheduleNextQrColor(placeholder);
    return placeholder;
  }

  function removeQrPlaceholder(el) {
    if (el._qrPlaceholder) {
      clearQrColorTimer(el._qrPlaceholder);
      if (el._qrPlaceholder.parentNode) {
        el._qrPlaceholder.parentNode.removeChild(el._qrPlaceholder);
      }
    }
    el._qrPlaceholder = null;
  }

  function finishQrGlowShift(el) {
    el.classList.remove('is-glow-shifting');
    clearQrMove(el);
    removeQrPlaceholder(el);
    if (qrGlowActiveEl === el) {
      qrGlowActiveEl = null;
    }
  }

  function playQrColorOnly(el, transitionMs) {
    el.style.setProperty('--qr-color-transition', (transitionMs / 1000) + 's');
    applyQrGlowColor(el, pickQrGlowColor(el._qrGlowColor));
  }

  function playQrGlowShift(el) {
    var onShiftEnd;
    var fallbackTimer;
    var shiftMs = randomQrMs(QR_GROW_SHIFT_MIN_MS, QR_GROW_SHIFT_MAX_MS);

    if (document.documentElement.classList.contains('tv-instructions-mode')) {
      return 0;
    }

    if (qrGlowActiveEl) {
      return 0;
    }

    qrGlowActiveEl = el;
    setQrMoveToCenter(el);
    el.style.setProperty('--qr-shift-duration', (shiftMs / 1000) + 's');
    createQrPlaceholder(el);
    el.classList.remove('is-glow-shifting');
    void el.offsetWidth;

    onShiftEnd = function (e) {
      if (e.animationName !== 'tv-qr-glow-shift-scale') return;
      el.removeEventListener('animationend', onShiftEnd);
      clearTimeout(fallbackTimer);
      finishQrGlowShift(el);
    };

    el.addEventListener('animationend', onShiftEnd);
    fallbackTimer = setTimeout(function () {
      el.removeEventListener('animationend', onShiftEnd);
      finishQrGlowShift(el);
    }, shiftMs + 120);

    el.classList.add('is-glow-shifting');
    return shiftMs;
  }

  function scheduleNextQrGrow(el) {
    var waitMs = randomQrMs(QR_GROW_WAIT_MIN_MS, QR_GROW_WAIT_MAX_MS);

    clearQrGrowTimer(el);
    el._qrGrowTimer = setTimeout(function () {
      var shiftMs;
      var pauseMs;
      if (document.documentElement.classList.contains('tv-instructions-mode')) {
        el._qrGrowTimer = setTimeout(function () {
          scheduleNextQrGrow(el);
        }, randomQrMs(2000, 5000));
        return;
      }
      if (qrGlowActiveEl) {
        el._qrGrowTimer = setTimeout(function () {
          scheduleNextQrGrow(el);
        }, randomQrMs(4000, 9000));
        return;
      }
      pauseMs = randomQrMs(QR_GLOW_PAUSE_MIN_MS, QR_GLOW_PAUSE_MAX_MS);
      shiftMs = playQrGlowShift(el);
      if (!shiftMs) {
        el._qrGrowTimer = setTimeout(function () {
          scheduleNextQrGrow(el);
        }, randomQrMs(4000, 9000));
        return;
      }
      el._qrGrowTimer = setTimeout(function () {
        scheduleNextQrGrow(el);
      }, shiftMs + pauseMs);
    }, waitMs);
  }

  function setupCornerQrGlow(el) {
    if (!el) return;
    applyQrGlowColor(el);
    el.style.setProperty('--qr-color-transition', '2.5s');
    el.style.setProperty('--qr-pulse-duration', (randomQrMs(5200, 7600) / 1000) + 's');
    setTimeout(function () {
      scheduleNextQrColor(el);
      scheduleNextQrGrow(el);
    }, randomQrMs(500, 3500));
  }

  function initCornerQrGlow() {
    setupCornerQrGlow(document.querySelector('.tv-corner-qr--left'));
    setupCornerQrGlow(document.querySelector('.tv-corner-qr--right'));
  }

  var eventsClient = null;
  var celebrationActive = false;
  var rotationPausedForCelebration = false;
  var celebrationSafetyTimer = null;
  var celebrationStartTimer = null;
  var CELEBRATION_SAFETY_MS = 120000;
  /** Min pause after tablet submit before fireworks/audio (TV-enforced even if server is old). */
  var CELEBRATION_DELAY_MS = 2500;
  var celebrationSubmitAt = 0;
  var pendingCelebrateGameNumber = null;
  var nameEntryActive = false;
  var nameEntryKeyTimer = null;
  var TV_NAME_KEY_ROWS = [
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O'],
    ['P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'Y'],
    ['Z'],
    ['SPACE']
  ];

  function clearCelebrationStartTimer() {
    if (celebrationStartTimer) {
      clearTimeout(celebrationStartTimer);
      celebrationStartTimer = null;
    }
  }

  function clearCelebrationSafetyTimer() {
    if (celebrationSafetyTimer) {
      clearTimeout(celebrationSafetyTimer);
      celebrationSafetyTimer = null;
    }
  }

  function scheduleCelebrationSafetyTimer() {
    clearCelebrationSafetyTimer();
    celebrationSafetyTimer = setTimeout(function () {
      hideCelebration();
      hideEntryBanner();
    }, CELEBRATION_SAFETY_MS);
  }

  function formatCelebrationScore(n) {
    var num = Number(n);
    if (!isNaN(num) && isFinite(num)) {
      return num.toLocaleString('en-US');
    }
    return String(n || '0');
  }

  function normalizeScorePayload(payload) {
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
      initials: payload.initials || payload.playerInitials,
      confirmScore: Boolean(payload.confirmScore),
      prizeWon: Boolean(payload.prizeWon),
      prizeText: payload.prizeText || null
    };
  }

  function tvNameKeyAttr(key) {
    if (key === ' ' || key === 'SPACE') return 'space';
    return String(key || '').toUpperCase();
  }

  function buildNameEntryKeyboard() {
    var wrap = $('tv-name-entry-keys');
    var html = '';
    var r;
    var i;
    var key;
    var label;
    var rowClass;
    var keyClass;
    if (!wrap || wrap.getAttribute('data-built')) return;
    for (r = 0; r < TV_NAME_KEY_ROWS.length; r++) {
      rowClass = 'tv-name-entry-row';
      if (TV_NAME_KEY_ROWS[r].length === 1 && TV_NAME_KEY_ROWS[r][0] === 'Z') {
        rowClass += ' tv-name-entry-row--single';
      } else if (TV_NAME_KEY_ROWS[r][0] === 'SPACE') {
        rowClass += ' tv-name-entry-row--space';
      }
      html += '<div class="' + rowClass + '">';
      for (i = 0; i < TV_NAME_KEY_ROWS[r].length; i++) {
        key = TV_NAME_KEY_ROWS[r][i];
        label = key === 'SPACE' ? 'SPACE' : key;
        keyClass = 'tv-name-entry-key';
        if (key === 'SPACE') keyClass += ' tv-name-entry-key--wide';
        html += '<span class="' + keyClass + '" data-tv-key="' + escapeHtml(tvNameKeyAttr(key === 'SPACE' ? ' ' : key)) + '">'
          + escapeHtml(label) + '</span>';
      }
      html += '</div>';
    }
    html += '<div class="tv-name-entry-row tv-name-entry-row--actions">';
    html += '<span class="tv-name-entry-key tv-name-entry-key--action" data-tv-key="DELETE">DELETE</span>';
    html += '</div>';
    wrap.innerHTML = html;
    wrap.setAttribute('data-built', '1');
  }

  function setNameEntryAppClass(on) {
    var app = $('tv-app');
    if (app) app.classList.toggle('tv-app--name-entry', Boolean(on));
  }

  function updateNameEntryPreview(nameSoFar) {
    var el = $('tv-name-entry-name');
    var name = String(nameSoFar || '');
    if (!el) return;
    if (!name.length) {
      el.textContent = 'Your name here';
      el.className = 'tv-name-entry-name is-empty';
    } else {
      el.textContent = name;
      el.className = 'tv-name-entry-name';
    }
  }

  function flashNameEntryKey(action, key) {
    var wrap = $('tv-name-entry-keys');
    var attr;
    var el;
    var pressed;
    var i;
    if (!wrap) return;
    if (action === 'backspace') {
      attr = 'DELETE';
    } else if (action === 'clear') {
      return;
    } else {
      attr = tvNameKeyAttr(key);
    }
    el = wrap.querySelector('[data-tv-key="' + attr + '"]');
    if (!el) return;
    if (nameEntryKeyTimer) {
      clearTimeout(nameEntryKeyTimer);
      nameEntryKeyTimer = null;
    }
    pressed = wrap.querySelectorAll('.tv-name-entry-key.is-pressed');
    for (i = 0; i < pressed.length; i++) {
      pressed[i].classList.remove('is-pressed');
    }
    el.classList.add('is-pressed');
    nameEntryKeyTimer = setTimeout(function () {
      el.classList.remove('is-pressed');
      nameEntryKeyTimer = null;
    }, 160);
  }

  function showNameEntryOverlay(rawPayload) {
    var payload = normalizeScorePayload(rawPayload);
    var overlay = $('tv-name-entry');
    var gameNumEl = $('tv-name-entry-game-num');
    var gameEl = $('tv-name-entry-game');
    var scoreEl = $('tv-name-entry-score');
    var rankEl = $('tv-name-entry-rank');
    var gameName = payload.gameName || payload.game || 'Arcade';
    buildNameEntryKeyboard();
    hideEntryBanner();
    if (gameNumEl) {
      gameNumEl.textContent = payload.gameNumber ? ('Game #' + payload.gameNumber) : '';
      gameNumEl.hidden = !payload.gameNumber;
    }
    if (gameEl) gameEl.textContent = gameName;
    if (scoreEl) scoreEl.textContent = formatCelebrationScore(payload.score);
    if (rankEl) {
      if (payload.rank) {
        rankEl.textContent = 'Projected rank: #' + payload.rank;
        rankEl.removeAttribute('hidden');
      } else {
        rankEl.textContent = '';
        rankEl.setAttribute('hidden', 'hidden');
      }
    }
    updateNameEntryPreview('');
    if (!overlay) return;
    nameEntryActive = true;
    setNameEntryAppClass(true);
    pauseTvRotation();
    overlay.removeAttribute('hidden');
    overlay.classList.add('is-visible');
  }

  function hideNameEntryOverlay() {
    var overlay = $('tv-name-entry');
    nameEntryActive = false;
    setNameEntryAppClass(false);
    if (nameEntryKeyTimer) {
      clearTimeout(nameEntryKeyTimer);
      nameEntryKeyTimer = null;
    }
    if (window.TvCelebrationEffects && window.TvCelebrationEffects.stopNameEntryPrompt) {
      window.TvCelebrationEffects.stopNameEntryPrompt();
    }
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    overlay.setAttribute('hidden', 'hidden');
    updateNameEntryPreview('');
  }

  function showEntryBanner(rawPayload) {
    showNameEntryOverlay(rawPayload);
  }

  function hideEntryBanner() {
    hideNameEntryOverlay();
    var banner = $('tv-entry-banner');
    if (!banner) return;
    banner.classList.remove('is-visible');
    banner.setAttribute('hidden', 'hidden');
  }

  function pauseTvRotation() {
    captureRotateRemaining();
    clearRotateTimer();
    rotationPausedForCelebration = true;
  }

  function resumeTvRotation() {
    rotationPausedForCelebration = false;
    clearRotateTimer();
    if (slides.length && !celebrationActive && !celebrationStartTimer && !rotationPausedByUser) {
      startRotation();
    }
  }

  function toggleUserPause() {
    rotationPausedByUser = !rotationPausedByUser;
    if (rotationPausedByUser) {
      captureRotateRemaining();
      clearRotateTimer();
      return;
    }
    if (!rotationPausedForCelebration && !celebrationActive && !celebrationStartTimer && slides.length) {
      startRotation();
    }
  }

  function bindScreenPauseToggle() {
    var app = $('tv-app');
    if (!app) return;
    app.addEventListener('click', function (e) {
      if (e.target.closest('.tv-corner-qr')) return;
      if (celebrationActive || celebrationStartTimer) return;
      var shutdown = $('tv-shutdown');
      if (shutdown && !shutdown.hasAttribute('hidden')) return;
      toggleUserPause();
    }, false);
  }

  function isInCelebrationFlow() {
    return nameEntryActive || celebrationActive || celebrationStartTimer || celebrationSubmitAt > 0;
  }

  function focusSlideForGame(gameNumber) {
    var gn = parseInt(gameNumber, 10);
    var i;
    if (!gn || !slides.length) return false;
    for (i = 0; i < slides.length; i++) {
      if (slides[i].type === 'scores' && slides[i].game && slides[i].game.number === gn) {
        pauseTvRotation();
        showSlide(i, false);
        return true;
      }
    }
    return false;
  }

  function scheduleCelebrationShow(payload) {
    var wait;
    var elapsed;
    clearCelebrationStartTimer();
    if (payload && payload.gameNumber) {
      pendingCelebrateGameNumber = parseInt(payload.gameNumber, 10);
    }
    focusSlideForGame(pendingCelebrateGameNumber);
    elapsed = celebrationSubmitAt ? (Date.now() - celebrationSubmitAt) : 0;
    wait = Math.max(0, CELEBRATION_DELAY_MS - elapsed);
    celebrationStartTimer = setTimeout(function () {
      celebrationStartTimer = null;
      showCelebration(payload || {});
    }, wait);
  }

  function showCelebration(rawPayload) {
    var payload = normalizeScorePayload(rawPayload);
    var overlay = $('tv-celebration');
    var gameEl = $('tv-celebration-game');
    var rankEl = $('tv-celebration-rank');
    var scoreEl = $('tv-celebration-score');
    var playerEl = $('tv-celebration-player');
    var taglineEl = document.querySelector('.tv-celebration-tagline');
    var gameNumEl = $('tv-celebration-game-num');
    var playerDisplay = '';
    var isTopScore = false;
    var innerEl, kickerEl, congratsEl;
    if (!overlay) return;

    isTopScore = payload.rank === 1 || payload.rank === '1';

    overlay.classList.remove('is-top-score', 'is-leaderboard');
    overlay.classList.add(isTopScore ? 'is-top-score' : 'is-leaderboard');
    innerEl = $('tv-celebration-inner');
    if (innerEl) {
      innerEl.classList.remove('is-top-score', 'is-leaderboard');
      innerEl.classList.add(isTopScore ? 'is-top-score' : 'is-leaderboard');
    }
    kickerEl = $('tv-celebration-kicker');
    if (kickerEl) {
      kickerEl.textContent = isTopScore ? 'NEW HIGH SCORE!' : 'LEADERBOARD!';
    }
    congratsEl = $('tv-celebration-congrats');
    if (congratsEl) {
      congratsEl.textContent = isTopScore ? 'LEGEND STATUS!' : 'Congratulations!';
    }

    if (gameNumEl) {
      if (payload.gameNumber) {
        gameNumEl.textContent = 'Game #' + payload.gameNumber;
        gameNumEl.removeAttribute('hidden');
      } else {
        gameNumEl.textContent = '';
        gameNumEl.setAttribute('hidden', 'hidden');
      }
    }
    if (gameEl) gameEl.textContent = payload.gameName || payload.game || 'Arcade';
    if (rankEl) {
      if (payload.rank) {
        rankEl.textContent = '#' + payload.rank + ' on the leaderboard';
        rankEl.removeAttribute('hidden');
      } else {
        rankEl.textContent = '';
        rankEl.setAttribute('hidden', 'hidden');
      }
    }
    if (scoreEl) scoreEl.textContent = formatCelebrationScore(payload.score);
    if (playerEl) {
      playerDisplay = payload.initials ? payload.initials : 'Enter your name on the tablet';
      playerEl.textContent = playerDisplay;
    }
    if (taglineEl) {
      taglineEl.textContent = isTopScore
        ? 'You got the new high score!'
        : 'You made the leaderboard!';
    }

    var crownEl = $('tv-celebration-crown');
    if (crownEl) {
      if (isTopScore) {
        crownEl.removeAttribute('hidden');
      } else {
        crownEl.setAttribute('hidden', 'hidden');
      }
    }
    var prizeEl = $('tv-celebration-prize');
    if (prizeEl) {
      if (payload.prizeWon && payload.prizeText) {
        prizeEl.className = 'tv-celebration-prize';
        prizeEl.innerHTML = '<span class="tv-celebration-prize-eyebrow">You beat the champ — you win</span>' +
          '<span class="tv-celebration-prize-text">' + escapeHtml(payload.prizeText) + '</span>' +
          '<span class="tv-celebration-prize-claim">See the bartender to claim!</span>';
        prizeEl.removeAttribute('hidden');
      } else if (!isTopScore) {
        // No prize (they didn't take #1) — show the motivational teaser instead of an empty box.
        prizeEl.className = 'tv-celebration-prize tv-celebration-prize--teaser';
        prizeEl.innerHTML = '<span class="tv-celebration-prize-eyebrow">Beat a champ —</span>' +
          '<span class="tv-celebration-prize-text">Win a Prize!</span>' +
          '<span class="tv-celebration-prize-claim">Take #1 on any game</span>';
        prizeEl.removeAttribute('hidden');
      } else {
        prizeEl.className = 'tv-celebration-prize';
        prizeEl.innerHTML = '';
        prizeEl.setAttribute('hidden', 'hidden');
      }
    }
    var sparklesEl = $('tv-celebration-sparkles');
    if (sparklesEl) {
      sparklesEl.classList.toggle('is-active', true);
      sparklesEl.classList.toggle('is-top', isTopScore);
    }

    overlay.removeAttribute('hidden');
    overlay.style.display = 'flex';
    overlay.classList.add('is-visible');
    celebrationActive = true;
    scheduleCelebrationSafetyTimer();
    pauseTvRotation();

    if (window.TvCelebrationEffects) {
      window.TvCelebrationEffects.onCelebrationEnd = function () {
        if (celebrationActive) {
          hideCelebration();
        }
      };
      window.TvCelebrationEffects.start({
        playerName: playerDisplay,
        rank: payload.rank,
        prizeWon: Boolean(payload.prizeWon)
      });
    }
  }

  function hideCelebration() {
    clearCelebrationStartTimer();
    var overlay = $('tv-celebration');
    var innerEl;
    clearCelebrationSafetyTimer();
    if (window.TvCelebrationEffects) {
      window.TvCelebrationEffects.stop();
    }
    celebrationActive = false;
    pendingCelebrateGameNumber = null;
    celebrationSubmitAt = 0;
    if (overlay) {
      overlay.classList.remove('is-visible', 'is-top-score', 'is-leaderboard');
      overlay.style.display = 'none';
      overlay.setAttribute('hidden', 'hidden');
    }
    innerEl = $('tv-celebration-inner');
    if (innerEl) {
      innerEl.classList.remove('is-top-score', 'is-leaderboard');
    }
    var sparklesEl = $('tv-celebration-sparkles');
    if (sparklesEl) {
      sparklesEl.classList.remove('is-active', 'is-top');
    }
    var crownEl = $('tv-celebration-crown');
    if (crownEl) {
      crownEl.setAttribute('hidden', 'hidden');
    }
    resumeTvRotation();
    refreshData();
  }

  function showShutdownOverlay(payload) {
    var overlay = $('tv-shutdown');
    var titleEl = $('tv-shutdown-title');
    var detailEl = $('tv-shutdown-detail');
    if (!overlay) return;
    hideEntryBanner();
    hideCelebration();
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
    if (titleEl) {
      titleEl.textContent = (payload && payload.message) ? payload.message : 'Arcade Shutting Down';
    }
    if (detailEl) {
      detailEl.textContent = (payload && payload.detail) ? payload.detail : 'Please Wait...';
    }
    overlay.removeAttribute('hidden');
    overlay.style.display = 'flex';
  }

  function primeTvAudio() {
    if (window.TvCelebrationEffects && window.TvCelebrationEffects.prime) {
      window.TvCelebrationEffects.prime();
    }
  }

  function initArcadeEvents() {
    if (typeof ArcadeWsClient === 'undefined') return;

    eventsClient = new ArcadeWsClient({ role: 'tv' });

    eventsClient.on('NEW_HIGH_SCORE', function (msg) {
      primeTvAudio();
      showEntryBanner(msg.payload || {});
    });

    eventsClient.on('ENTER_PLAYER', function (msg) {
      var p = msg.payload || {};
      primeTvAudio();
      showEntryBanner(p);
      // Keyboard is up: greet the player (congrats for every tier; the 6–10 tier also
      // gets leaderboard + "enter your name"). The bigger celebration plays after submit.
      if (window.TvCelebrationEffects && window.TvCelebrationEffects.promptNameEntry) {
        window.TvCelebrationEffects.promptNameEntry({
          rank: p.rank,
          prizeWon: Boolean(p.prizeWon)
        });
      }
    });

    eventsClient.on('QUALIFIED', function (msg) {
      primeTvAudio();
      showEntryBanner(msg.payload || {});
    });

    eventsClient.on('NAME_ENTRY_UPDATE', function (msg) {
      var p = msg.payload || {};
      updateNameEntryPreview(p.nameSoFar);
      flashNameEntryKey(p.action, p.key);
    });

    eventsClient.on('open', function () {
      hideEntryBanner();
      hideCelebration();
      refreshData();
      primeTvAudio();
      var label = $('tv-status-label');
      if (label) label.textContent = 'events connected';
    });

    eventsClient.on('close', function () {
      var label = $('tv-status-label');
      if (label) label.textContent = 'events offline';
    });

    eventsClient.on('PLAYER_IDENTIFIED', function (msg) {
      primeTvAudio();
      hideEntryBanner();
      scheduleCelebrationShow(msg.payload || {});
    });

    eventsClient.on('BACK_TO_IDLE', function () {
      clearCelebrationStartTimer();
      celebrationSubmitAt = 0;
      pendingCelebrateGameNumber = null;
      hideEntryBanner();
      // Let the TV audio chain finish (incl. Claim Prize); onCelebrationEnd hides the overlay.
      if (!celebrationActive) {
        hideCelebration();
      }
    });

    eventsClient.on('PLAYER_TIMEOUT', function () {
      clearCelebrationStartTimer();
      celebrationSubmitAt = 0;
      pendingCelebrateGameNumber = null;
      hideEntryBanner();
      hideCelebration();
    });

    eventsClient.on('LEADERBOARD_UPDATED', function () {
      if (isInCelebrationFlow()) {
        refreshData(function () {
          focusSlideForGame(pendingCelebrateGameNumber);
        });
      } else {
        refreshData();
      }
    });

    eventsClient.on('PLAYER_SUBMITTED', function (msg) {
      var p = msg.payload || {};
      hideEntryBanner();
      celebrationSubmitAt = Date.now();
      pauseTvRotation();
      if (p.gameNumber) {
        pendingCelebrateGameNumber = parseInt(p.gameNumber, 10);
      }
      refreshData(function () {
        if (isInCelebrationFlow()) {
          focusSlideForGame(pendingCelebrateGameNumber);
        }
      });
    });

    eventsClient.on('SHUTDOWN_REQUESTED', function (msg) {
      showShutdownOverlay(msg.payload || {});
    });

    eventsClient.on('SYSTEM_RESTARTING', function () {
      showShutdownOverlay({
        message: 'Event Server Restarting',
        detail: 'Please Wait...'
      });
    });

    eventsClient.on('LEADERBOARD_REFRESH', function (msg) {
      var p = (msg && msg.payload) ? msg.payload : {};
      var inFlow = isInCelebrationFlow();
      if (inFlow && p.gameNumber) {
        pendingCelebrateGameNumber = parseInt(p.gameNumber, 10);
      }
      refreshData(function () {
        if (pendingCelebrateGameNumber && isInCelebrationFlow()) {
          focusSlideForGame(pendingCelebrateGameNumber);
        }
      });
    });

    eventsClient.connect();
  }

  function init() {
    applyDisplayProfile();
    initCornerQrGlow();
    initArcadeEvents();
    loadGames(function (ok) {
      if (!ok) {
        $('tv-slide').innerHTML = '<p class="tv-empty">Could not load games. Check connection.</p>';
        return;
      }

      var countEl = $('tv-games-count');
      if (countEl && games.length) {
        countEl.textContent = games.length + ' games';
      }
      scheduleFitBrandTitle();

      resolveStorageMode(function () {
        if (window.ArcadeActivity) {
          ArcadeActivity.init(machine, resolveStorageMode);
        }
        refreshData(function () {
          startTitleColorCycle();
          startRotation();
          updateOnlineStatus();
        });
      });

      updateOnlineStatus();

      bindVisibilityRefresh();
      bindResizeRefresh();
      bindScreenPauseToggle();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, false);
  } else {
    init();
  }
}(this));
