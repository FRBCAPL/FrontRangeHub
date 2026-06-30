/* Legends Arcade TV — auto-cycling leaderboard display (ES5) */
(function () {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var LOCAL_KEY = 'frph-arcade-scores';
  var MODE_KEY = 'frph-arcade-supabase-mode';
  var GAMES_URL = '../arcade-kiosk-lite/games.json?v=20250629';
  var KIOSK_URL = 'https://frontrangepool.com/arcade-kiosk-lite';
  var TOP_LIMIT = 10;
  var GOM_SCORES_LIMIT = 6;
  var ROTATE_MS = 12000;
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

  var machine = null;
  var games = [];
  var storageMode = null;
  var slides = [];
  var slideIndex = 0;
  var rotateTimer = null;
  var scoreCache = {};
  var rotationGames = [];
  var classicsList = [];
  var championsData = [];
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

  function loadTvSettings(done) {
    if (!machine || !machine.id) {
      if (done) done();
      return;
    }
    var url = SUPABASE_URL + '/rest/v1/arcade_machines?select=tv_rotation_count,tv_rotation_games,tv_gom_number,tv_gom_prize,tv_gom_subtitle'
      + '&id=eq.' + encodeURIComponent(machine.id);
    xhr('GET', url, null, function (ok, status, data, text) {
      var row = ok && data && data[0] ? data[0] : null;
      var nums = [];
      var g;
      var i;
      if (row) {
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
        g = findGameByNumber(gameOfMonth.number);
        if (g) gameOfMonth.name = g.name;
      } else {
        tvSettings.gameNumbers = null;
      }
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
    var signage = isSignage32Display();
    var restArea = vh * (signage ? 0.4 : 0.36);
    var rowH = Math.max(32, vh * (signage ? 0.036 : 0.048));
    var max = Math.floor(restArea / rowH);
    if (max < 4) max = 4;
    if (max > 9) max = signage ? 11 : 9;
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

  function applyDisplayProfile() {
    var root = document.documentElement;
    if (!root) return;
    root.classList.toggle('tv-portrait', isPortraitDisplay());
    root.classList.toggle('tv-signage-32', isSignage32Display());
    scheduleFitBrandTitle();
  }

  function fitBrandTitle() {
    var title = document.querySelector('.tv-brand-title');
    var games = document.querySelector('.tv-header-games');
    var status = document.querySelector('.tv-status-block');
    var gamesRect;
    var statusRect;
    var available;
    var lo;
    var hi;
    var mid;

    if (!title || !games || !status) return;

    lo = 12;
    hi = isSignage32Display() ? 110 : 90;
    title.style.fontSize = lo + 'px';

    while (lo < hi) {
      mid = Math.ceil((lo + hi) / 2);
      title.style.fontSize = mid + 'px';
      void title.offsetWidth;
      gamesRect = games.getBoundingClientRect();
      statusRect = status.getBoundingClientRect();
      available = statusRect.left - gamesRect.right - 14;
      if (available > 0 && title.scrollWidth <= available) {
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

  function renderClassicsHtml() {
    var html = '';
    var i;
    var g;
    html += '<h2 class="tv-slide-title">Arcade Classics</h2>';
    html += '<div class="tv-classics-grid">';
    for (i = 0; i < classicsList.length && i < CLASSICS_SHOW; i++) {
      g = classicsList[i];
      html += '<div class="tv-classic-card">';
      html += renderGameNumberHtml(g.number, 'classic');
      html += '<span class="tv-classic-name">' + escapeHtml(g.name) + '</span>';
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
    html += '<p class="tv-promo-eyebrow">Game of the Month</p>';
    html += renderGameNumberHtml(g.number, 'promo');
    html += '<h2 class="tv-promo-game-name">' + escapeHtml(g.name) + '</h2>';
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

  function renderChampionsHtml() {
    var html = '';
    var i;
    var row;
    html += '<h2 class="tv-slide-title">Champions</h2>';
    if (!championsData.length) {
      html += '<p class="tv-empty">No champions yet — play a game!</p>';
      return html;
    }
    html += '<ul class="tv-champs-list">';
    for (i = 0; i < championsData.length; i++) {
      row = championsData[i];
      var champDate = formatScoreDate(row.updated_at);
      html += '<li class="tv-champ-row">';
      html += '<span class="tv-champ-game">' + escapeHtml(row.gameName) + '</span>';
      html += '<div class="tv-champ-player-block">';
      html += '<span class="tv-champ-player">' + escapeHtml(row.initials) + '</span>';
      if (champDate) {
        html += '<span class="tv-champ-date">' + escapeHtml(champDate) + '</span>';
      }
      html += '</div>';
      html += '<span class="tv-champ-score">' + formatScore(row.score) + '</span>';
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function buildSlides() {
    var list = [];
    var i;
    var g;

    for (i = 0; i < rotationGames.length; i++) {
      g = rotationGames[i];
      list.push({
        type: 'scores',
        game: g,
        html: renderScoresHtml(g, scoreCache[g.number + '|' + g.name] || [])
      });
    }

    if (!rotationGames.length) {
      g = findGameByNumber(4) || findGameByNumber(1) || games[0];
      if (g) {
        list.push({
          type: 'scores',
          game: g,
          html: renderScoresHtml(g, scoreCache[g.number + '|' + g.name] || [])
        });
      }
    }

    list.push({ type: 'classics', html: renderClassicsHtml() });
    list.push({ type: 'promo', html: renderPromoHtml() });
    list.push({ type: 'champions', html: renderChampionsHtml() });

    return list;
  }

  function updateHeaderTagline() {
    var el = $('tv-header-tagline');
    if (!el) return;
    var slide = slides[slideIndex];
    var show = slide && (slide.type === 'scores' || slide.type === 'promo');
    if (show) {
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
      } else {
        hint.textContent = 'Scan your phone to submit scores — ' + KIOSK_URL.replace('https://', '');
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

  function onSlideActivated() {
    var app = $('tv-app');
    var stage = $('tv-slide');
    if (app && stage) {
      app.classList.toggle('tv-app--empty-scores', stage.classList.contains('tv-slide--empty'));
    }
    renderDots();
  }

  function slideClassName(html, state) {
    var cls = 'tv-slide';
    if (state) cls += ' ' + state;
    if (html && html.indexOf('tv-no-scores') >= 0) cls += ' tv-slide--empty';
    return cls;
  }

  function finishSlideActivation(stage, html, nextIndex) {
    stage.innerHTML = html;
    stage.className = slideClassName(html, 'is-active');
    slideIndex = nextIndex;
    onSlideActivated();
    transitioning = false;
  }

  function showSlide(index, animate) {
    var stage = $('tv-slide');
    var fallbackTimer;
    var onFadeOutEnd;
    if (!stage || !slides.length) return;
    var nextIndex = index % slides.length;
    var slide = slides[nextIndex];
    var html = slide.html || '<p class="tv-empty">Loading...</p>';

    if (!animate) {
      stage.className = slideClassName(html, 'is-active');
      stage.innerHTML = html;
      slideIndex = nextIndex;
      onSlideActivated();
      return;
    }

    if (transitioning) return;
    transitioning = true;
    stage.className = slideClassName(html, 'is-exiting');

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

  function advanceSlide() {
    if (!slides.length) return;
    showSlide(slideIndex + 1, true);
  }

  function scheduleNextRotation() {
    rotateTimer = setTimeout(function () {
      advanceSlide();
      scheduleNextRotation();
    }, ROTATE_MS);
  }

  function startRotation() {
    if (rotateTimer) clearTimeout(rotateTimer);
    scheduleNextRotation();
  }

  function buildChampionsFromScoreCache() {
    var rows = [];
    var key;
    var parts;
    var scores;
    var i;
    for (key in scoreCache) {
      if (!scoreCache.hasOwnProperty(key)) continue;
      scores = scoreCache[key];
      if (!scores || !scores.length) continue;
      parts = key.split('|');
      rows.push({
        gameName: parts.length > 1 ? parts.slice(1).join('|') : 'Game',
        initials: scores[0].initials || '???',
        score: parseInt(scores[0].score, 10) || 0,
        updated_at: scores[0].updated_at || null
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

  function loadChampions(done) {
    resolveStorageMode(function (mode) {
      if (mode === 'supabase' && machine && machine.id) {
        var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=game_number,game_name,initials,score,updated_at'
          + '&machine_id=eq.' + encodeURIComponent(machine.id)
          + '&order=score.desc&limit=250';
        xhr('GET', url, null, function (ok, status, data, text) {
          var seen = {};
          var rows = [];
          var i;
          var gn;
          if (ok && data && data.length) {
            for (i = 0; i < data.length; i++) {
              gn = data[i].game_number;
              if (!gn || seen[gn]) continue;
              seen[gn] = true;
              rows.push({
                gameName: data[i].game_name || ('Game ' + gn),
                initials: data[i].initials || '???',
                score: parseInt(data[i].score, 10) || 0,
                updated_at: data[i].updated_at || null
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
          if (done) done();
        });
        return;
      }
      championsData = buildChampionsFromScoreCache();
      if (done) done();
    });
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
              slides = buildSlides();
              if (slides.length && slideIndex >= slides.length) {
                slideIndex = 0;
              }
              showSlide(slideIndex, false);
              if (done) done();
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
  var CELEBRATION_SAFETY_MS = 90000;

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
      confirmScore: Boolean(payload.confirmScore)
    };
  }

  function showEntryBanner(rawPayload) {
    var payload = normalizeScorePayload(rawPayload);
    var banner = $('tv-entry-banner');
    var detail = $('tv-entry-banner-detail');
    if (!banner) return;
    if (detail) {
      detail.textContent = (payload.gameName || payload.game || 'Arcade')
        + ' — ' + formatCelebrationScore(payload.score)
        + ' — Enter your name on the tablet';
    }
    banner.removeAttribute('hidden');
    banner.classList.add('is-visible');
  }

  function hideEntryBanner() {
    var banner = $('tv-entry-banner');
    if (!banner) return;
    banner.classList.remove('is-visible');
    banner.setAttribute('hidden', 'hidden');
  }

  function showCelebration(rawPayload) {
    var payload = normalizeScorePayload(rawPayload);
    var overlay = $('tv-celebration');
    var gameEl = $('tv-celebration-game');
    var rankEl = $('tv-celebration-rank');
    var scoreEl = $('tv-celebration-score');
    var playerEl = $('tv-celebration-player');
    var taglineEl = document.querySelector('.tv-celebration-tagline');
    var playerDisplay = '';
    var isTopScore = false;
    if (!overlay) return;

    isTopScore = payload.rank === 1 || payload.rank === '1';

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

    overlay.removeAttribute('hidden');
    overlay.style.display = 'flex';
    overlay.classList.add('is-visible');
    celebrationActive = true;
    scheduleCelebrationSafetyTimer();

    if (window.TvCelebrationEffects) {
      window.TvCelebrationEffects.start({
        playerName: playerDisplay,
        rank: payload.rank
      });
    }

    if (rotateTimer && !rotationPausedForCelebration) {
      clearInterval(rotateTimer);
      rotateTimer = null;
      rotationPausedForCelebration = true;
    }
  }

  function hideCelebration() {
    var overlay = $('tv-celebration');
    clearCelebrationSafetyTimer();
    if (window.TvCelebrationEffects) {
      window.TvCelebrationEffects.stop();
    }
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    overlay.style.display = 'none';
    overlay.setAttribute('hidden', 'hidden');
    celebrationActive = false;

    if (rotationPausedForCelebration && slides.length) {
      rotationPausedForCelebration = false;
      startRotation();
    }
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

  function initArcadeEvents() {
    if (typeof ArcadeWsClient === 'undefined') return;

    eventsClient = new ArcadeWsClient({ role: 'tv' });

    eventsClient.on('NEW_HIGH_SCORE', function (msg) {
      showEntryBanner(msg.payload || {});
    });

    eventsClient.on('ENTER_PLAYER', function (msg) {
      showEntryBanner(msg.payload || {});
    });

    eventsClient.on('QUALIFIED', function (msg) {
      showEntryBanner(msg.payload || {});
    });

    eventsClient.on('open', function () {
      hideEntryBanner();
      hideCelebration();
      refreshData();
      var label = $('tv-status-label');
      if (label) label.textContent = 'events connected';
    });

    eventsClient.on('close', function () {
      var label = $('tv-status-label');
      if (label) label.textContent = 'events offline';
    });

    eventsClient.on('PLAYER_IDENTIFIED', function (msg) {
      hideEntryBanner();
      showCelebration(msg.payload || {});
    });

    eventsClient.on('BACK_TO_IDLE', function () {
      hideEntryBanner();
      hideCelebration();
    });

    eventsClient.on('PLAYER_TIMEOUT', function () {
      hideEntryBanner();
      hideCelebration();
    });

    eventsClient.on('LEADERBOARD_UPDATED', function () {
      refreshData();
    });

    eventsClient.on('PLAYER_SUBMITTED', function () {
      refreshData();
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

    eventsClient.on('LEADERBOARD_REFRESH', function () {
      refreshData();
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
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, false);
  } else {
    init();
  }
}(this));
