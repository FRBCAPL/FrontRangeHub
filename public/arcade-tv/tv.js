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
  var REFRESH_MS = 30000;
  var ROTATION_LIMIT = 8;
  var CLASSICS_SHOW = 18;
  var CHAMPS_LIMIT = 8;
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
  var refreshTimer = null;
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
        done('supabase');
      } else if (isTableMissing(status, data, text)) {
        writeMode('local');
        done('local');
      } else {
        writeMode('local');
        done('local');
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

  function getScores(gameNumber, gameName, done) {
    var cacheKey = gameNumber + '|' + gameName;
    resolveStorageMode(function (mode) {
      if (mode === 'supabase') {
        var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=initials,score,updated_at,photo_url'
          + '&machine_id=eq.' + encodeURIComponent(machine.id)
          + '&game_number=eq.' + encodeURIComponent(String(gameNumber))
          + '&order=score.desc&limit=' + TOP_LIMIT;
        xhr('GET', url, null, function (ok, status, data, text) {
          if (ok && data) {
            scoreCache[cacheKey] = data;
            done(data);
            return;
          }
          if (isTableMissing(status, data, text)) writeMode('local');
          var local = readLocalScores(gameNumber, gameName);
          scoreCache[cacheKey] = local;
          done(local);
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
    var restArea = vh * 0.36;
    var rowH = Math.max(34, vh * 0.048);
    var max = Math.floor(restArea / rowH);
    if (max < 4) max = 4;
    if (max > 9) max = 9;
    return max;
  }

  function shouldSplitRestScores(restCount) {
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

  function renderScoreRowHtml(entry, rank, isFirst) {
    var html = '';
    var rowTag = isFirst ? 'div' : 'li';
    var rowClass = isFirst ? 'tv-score-first is-gold' : 'tv-score-row';
    var photoSize = isFirst ? 'first' : 'rest';
    html += '<' + rowTag + ' class="' + rowClass + '">';
    html += '<span class="tv-rank">' + rank + '</span>';
    html += '<div class="tv-player-cell">';
    html += renderPlayerPhotoHtml(entry, photoSize);
    html += '<span class="tv-player">' + escapeHtml(entry.initials || '???') + '</span>';
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
    html += '<h3 class="tv-board-label">High Scores</h3>';
    if (!scores || !scores.length) {
      html += '<div class="tv-no-scores">';
      html += '<p class="tv-empty tv-no-scores-msg">No scores yet — be the first!</p>';
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
      html += '<h3 class="tv-board-label">High Scores</h3>';
      html += '<p class="tv-empty tv-no-scores-msg">No scores yet — be the first!</p>';
      html += '</div>';
      return html;
    }
    html += '<h3 class="tv-board-label tv-promo-board-label">High Scores</h3>';
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
    var html = '<div class="tv-promo-slide' + (emptyScores ? ' tv-promo-slide--empty-scores' : '') + '">';
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
      html += '<li class="tv-champ-row">';
      html += '<span class="tv-champ-game">' + escapeHtml(row.gameName) + '</span>';
      html += '<span class="tv-champ-player">' + escapeHtml(row.initials) + '</span>';
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
  }

  function slideClassName(html, state) {
    var cls = 'tv-slide';
    if (state) cls += ' ' + state;
    if (html && html.indexOf('tv-no-scores') >= 0) cls += ' tv-slide--empty';
    return cls;
  }

  function showSlide(index, animate) {
    var stage = $('tv-slide');
    if (!stage || !slides.length) return;
    var nextIndex = index % slides.length;
    var slide = slides[nextIndex];
    var html = slide.html || '<p class="tv-empty">Loading...</p>';

    if (!animate) {
      stage.className = slideClassName(html, 'is-active');
      stage.innerHTML = html;
      slideIndex = nextIndex;
      renderDots();
      return;
    }

    if (transitioning) return;
    transitioning = true;
    stage.className = slideClassName(html, 'is-exiting');
    setTimeout(function () {
      stage.innerHTML = html;
      stage.className = slideClassName(html, 'is-active');
      slideIndex = nextIndex;
      renderDots();
      transitioning = false;
    }, 450);
  }

  function advanceSlide() {
    if (!slides.length) return;
    showSlide(slideIndex + 1, true);
  }

  function startRotation() {
    if (rotateTimer) clearInterval(rotateTimer);
    rotateTimer = setInterval(advanceSlide, ROTATE_MS);
  }

  function getScoredRotationGames() {
    var list = [];
    var i;
    var key;
    for (i = 0; i < rotationGames.length; i++) {
      key = rotationGames[i].number + '|' + rotationGames[i].name;
      if (scoreCache[key] && scoreCache[key].length) {
        list.push(rotationGames[i]);
      }
      if (list.length >= CHAMPS_LIMIT) break;
    }
    return list;
  }

  function loadChampions(done) {
    var list = getScoredRotationGames();
    var pending = list.length;
    var rows = [];
    var i;

    if (!pending) {
      championsData = [];
      if (done) done();
      return;
    }

    for (i = 0; i < list.length; i++) {
      (function (game, idx) {
        getScores(game.number, game.name, function (scores) {
          if (scores && scores[0]) {
            rows[idx] = {
              gameName: game.name,
              initials: scores[0].initials || '???',
              score: scores[0].score
            };
          }
          pending -= 1;
          if (pending <= 0) {
            championsData = [];
            var j;
            for (j = 0; j < rows.length; j++) {
              if (rows[j]) championsData.push(rows[j]);
            }
            if (done) done();
          }
        });
      })(list[i], i);
    }
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

  function refreshData(done) {
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
  }

  function updateClock() {
    var el = $('tv-clock');
    if (!el) return;
    var now = new Date();
    el.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
        refreshData();
      }, 250);
    }, false);
  }

  function init() {
    loadGames(function (ok) {
      if (!ok) {
        $('tv-slide').innerHTML = '<p class="tv-empty">Could not load games. Check connection.</p>';
        return;
      }

      var countEl = $('tv-games-count');
      if (countEl && games.length) {
        countEl.textContent = games.length + ' games';
      }

      resolveStorageMode(function () {
        if (window.ArcadeActivity) {
          ArcadeActivity.init(machine, resolveStorageMode);
        }
        refreshData(function () {
          startRotation();
        });
      });

      updateClock();
      setInterval(updateClock, 1000);

      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(function () {
        refreshData();
      }, REFRESH_MS);

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
