/* Legends Arcade Lite Kiosk — ES5 for Android 4.4 KitKat WebView */
(function () {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var LOCAL_KEY = 'frph-arcade-scores';
  var MODE_KEY = 'frph-arcade-supabase-mode';
  var SEARCH_KEY = 'frph-arcade-search-query';
  var TOP_LIMIT = 10;
  var SEARCH_LIMIT = 25;
  var CLASSICS_LIMIT = 25;
  var POPULAR_LIMIT = 10;

  var machine = null;
  var games = [];
  var rankedPopularGames = [];
  var storageMode = null;
  var selectedGame = null;
  var topScoreCache = {};
  var submitStream = null;
  var submitCameraWatchdog = null;
  var submitInAppReady = false;
  var submitPhotoDataUrl = '';
  var submitSelfieDataUrl = '';
  var submitCameraMode = 'score';
  var activeTabId = 'find';
  var tabBeforeGame = 'find';

  function $(id) {
    return document.getElementById(id);
  }

  function trim(str) {
    return (str || '').replace(/^\s+|\s+$/g, '');
  }

  function isPhoneLayout() {
    try {
      if (window.matchMedia) {
        return window.matchMedia('(max-width: 600px)').matches;
      }
    } catch (e) {}
    return (window.innerWidth || 0) <= 600;
  }

  function submitScorePhotoHint() {
    if (isPhoneLayout()) {
      return 'Point the camera at the score on the arcade screen.';
    }
    return 'Show the score clearly on the arcade screen.';
  }

  function submitSelfiePhotoHint() {
    return 'Smile! This selfie can go on the leaderboard next to your score.';
  }

  function submitCameraOpeningHint() {
    if (submitCameraMode === 'selfie') {
      return 'Opening selfie camera...';
    }
    if (isPhoneLayout()) {
      return 'Opening camera for score photo...';
    }
    return 'Opening camera...';
  }

  function getSubmitCameraFacing(mode) {
    if (mode === 'selfie' || submitCameraMode === 'selfie') {
      return 'user';
    }
    return isPhoneLayout() ? 'environment' : 'user';
  }

  function updateSubmitVideoMirror(stream) {
    var video = $('submit-video');
    if (!video) return;
    var rear = isPhoneLayout() || isLikelyRearCamera(stream);
    video.className = rear ? 'submit-video submit-video--rear' : 'submit-video submit-video--front';
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

  function writeLocalScores(gameNumber, gameName, scores) {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      var all = raw ? JSON.parse(raw) : {};
      all[gameStorageKey(gameNumber, gameName)] = scores;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function sortScores(scores) {
    scores.sort(function (a, b) {
      return b.score - a.score;
    });
    return scores.slice(0, TOP_LIMIT);
  }

  function getScores(gameNumber, gameName, done) {
    resolveStorageMode(function (mode) {
      if (mode === 'supabase') {
        var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=initials,score,updated_at'
          + '&machine_id=eq.' + encodeURIComponent(machine.id)
          + '&game_number=eq.' + encodeURIComponent(String(gameNumber))
          + '&order=score.desc&limit=' + TOP_LIMIT;
        xhr('GET', url, null, function (ok, status, data, text) {
          if (ok && data) {
            done(data);
            return;
          }
          if (isTableMissing(status, data, text)) writeMode('local');
          done(readLocalScores(gameNumber, gameName));
        });
      } else {
        done(readLocalScores(gameNumber, gameName));
      }
    });
  }

  function mergeAndSaveLocal(gameNumber, gameName, initials, score, done) {
    var list = readLocalScores(gameNumber, gameName);
    var i;
    var found = -1;
    for (i = 0; i < list.length; i++) {
      if (list[i].initials === initials) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      if (score > list[found].score) {
        list[found].score = score;
        list[found].updated_at = new Date().toISOString();
      }
    } else {
      list.push({ initials: initials, score: score, updated_at: new Date().toISOString() });
    }
    list = sortScores(list);
    writeLocalScores(gameNumber, gameName, list);
    done(list);
  }

  function submitScore(game, initials, score, done) {
    resolveStorageMode(function (mode) {
      if (mode === 'supabase') {
        var lookup = SUPABASE_URL + '/rest/v1/arcade_scores?select=id,score'
          + '&machine_id=eq.' + encodeURIComponent(machine.id)
          + '&game_number=eq.' + encodeURIComponent(String(game.number))
          + '&initials=eq.' + encodeURIComponent(initials);
        xhr('GET', lookup, null, function (ok, status, data, text) {
          if (!ok) {
            if (isTableMissing(status, data, text)) writeMode('local');
            mergeAndSaveLocal(game.number, game.name, initials, score, function (list) {
              trackActivity(game, 'score');
              done(list);
            });
            return;
          }
          var existing = data && data[0] ? data[0] : null;
          if (existing && score <= existing.score) {
            trackActivity(game, 'score');
            getScores(game.number, game.name, done);
            return;
          }
          var payload = {
            machine_id: machine.id,
            game_number: game.number,
            game_name: game.name,
            initials: initials,
            score: score,
            updated_at: new Date().toISOString()
          };
          if (existing && existing.id) {
            var patchUrl = SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(existing.id);
            xhr('PATCH', patchUrl, payload, function () {
              trackActivity(game, 'score');
              getScores(game.number, game.name, done);
            });
          } else {
            xhr('POST', SUPABASE_URL + '/rest/v1/arcade_scores', payload, function () {
              trackActivity(game, 'score');
              getScores(game.number, game.name, done);
            });
          }
        });
      } else {
        mergeAndSaveLocal(game.number, game.name, initials, score, function (list) {
          trackActivity(game, 'score');
          done(list);
        });
      }
    });
  }

  function findGameByNumber(num) {
    var i;
    for (i = 0; i < games.length; i++) {
      if (games[i].number === num) return games[i];
    }
    return null;
  }

  function gamesByNumbers(numbers) {
    var list = [];
    var i;
    var g;
    for (i = 0; i < numbers.length; i++) {
      g = findGameByNumber(numbers[i]);
      if (g) list.push(g);
    }
    return list;
  }

  function trackActivity(game, eventType) {
    if (window.ArcadeActivity && game) {
      ArcadeActivity.track(game.number, game.name, eventType);
    }
  }

  function getScoreCount(gameNumber, gameName, done) {
    resolveStorageMode(function (mode) {
      if (mode === 'supabase') {
        var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=id'
          + '&machine_id=eq.' + encodeURIComponent(machine.id)
          + '&game_number=eq.' + encodeURIComponent(String(gameNumber));
        var req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        req.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_ANON_KEY);
        req.setRequestHeader('Prefer', 'count=exact');
        req.setRequestHeader('Range', '0-0');
        req.onreadystatechange = function () {
          if (req.readyState !== 4) return;
          var count = 0;
          var range = req.getResponseHeader('Content-Range');
          if (range) {
            var parts = range.split('/');
            if (parts.length > 1) count = parseInt(parts[1], 10) || 0;
          }
          if (!count) {
            done(readLocalScores(gameNumber, gameName).length);
            return;
          }
          done(count);
        };
        req.send(null);
      } else {
        done(readLocalScores(gameNumber, gameName).length);
      }
    });
  }

  function formatTopScoreHtml(top) {
    if (top) {
      return '#1<br><strong style="color:#a3e635">' + escapeHtml(top.initials)
        + '</strong><br>' + escapeHtml(String(top.score));
    }
    return '<span class="finder-top-empty">No scores yet</span>';
  }

  function enrichQuickListTopScores(ul, list) {
    var i;
    if (!ul || !list) return;
    for (i = 0; i < list.length; i++) {
      (function (game) {
        var topEl = ul.querySelector('.quick-game-top[data-num="' + game.number + '"]');
        if (!topEl) return;
        var key = game.number + '|' + game.name;
        if (topScoreCache.hasOwnProperty(key)) {
          topEl.innerHTML = formatTopScoreHtml(topScoreCache[key]);
          return;
        }
        getScores(game.number, game.name, function (scores) {
          topScoreCache[key] = scores[0] || null;
          topEl.innerHTML = formatTopScoreHtml(topScoreCache[key]);
        });
      })(list[i]);
    }
  }

  function renderGameQuickList(ul, list, emptyMsg) {
    var html = '';
    var i;
    if (!ul) return;
    if (!list || !list.length) {
      ul.innerHTML = '<li class="champs-loading">' + escapeHtml(emptyMsg || 'Loading...') + '</li>';
      return;
    }
    for (i = 0; i < list.length; i++) {
      html += '<li>' + renderQuickGameRow(list[i]) + '</li>';
    }
    ul.innerHTML = html;
    bindQuickGameButtons(ul);
    enrichQuickListTopScores(ul, list);
  }

  function renderPopularList(list) {
    renderGameQuickList($('popular-list'), list, 'No recent play yet — play a game!');
  }

  function renderClassicPopularList() {
    var list = [];
    if (window.ArcadeActivity && games.length) {
      list = ArcadeActivity.getClassicPopularGames(games, CLASSICS_LIMIT);
    }
    renderClassicsList(list);
  }

  function renderClassicsList(list) {
    renderGameQuickList($('classics-list'), list, 'Loading games...');
  }

  function refreshRankedLists() {
    renderClassicPopularList();
    if (!window.ArcadeActivity) {
      renderPopularList([]);
      return;
    }
    ArcadeActivity.refresh(function () {
      ArcadeActivity.rankRecentGames(games, POPULAR_LIMIT, function (popular) {
        rankedPopularGames = popular || [];
        renderPopularList(rankedPopularGames);
        loadChampions();
      });
    });
  }

  function renderQuickGameRow(game) {
    return '<button type="button" class="quick-game-btn" data-num="' + game.number + '">'
      + '<span class="quick-game-num-wrap">'
      + '<span class="game-num-label">Game Number</span>'
      + '<span class="quick-game-num">#' + game.number + '</span>'
      + '</span>'
      + '<span class="quick-game-name">' + escapeHtml(game.name)
      + '<span class="btn-tap-hint btn-tap-hint-inline">Tap to open</span></span>'
      + '<span class="quick-game-top" data-num="' + game.number + '">...</span>'
      + '</button>';
  }

  function bindQuickGameButtons(container) {
    var buttons = container.querySelectorAll('.quick-game-btn');
    var i;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].onclick = (function (btn) {
        return function () {
          var num = parseInt(btn.getAttribute('data-num'), 10);
          var game = findGameByNumber(num);
          if (game) openLeaderboard(game);
        };
      })(buttons[i]);
    }
  }

  function setChampsTickerHtml(itemsHtml, animate) {
    var ul = $('champs-list');
    if (!ul) return;
    if (!itemsHtml) {
      ul.className = 'champs-ticker-track is-static';
      ul.innerHTML = '<li class="champs-empty">No scores yet — be the first!</li>';
      return;
    }
    if (animate) {
      ul.className = 'champs-ticker-track is-animated';
      ul.innerHTML = itemsHtml + itemsHtml;
    } else {
      ul.className = 'champs-ticker-track is-static';
      ul.innerHTML = itemsHtml;
    }
  }

  function loadChampions() {
    var ul = $('champs-list');
    if (!ul) return;
    var popular = rankedPopularGames;
    var pending;
    var rows;
    var i;
    if (!popular.length) {
      setChampsTickerHtml('', false);
      return;
    }
    ul.className = 'champs-ticker-track is-static';
    ul.innerHTML = '<li class="champs-loading">Loading scores...</li>';
    pending = popular.length;
    rows = [];
    for (i = 0; i < popular.length; i++) {
      (function (game, idx) {
        getScores(game.number, game.name, function (scores) {
          if (scores && scores[0]) {
            rows[idx] = '<li class="champ-ticker-item">'
              + '<span class="champ-game">' + escapeHtml(game.name.toUpperCase()) + '</span>'
              + '<span class="champ-sep">&bull;</span>'
              + '<span class="champ-score"><strong>' + escapeHtml(scores[0].initials)
              + '</strong> &mdash; ' + escapeHtml(String(scores[0].score)) + '</span>'
              + '</li>';
          }
          pending -= 1;
          if (pending <= 0) {
            var html = '';
            var j;
            for (j = 0; j < rows.length; j++) {
              if (rows[j]) html += rows[j];
            }
            setChampsTickerHtml(html, !!html);
          }
        });
      })(popular[i], i);
    }
  }

  function updateSearchUi() {
    var q = trim($('search-input').value);
    var clearBtn = $('search-clear-btn');
    if (clearBtn) {
      clearBtn.style.display = q ? 'block' : 'none';
    }
  }

  function isSearchModalOpen() {
    var modal = $('search-modal');
    return modal && modal.getAttribute('aria-hidden') === 'false';
  }

  function openGameDetail(game) {
    closePopularModal();
    closeClassicsModal();
    closeSubmitModal();
    if (isSearchModalOpen()) {
      tabBeforeGame = 'search-modal';
      closeSearchModal();
    } else {
      tabBeforeGame = activeTabId === 'game' ? tabBeforeGame : activeTabId;
    }
    selectedGame = game;
    trackActivity(game, 'leaderboard');
    $('game-detail-num').innerHTML = '#' + game.number;
    $('game-detail-name').innerHTML = escapeHtml(game.name.toUpperCase());
    $('game-detail-score').innerHTML = 'Loading...';
    $('game-detail-activity').innerHTML = '';
    switchTab('game');
    getScores(game.number, game.name, function (scores) {
      if (scores && scores[0]) {
        $('game-detail-score').innerHTML = '<strong>' + escapeHtml(scores[0].initials)
          + '</strong> &mdash; ' + escapeHtml(String(scores[0].score));
      } else {
        $('game-detail-score').innerHTML = '<span class="game-detail-empty">No scores yet &mdash; be the first!</span>';
      }
    });
    if (window.ArcadeActivity) {
      ArcadeActivity.getGameStats(game.number, function (stats) {
        var el = $('game-detail-activity');
        if (!el) return;
        if (stats.total > 0) {
          el.innerHTML = 'Activity here: <strong>' + stats.total + '</strong>';
        } else {
          el.innerHTML = 'Be the first to play this one here!';
        }
      });
    }
  }

  function clearSearch() {
    var input = $('search-input');
    if (!input) return;
    input.value = '';
    try {
      sessionStorage.removeItem(SEARCH_KEY);
    } catch (e) {}
    if (window.ArcadeActivity) {
      ArcadeActivity.resetSearchTrack();
    }
    $('finder-results').innerHTML = '';
    var empty = $('finder-empty');
    if (empty) {
      empty.style.display = 'none';
      empty.innerHTML = '';
    }
    onSearchInput();
    updateSearchUi();
    input.focus();
  }

  function bindSearchClear() {
    var btn = $('search-clear-btn');
    if (!btn) return;
    btn.onclick = function () {
      clearSearch();
    };
  }

  function bindSearchHints() {
    var buttons = document.querySelectorAll('.search-hint-btn');
    var i;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].onclick = (function (btn) {
        return function () {
          var input = $('search-input');
          if (!input) return;
          input.value = btn.getAttribute('data-query') || '';
          onSearchInput();
    updateSearchUi();
          input.focus();
        };
      })(buttons[i]);
    }
  }

  function bindGameDetailEvents() {
    var back = $('game-detail-back');
    if (back) {
      back.onclick = function () {
        if (tabBeforeGame === 'search-modal') {
          switchTab('find');
          openSearchModal();
          return;
        }
        switchTab(tabBeforeGame === 'game' ? 'find' : tabBeforeGame);
      };
    }
    var scoresBtn = $('game-detail-scores');
    if (scoresBtn) {
      scoresBtn.onclick = function () {
        if (selectedGame) openLeaderboard(selectedGame);
      };
    }
    var submitBtn = $('game-detail-submit');
    if (submitBtn) {
      submitBtn.onclick = function () {
        openSubmitModal(selectedGame);
      };
    }
  }

  function parseSearchQuery(query) {
    var raw = trim(query);
    var lower = raw.toLowerCase();
    var withoutHash = raw.replace(/^#+/, '').trim();
    var numExact = null;
    if (/^\d+$/.test(withoutHash)) {
      numExact = parseInt(withoutHash, 10);
    }
    return {
      raw: raw,
      lower: lower,
      numExact: numExact,
      digits: withoutHash.replace(/\D/g, '')
    };
  }

  function gameMatchesSearch(g, parsed) {
    var numStr = String(g.number);
    var nameLower = g.name.toLowerCase();
    var nameMatch = nameLower.indexOf(parsed.lower) >= 0;
    var numberMatch = false;
    var formattedMatch = false;
    var aliasMatch = false;
    var a;

    if (parsed.numExact !== null && !isNaN(parsed.numExact)) {
      numberMatch = g.number === parsed.numExact || numStr.indexOf(String(parsed.numExact)) >= 0;
    } else if (parsed.digits) {
      numberMatch = numStr.indexOf(parsed.digits) >= 0;
    }

    if (parsed.raw.indexOf('#') >= 0) {
      formattedMatch = ('#' + numStr).indexOf(parsed.lower.replace(/\s/g, '')) >= 0;
    }

    if (g.aliases && g.aliases.length) {
      for (a = 0; a < g.aliases.length; a++) {
        if (g.aliases[a].toLowerCase().indexOf(parsed.lower) >= 0) {
          aliasMatch = true;
          break;
        }
      }
    }

    return nameMatch || numberMatch || formattedMatch || aliasMatch;
  }

  function gameSearchRank(g, parsed) {
    var numStr = String(g.number);
    var nameLower = g.name.toLowerCase();
    if (parsed.numExact !== null && g.number === parsed.numExact) return 0;
    if (parsed.digits && numStr === parsed.digits) return 1;
    if (parsed.digits && numStr.indexOf(parsed.digits) === 0) return 2;
    if (nameLower.indexOf(parsed.lower) === 0) return 3;
    if (parsed.digits && numStr.indexOf(parsed.digits) >= 0) return 4;
    if (nameLower.indexOf(parsed.lower) >= 0) return 5;
    return 6;
  }

  function filterGamesInList(sourceList, query, preserveOrder) {
    var parsed = parseSearchQuery(query);
    var results = [];
    var i;
    if (!parsed.raw || !sourceList || !sourceList.length) return results;
    for (i = 0; i < sourceList.length; i++) {
      if (gameMatchesSearch(sourceList[i], parsed)) {
        results.push(sourceList[i]);
      }
    }
    if (preserveOrder) {
      return results;
    }
    results.sort(function (a, b) {
      var aRank = gameSearchRank(a, parsed);
      var bRank = gameSearchRank(b, parsed);
      if (aRank !== bRank) return aRank - bRank;
      return a.number - b.number;
    });
    return results;
  }

  function searchGames(query) {
    return filterGamesInList(games, query).slice(0, SEARCH_LIMIT);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderFinderResults(list) {
    var ul = $('finder-results');
    var html = '';
    var i;
    ul.innerHTML = '';
    for (i = 0; i < list.length; i++) {
      (function (game) {
        var key = game.number + '|' + game.name;
        var top = topScoreCache[key];
        var topHtml = formatTopScoreHtml(top);
        var li = document.createElement('li');
        li.innerHTML = '<button type="button" class="finder-card" data-num="' + game.number + '">'
          + '<div class="finder-card-inner">'
          + '<span class="finder-num-wrap">'
          + '<span class="game-num-label">Game Number</span>'
          + '<span class="finder-num">#' + game.number + '</span>'
          + '</span>'
          + '<span class="finder-name">' + escapeHtml(game.name.toUpperCase())
          + '<span class="finder-tap btn-tap-hint btn-tap-hint-inline">Tap to open</span></span>'
          + '<span class="finder-top">' + topHtml + '</span>'
          + '</div></button>';
        li.querySelector('button').onclick = function () {
          openGameDetail(game);
        };
        ul.appendChild(li);
        if (!topScoreCache.hasOwnProperty(key)) {
          getScores(game.number, game.name, function (scores) {
            topScoreCache[key] = scores[0] || null;
            var topEl = li.querySelector('.finder-top');
            if (!topEl) return;
            topEl.innerHTML = formatTopScoreHtml(topScoreCache[key]);
          });
        }
      })(list[i]);
    }
  }

  function onSearchInput() {
    var input = $('search-input');
    var q = input.value;
    try {
      sessionStorage.setItem(SEARCH_KEY, q);
    } catch (e) {}
    var results = searchGames(q);
    var empty = $('finder-empty');
    if (trim(q) && results.length === 0) {
      empty.style.display = 'block';
      empty.innerHTML = 'No games match &ldquo;' + escapeHtml(q) + '&rdquo;';
    } else {
      empty.style.display = 'none';
    }
    renderFinderResults(results);
    if (window.ArcadeActivity && results.length) {
      var parsedQ = parseSearchQuery(q);
      var minTrackLen = parsedQ.numExact !== null ? 1 : 2;
      if (trim(q).length >= minTrackLen) {
        ArcadeActivity.trackSearchResults(results, q);
      }
    }
    if (!trim(q) && window.ArcadeActivity) {
      ArcadeActivity.resetSearchTrack();
    }
    updateSearchUi();
  }

  function setPanelVisible(panelId, visible) {
    var panel = $(panelId);
    if (!panel) return;
    if (visible) {
      panel.className = 'tab-panel is-visible';
    } else {
      panel.className = 'tab-panel';
    }
  }

  function switchTab(tabId) {
    activeTabId = tabId;
    setPanelVisible('panel-find', tabId === 'find');
    setPanelVisible('panel-game', tabId === 'game');
    closeSubmitModal();
    fixLayoutAfterResume();
  }

  function fixLayoutAfterResume() {
    setPanelVisible('panel-find', activeTabId === 'find');
    setPanelVisible('panel-game', activeTabId === 'game');
    if (isPhoneLayout()) {
      return;
    }
    var app = $('app');
    var main = document.querySelector('.kiosk-main');
    if (app) {
      app.style.display = 'none';
      if (app.offsetHeight !== undefined) {
        void app.offsetHeight;
      }
      app.style.display = '';
    }
    if (main) {
      main.style.display = 'none';
      if (main.offsetHeight !== undefined) {
        void main.offsetHeight;
      }
      main.style.display = '';
    }
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }

  function showSubmitError(msg) {
    var el = $('submit-error');
    if (!msg) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    el.style.display = 'block';
    el.innerHTML = escapeHtml(msg);
  }

  function clearSubmitCameraWatchdog() {
    if (submitCameraWatchdog) {
      clearTimeout(submitCameraWatchdog);
      submitCameraWatchdog = null;
    }
  }

  function hasNativeScoreCamera() {
    return false;
  }

  function initNativeCameraBridge() {
    window.LegendsKioskNative = {
      onPhoto: function (dataUrl) {
        hideSubmitCameraOverlay();
        clearSubmitCameraWatchdog();
        submitInAppReady = false;
        if (dataUrl) {
          showSubmitPreview(dataUrl);
        } else {
          setSubmitInAppFailedMode();
        }
        fixLayoutAfterResume();
      },
      onPhotoCancel: function () {
        hideSubmitCameraOverlay();
        clearSubmitCameraWatchdog();
        submitInAppReady = false;
        $('submit-start').style.display = 'block';
        fixLayoutAfterResume();
      },
      onPhotoError: function (msg) {
        setSubmitInAppFailedMode();
        showSubmitError(msg || 'Camera error.');
        fixLayoutAfterResume();
      }
    };
  }

  function openNativeScoreCamera() {
    stopSubmitCamera();
    showSubmitError('');
    $('submit-start').style.display = 'none';
    setSubmitCameraStatus(submitCameraOpeningHint());
    showSubmitCameraOverlay();
    try {
      window.LegendsKiosk.openScoreCamera();
    } catch (e) {
      setSubmitInAppFailedMode();
      showSubmitError('Could not open camera.');
    }
  }

  function openSubmitPhotoPicker() {
    showSubmitError('');
    var input = $('submit-photo-input');
    if (!input) return;
    if (submitCameraMode === 'selfie') {
      input.setAttribute('capture', 'user');
    } else {
      input.setAttribute('capture', isPhoneLayout() ? 'environment' : 'user');
    }
    try {
      input.value = '';
    } catch (e) {}
    input.click();
  }

  function setSubmitInAppFailedMode() {
    clearSubmitCameraWatchdog();
    stopSubmitCamera();
    submitInAppReady = false;
    $('submit-start').style.display = 'none';
    setSubmitCameraStatus('Tap Take Photo — fill the frame with the score on screen');
    showSubmitCameraOverlay();
  }

  function setSubmitInAppReadyMode() {
    submitInAppReady = true;
    clearSubmitCameraWatchdog();
    setSubmitCameraStatus(submitScorePhotoHint());
    showSubmitCameraOverlay();
  }

  function resetSubmitSelfieUI() {
    submitSelfieDataUrl = '';
    var section = $('submit-selfie-section');
    var actions = $('submit-selfie-actions');
    var selfiePreview = $('submit-selfie-preview');
    var note = $('submit-selfie-note');
    if (section) {
      section.className = submitPhotoDataUrl ? 'submit-selfie-section' : 'submit-selfie-section is-hidden';
    }
    if (actions) actions.className = 'submit-selfie-actions';
    if (selfiePreview) selfiePreview.className = 'submit-selfie-preview is-hidden';
    if ($('submit-selfie-preview-img')) $('submit-selfie-preview-img').src = '';
    if (note) {
      note.innerHTML = 'Add a selfie if you want your face on the board. Otherwise only your name or initials will show.';
      note.className = 'submit-selfie-note';
    }
  }

  function onSkipSelfie() {
    submitSelfieDataUrl = '';
    if ($('submit-selfie-actions')) $('submit-selfie-actions').className = 'submit-selfie-actions is-hidden';
    if ($('submit-selfie-preview')) $('submit-selfie-preview').className = 'submit-selfie-preview is-hidden';
    if ($('submit-selfie-preview-img')) $('submit-selfie-preview-img').src = '';
    var note = $('submit-selfie-note');
    if (note) {
      note.innerHTML = 'No selfie — your name or initials will show on the leaderboard.';
      note.className = 'submit-selfie-note submit-selfie-note-muted';
    }
    showSubmitError('');
  }

  function showSelfiePreview(dataUrl) {
    stopSubmitCamera();
    hideSubmitCameraOverlay();
    submitSelfieDataUrl = dataUrl;
    if ($('submit-selfie-section')) $('submit-selfie-section').className = 'submit-selfie-section';
    if ($('submit-selfie-actions')) $('submit-selfie-actions').className = 'submit-selfie-actions is-hidden';
    if ($('submit-selfie-preview')) $('submit-selfie-preview').className = 'submit-selfie-preview';
    if ($('submit-selfie-preview-img')) $('submit-selfie-preview-img').src = dataUrl;
    var note = $('submit-selfie-note');
    if (note) {
      note.innerHTML = 'Selfie added — this can appear on the leaderboard with your score.';
      note.className = 'submit-selfie-note';
    }
    fixLayoutAfterResume();
  }

  function resetSubmitReviewUI() {
    var review = $('submit-review');
    var done = $('submit-done');
    var initialsInput = $('submit-player-initials');
    var retake = $('submit-retake-btn');
    var sendBtn = $('submit-send-btn');
    var onScreenCheck = $('submit-initials-on-screen');
    if (review) {
      review.style.display = 'block';
      review.className = 'submit-review';
    }
    if (done) {
      done.style.display = 'none';
      done.className = 'submit-done is-hidden';
    }
    if ($('submit-player-first')) $('submit-player-first').value = '';
    if ($('submit-player-last')) $('submit-player-last').value = '';
    if (initialsInput) initialsInput.value = '';
    if (onScreenCheck) onScreenCheck.checked = false;
    if (retake) retake.style.display = 'block';
    if (sendBtn) sendBtn.disabled = false;
  }

  function resetSubmitView() {
    clearSubmitCameraWatchdog();
    submitInAppReady = false;
    stopSubmitCamera();
    hideSubmitCameraOverlay();
    showSubmitError('');
    submitPhotoDataUrl = '';
    submitSelfieDataUrl = '';
    submitCameraMode = 'score';
    resetSubmitReviewUI();
    clearSubmitSearch();
    $('submit-start').style.display = 'block';
    var preview = $('submit-preview');
    if (preview) {
      preview.style.display = 'none';
      preview.className = 'submit-preview is-hidden';
    }
    $('submit-preview-img').src = '';
    var fileInput = $('submit-photo-input');
    if (fileInput) fileInput.value = '';
  }

  function showSubmitCameraOverlay() {
    var overlay = $('submit-camera-overlay');
    if (!overlay) return;
    overlay.className = 'submit-camera-overlay';
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hideSubmitCameraOverlay() {
    var overlay = $('submit-camera-overlay');
    var active;
    var fallback;
    if (!overlay) return;
    active = document.activeElement;
    if (active && overlay.contains(active)) {
      fallback = $('submit-take-photo') || $('popular-toggle');
      if (fallback && fallback.focus) {
        fallback.focus();
      } else if (active.blur) {
        active.blur();
      }
    }
    overlay.className = 'submit-camera-overlay is-hidden';
    overlay.setAttribute('aria-hidden', 'true');
  }

  function setSubmitCameraStatus(msg) {
    var el = $('submit-camera-status');
    if (el) el.innerHTML = escapeHtml(msg || submitScorePhotoHint());
  }

  function stopStreamOnly(stream) {
    if (!stream) return;
    try {
      var tracks = stream.getTracks ? stream.getTracks() : stream.getVideoTracks();
      var t;
      if (tracks && tracks.length) {
        for (t = 0; t < tracks.length; t++) {
          tracks[t].stop();
        }
      }
    } catch (e) {}
  }

  function isLikelyRearCamera(stream) {
    var tracks;
    var label;
    if (!stream || !stream.getVideoTracks) return false;
    tracks = stream.getVideoTracks();
    if (!tracks || !tracks.length) return false;
    label = (tracks[0].label || '').toLowerCase();
    if (label.indexOf('back') >= 0 || label.indexOf('rear') >= 0 || label.indexOf('environment') >= 0) {
      return true;
    }
    if (label.indexOf('front') >= 0 || label.indexOf('user') >= 0 || label.indexOf('self') >= 0 || label.indexOf('fac') >= 0) {
      return false;
    }
    return false;
  }

  function showSubmitPreview(dataUrl) {
    stopSubmitCamera();
    hideSubmitCameraOverlay();
    $('submit-start').style.display = 'none';
    var preview = $('submit-preview');
    if (preview) {
      preview.style.display = 'block';
      preview.className = 'submit-preview';
    }
    submitPhotoDataUrl = dataUrl;
    resetSubmitReviewUI();
    resetSubmitSelfieUI();
    $('submit-preview-img').src = dataUrl;
    syncSubmitGameSelect();
  }

  function getSubmitSelectedGame() {
    var select = $('submit-game-select');
    if (!select) return selectedGame;
    return findGameByNumber(parseInt(select.value, 10)) || selectedGame;
  }

  function setGameSelectValue(select, game) {
    if (!select || !game) return;
    var val = String(game.number);
    var i;
    select.value = val;
    for (i = 0; i < select.options.length; i++) {
      if (String(select.options[i].value) === val) {
        select.selectedIndex = i;
        return;
      }
    }
  }

  function getLeaderboardPickedGame() {
    var lbSelect = $('lb-game-select');
    if (lbSelect && lbSelect.value) {
      var fromLb = findGameByNumber(parseInt(lbSelect.value, 10));
      if (fromLb) return fromLb;
    }
    return selectedGame || null;
  }

  function syncSubmitGameSelect() {
    var select = $('submit-game-select');
    if (!select || !games.length) return;
    if (selectedGame) {
      setGameSelectValue(select, selectedGame);
    } else {
      selectedGame = findGameByNumber(parseInt(select.value, 10));
    }
  }

  function sendScoreSubmission() {
    var game = getSubmitSelectedGame();
    if (!game) {
      showSubmitError('Pick a game first.');
      return;
    }
    selectedGame = game;
    if (!submitPhotoDataUrl) {
      showSubmitError('Take a photo of your score first.');
      return;
    }
    var initialsOnScreen = $('submit-initials-on-screen') && $('submit-initials-on-screen').checked;
    var firstName = trim($('submit-player-first').value);
    var lastName = trim($('submit-player-last').value);
    var initials = trim($('submit-player-initials').value).toUpperCase().slice(0, 3);
    if (!initialsOnScreen && !firstName && !lastName && !initials) {
      showSubmitError('Enter your first and last name, or your initials.');
      return;
    }
    if (!initialsOnScreen && initials && initials.length === 1 && !firstName && !lastName) {
      showSubmitError('Use at least 2 letters for initials, or add your name.');
      return;
    }
    if (!firstName) firstName = null;
    if (!lastName) lastName = null;
    if (!initials) initials = null;
    showSubmitError('');
    var sendBtn = $('submit-send-btn');
    if (sendBtn) sendBtn.disabled = true;
    if (!window.ArcadeSubmissions) {
      showSubmitError('Submission service not loaded.');
      if (sendBtn) sendBtn.disabled = false;
      return;
    }
    ArcadeSubmissions.compressPhotoDataUrl(submitPhotoDataUrl, 960, 0.72, function (compressedScore) {
      function sendPayload(selfieCompressed) {
        var payload = {
          machine_id: machine.id,
          game_number: game.number,
          game_name: game.name,
          photo_data: compressedScore,
          player_photo_data: selfieCompressed || null,
          player_first_name: firstName || null,
          player_last_name: lastName || null,
          player_initials: initials || null,
          initials_on_screen: !!initialsOnScreen,
          status: 'pending'
        };
        ArcadeSubmissions.submit(payload, function (ok, result) {
          if (sendBtn) sendBtn.disabled = false;
          if (!ok) {
            showSubmitError(typeof result === 'string' ? result : 'Could not send. Try again.');
            return;
          }
          trackActivity(game, 'score');
          var review = $('submit-review');
          var retake = $('submit-retake-btn');
          var doneEl = $('submit-done');
          if (review) review.style.display = 'none';
          if (retake) retake.style.display = 'none';
          if ($('submit-selfie-section')) $('submit-selfie-section').style.display = 'none';
          if (doneEl) {
            doneEl.style.display = 'block';
            doneEl.className = 'submit-done';
          }
        });
      }
      if (submitSelfieDataUrl) {
        ArcadeSubmissions.compressPhotoDataUrl(submitSelfieDataUrl, 640, 0.75, function (compressedSelfie) {
          sendPayload(compressedSelfie);
        });
      } else {
        sendPayload(null);
      }
    });
  }

  function stopSubmitCamera() {
    clearSubmitCameraWatchdog();
    var video = $('submit-video');
    if (video && video._objectUrl && window.URL && window.URL.revokeObjectURL) {
      try {
        window.URL.revokeObjectURL(video._objectUrl);
      } catch (e) {}
      video._objectUrl = null;
    }
    if (submitStream) {
      try {
        var tracks = submitStream.getTracks ? submitStream.getTracks() : submitStream.getVideoTracks();
        var t;
        if (tracks && tracks.length) {
          for (t = 0; t < tracks.length; t++) {
            tracks[t].stop();
          }
        }
      } catch (e2) {}
      submitStream = null;
    }
    if (video) {
      if (video.srcObject !== undefined) {
        video.srcObject = null;
      }
      video.src = '';
    }
  }

  function attachSubmitStream(video, stream) {
    submitStream = stream;
    if (window.URL && window.URL.createObjectURL) {
      try {
        if (video._objectUrl && window.URL.revokeObjectURL) {
          window.URL.revokeObjectURL(video._objectUrl);
        }
        video._objectUrl = window.URL.createObjectURL(stream);
        video.src = video._objectUrl;
      } catch (e) {
        if (video.srcObject !== undefined) {
          video.srcObject = stream;
        }
      }
    } else if (video.srcObject !== undefined) {
      video.srcObject = stream;
    } else if (video.mozSrcObject !== undefined) {
      video.mozSrcObject = stream;
    }
    video.className = 'submit-video submit-video--front';
    updateSubmitVideoMirror(stream);
    video.setAttribute('autoplay', 'autoplay');
    video.setAttribute('playsinline', 'playsinline');
    video.setAttribute('muted', 'muted');
    video.onloadedmetadata = function () {
      try {
        if (video.play) video.play();
      } catch (e2) {}
    };
    try {
      if (video.play) video.play();
    } catch (e3) {}
  }

  function waitForSubmitVideoReady(done) {
    var video = $('submit-video');
    var tries = 0;

    function check() {
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        done(true);
        return;
      }
      tries += 1;
      if (tries >= 24) {
        done(false);
        return;
      }
      try {
        if (video && video.play) video.play();
      } catch (e) {}
      setTimeout(check, 250);
    }

    check();
  }

  function tryGetUserMedia(constraints, timeoutMs, done) {
    var finished = false;
    var timer;

    function finish(err, stream) {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      done(err, stream);
    }

    timer = setTimeout(function () {
      finish(new Error('camera timeout'));
    }, timeoutMs || 5000);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        finish(null, stream);
      }).catch(function (err) {
        finish(err || new Error('camera denied'));
      });
      return;
    }
    var legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (!legacy) {
      finish(new Error('no camera'));
      return;
    }
    legacy.call(navigator, constraints, function (stream) {
      finish(null, stream);
    }, function (err) {
      finish(err || new Error('camera denied'));
    });
  }

  function requestSubmitCameraStream(done) {
    var facing = getSubmitCameraFacing(submitCameraMode);
    var attempts;
    var i = 0;

    if (facing === 'environment') {
      attempts = [
        { video: { facingMode: { exact: 'environment' } }, audio: false },
        { video: { facingMode: 'environment' }, audio: false },
        { video: { mandatory: { facingMode: 'environment' } }, audio: false },
        { video: true, audio: false }
      ];
    } else {
      attempts = [
        { video: { mandatory: { minFacingMode: 'user' } }, audio: false },
        { video: { mandatory: { facingMode: 'user' } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        {
          video: {
            optional: [
              { minFacingMode: 'user' },
              { facingMode: 'user' }
            ]
          },
          audio: false
        },
        { video: true, audio: false }
      ];
    }

    function tryNext(err) {
      if (i >= attempts.length) {
        done(err || new Error(facing + ' camera unavailable'));
        return;
      }
      tryGetUserMedia(attempts[i], 4000, function (tryErr, stream) {
        var attemptIndex = i;
        i += 1;
        if (!stream) {
          tryNext(tryErr);
          return;
        }
        if (facing === 'user' && attemptIndex < attempts.length - 1 && isLikelyRearCamera(stream)) {
          stopStreamOnly(stream);
          tryNext(tryErr);
          return;
        }
        done(null, stream);
      });
    }

    tryNext();
  }

  function startSubmitCamera(mode) {
    submitCameraMode = mode || 'score';
    var video = $('submit-video');
    if (!video) return;

    showSubmitError('');
    $('submit-start').style.display = 'none';
    submitInAppReady = false;

    if (hasNativeScoreCamera()) {
      openNativeScoreCamera();
      return;
    }

    setSubmitCameraStatus(submitCameraOpeningHint());
    showSubmitCameraOverlay();
    clearSubmitCameraWatchdog();
    submitCameraWatchdog = setTimeout(function () {
      setSubmitInAppFailedMode();
    }, 10000);

    if (!navigator.mediaDevices && !(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)) {
      setSubmitInAppFailedMode();
      return;
    }

    requestSubmitCameraStream(function (err, stream) {
      if (err || !stream) {
        setSubmitInAppFailedMode();
        return;
      }
      attachSubmitStream(video, stream);
      waitForSubmitVideoReady(function (ready) {
        if (!ready) {
          setSubmitInAppFailedMode();
          return;
        }
        setSubmitInAppReadyMode();
        fixLayoutAfterResume();
      });
    });
  }

  function startSelfieCamera() {
    startSubmitCamera('selfie');
  }

  function captureSubmitPhoto() {
    var video = $('submit-video');
    if (submitInAppReady && video && video.videoWidth > 0) {
      var canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      try {
        var dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        if (submitCameraMode === 'selfie') {
          showSelfiePreview(dataUrl);
        } else {
          showSubmitPreview(dataUrl);
        }
      } catch (e2) {
        showSubmitError('Could not save photo.');
      }
      return;
    }
    if (hasNativeScoreCamera() && submitCameraMode === 'score') {
      openNativeScoreCamera();
      return;
    }
    openSubmitPhotoPicker();
  }

  function bindSubmitEvents() {
    $('submit-take-photo').onclick = function () {
      startSubmitCamera('score');
    };

    $('submit-photo-input').onchange = function () {
      var input = $('submit-photo-input');
      if (!input.files || !input.files[0]) {
        if (submitCameraMode === 'selfie') {
          showSubmitError('');
        } else {
          setSubmitInAppFailedMode();
        }
        fixLayoutAfterResume();
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (ev.target && ev.target.result) {
          if (submitCameraMode === 'selfie') {
            showSelfiePreview(ev.target.result);
          } else {
            showSubmitPreview(ev.target.result);
          }
        }
        fixLayoutAfterResume();
      };
      reader.onerror = function () {
        showSubmitError('Could not read photo.');
        fixLayoutAfterResume();
      };
      reader.readAsDataURL(input.files[0]);
    };

    $('submit-take-selfie').onclick = startSelfieCamera;
    $('submit-skip-selfie').onclick = onSkipSelfie;
    $('submit-retake-selfie').onclick = startSelfieCamera;
    $('submit-remove-selfie').onclick = resetSubmitSelfieUI;

    $('submit-capture-btn').onclick = captureSubmitPhoto;
    $('submit-cancel-btn').onclick = function () {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      closeSubmitModal();
    };
    $('submit-retake-btn').onclick = function () {
      submitPhotoDataUrl = '';
      resetSubmitSelfieUI();
      resetSubmitReviewUI();
      var preview = $('submit-preview');
      if (preview) {
        preview.style.display = 'none';
        preview.className = 'submit-preview is-hidden';
      }
      $('submit-preview-img').src = '';
      $('submit-start').style.display = 'block';
      startSubmitCamera('score');
    };
    $('submit-done-home').onclick = closeSubmitModal;
    $('submit-send-btn').onclick = sendScoreSubmission;

    var submitSearchInput = $('submit-search-input');
    if (submitSearchInput) {
      submitSearchInput.oninput = onSubmitSearchInput;
      submitSearchInput.onkeyup = onSubmitSearchInput;
    }
    var submitSearchClear = $('submit-search-clear-btn');
    if (submitSearchClear) {
      submitSearchClear.onclick = function () {
        clearSubmitSearch();
      };
    }
  }

  function openSubmitModal(game) {
    closePopularModal();
    closeClassicsModal();
    closeSearchModal();
    closeLeaderboardModal();
    resetSubmitView();
    if (activeTabId !== 'find') {
      activeTabId = 'find';
      setPanelVisible('panel-find', true);
      setPanelVisible('panel-game', false);
    }
    var modal = $('submit-modal');
    var toggle = $('submit-toggle');
    if (!modal) return;
    modal.className = 'submit-modal';
    modal.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (game) {
      selectSubmitGame(game);
    } else {
      syncSubmitGameSelect();
    }
    fixLayoutAfterResume();
  }

  function closeSubmitModal() {
    var modal = $('submit-modal');
    var toggle = $('submit-toggle');
    var closeBtn = $('submit-modal-close');
    if (!modal || modal.getAttribute('aria-hidden') === 'true') return;
    resetSubmitView();
    if (closeBtn && document.activeElement && modal.contains(document.activeElement)) {
      if (toggle && toggle.focus) {
        toggle.focus();
      } else if (document.activeElement.blur) {
        document.activeElement.blur();
      }
    }
    modal.className = 'submit-modal is-hidden';
    modal.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function bindSubmitModal() {
    var toggle = $('submit-toggle');
    var modal = $('submit-modal');
    var closeBtn = $('submit-modal-close');
    var backdrop = $('submit-modal-backdrop');
    if (!toggle || !modal) return;
    toggle.onclick = function () {
      openSubmitModal(null);
    };
    if (closeBtn) closeBtn.onclick = closeSubmitModal;
    if (backdrop) backdrop.onclick = closeSubmitModal;
  }

  function setLbResultsVisible(show) {
    var block = $('lb-results-block');
    var prompt = $('lb-submit-prompt');
    if (block) {
      if (show) {
        block.className = 'lb-results-block';
      } else {
        block.className = 'lb-results-block is-hidden';
      }
    }
    if (prompt) {
      if (show) {
        prompt.className = 'lb-submit-prompt';
      } else {
        prompt.className = 'lb-submit-prompt is-hidden';
      }
    }
  }

  function setLbSearchingMode(active) {
    var panel = document.querySelector('.leaderboard-modal-panel');
    if (!panel) return;
    var cls = panel.className || '';
    if (active) {
      if (cls.indexOf('is-lb-searching') < 0) {
        panel.className = cls + ' is-lb-searching';
      }
    } else if (cls.indexOf('is-lb-searching') >= 0) {
      panel.className = cls.replace(/\s*is-lb-searching/g, '');
    }
  }

  function openLeaderboardModal() {
    closeSubmitModal();
    var modal = $('leaderboard-modal');
    var toggle = $('leaderboard-toggle');
    if (!modal) return;
    var searching = !!trim($('lb-search-input') && $('lb-search-input').value);
    if (searching) {
      setLbSearchingMode(true);
      setLbResultsVisible(false);
    } else if (selectedGame) {
      setLbSearchingMode(false);
      setLbResultsVisible(true);
      loadLeaderboard();
    } else {
      setLbSearchingMode(false);
      setLbResultsVisible(false);
    }
    modal.className = 'leaderboard-modal';
    modal.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  function closeLeaderboardModal() {
    var modal = $('leaderboard-modal');
    var toggle = $('leaderboard-toggle');
    var closeBtn = $('leaderboard-modal-close');
    if (!modal) return;
    if (closeBtn && document.activeElement && modal.contains(document.activeElement)) {
      if (toggle && toggle.focus) {
        toggle.focus();
      } else if (document.activeElement.blur) {
        document.activeElement.blur();
      }
    }
    clearLbSearch();
    setLbSearchingMode(false);
    modal.className = 'leaderboard-modal is-hidden';
    modal.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function openLeaderboard(game) {
    closePopularModal();
    closeClassicsModal();
    closeSearchModal();
    if (game) {
      selectLeaderboardGame(game);
    }
    if (activeTabId !== 'find') {
      switchTab('find');
    }
    openLeaderboardModal();
  }

  function clearLbSearch() {
    var input = $('lb-search-input');
    var clearBtn = $('lb-search-clear-btn');
    var empty = $('lb-search-empty');
    var results = $('lb-search-results');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (empty) {
      empty.style.display = 'none';
      empty.innerHTML = '';
    }
    if (results) results.innerHTML = '';
  }

  function updateLbSearchUi() {
    var q = trim($('lb-search-input').value);
    var clearBtn = $('lb-search-clear-btn');
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
  }

  function selectLeaderboardGame(game) {
    if (!game) return;
    selectedGame = game;
    setGameSelectValue($('lb-game-select'), game);
    trackActivity(game, 'leaderboard');
    clearLbSearch();
    setLbSearchingMode(false);
    setLbResultsVisible(true);
    loadLeaderboard();
  }

  function renderLbSearchResults(list) {
    var ul = $('lb-search-results');
    var html = '';
    var i;
    if (!ul) return;
    ul.innerHTML = '';
    for (i = 0; i < list.length; i++) {
      (function (game) {
        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lb-search-result-btn';
        btn.innerHTML = '<span class="lb-search-result-num">#' + game.number + '</span>'
          + '<span class="lb-search-result-name">' + escapeHtml(game.name)
          + '<span class="btn-tap-hint btn-tap-hint-inline">Tap to select</span></span>';
        btn.onclick = function () {
          selectLeaderboardGame(game);
        };
        li.appendChild(btn);
        ul.appendChild(li);
      })(list[i]);
    }
  }

  function onLbSearchInput() {
    var q = trim($('lb-search-input').value);
    var results = searchGames(q);
    var empty = $('lb-search-empty');
    updateLbSearchUi();
    if (!q) {
      setLbSearchingMode(false);
      if (empty) empty.style.display = 'none';
      renderLbSearchResults([]);
      setLbResultsVisible(!!selectedGame);
      return;
    }
    setLbSearchingMode(true);
    setLbResultsVisible(false);
    if (!results.length) {
      if (empty) {
        empty.style.display = 'block';
        empty.innerHTML = 'No games match &ldquo;' + escapeHtml(q) + '&rdquo;';
      }
      renderLbSearchResults([]);
      return;
    }
    if (empty) empty.style.display = 'none';
    renderLbSearchResults(results);
  }

  function clearSubmitSearch() {
    var input = $('submit-search-input');
    var clearBtn = $('submit-search-clear-btn');
    var empty = $('submit-search-empty');
    var results = $('submit-search-results');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (empty) {
      empty.style.display = 'none';
      empty.innerHTML = '';
    }
    if (results) results.innerHTML = '';
  }

  function updateSubmitSearchUi() {
    var q = trim($('submit-search-input').value);
    var clearBtn = $('submit-search-clear-btn');
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
  }

  function selectSubmitGame(game) {
    if (!game) return;
    selectedGame = game;
    setGameSelectValue($('submit-game-select'), game);
    clearSubmitSearch();
  }

  function renderSubmitSearchResults(list) {
    var ul = $('submit-search-results');
    var i;
    if (!ul) return;
    ul.innerHTML = '';
    for (i = 0; i < list.length; i++) {
      (function (game) {
        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lb-search-result-btn';
        btn.innerHTML = '<span class="lb-search-result-num">#' + game.number + '</span>'
          + '<span class="lb-search-result-name">' + escapeHtml(game.name)
          + '<span class="btn-tap-hint btn-tap-hint-inline">Tap to select</span></span>';
        btn.onclick = function () {
          selectSubmitGame(game);
        };
        li.appendChild(btn);
        ul.appendChild(li);
      })(list[i]);
    }
  }

  function onSubmitSearchInput() {
    var q = trim($('submit-search-input').value);
    var results = searchGames(q);
    var empty = $('submit-search-empty');
    updateSubmitSearchUi();
    if (!q) {
      if (empty) empty.style.display = 'none';
      renderSubmitSearchResults([]);
      return;
    }
    if (!results.length) {
      if (empty) {
        empty.style.display = 'block';
        empty.innerHTML = 'No games match &ldquo;' + escapeHtml(q) + '&rdquo;';
      }
      renderSubmitSearchResults([]);
      return;
    }
    if (empty) empty.style.display = 'none';
    renderSubmitSearchResults(results);
  }

  function populateSubmitGameSelect() {
    var select = $('submit-game-select');
    if (!select) return;
    var html = '';
    var i;
    for (i = 0; i < games.length; i++) {
      var g = games[i];
      html += '<option value="' + g.number + '">#'
        + g.number + ' — ' + escapeHtml(g.name) + '</option>';
    }
    select.innerHTML = html;
    select.onchange = function () {
      var num = parseInt(select.value, 10);
      var game = findGameByNumber(num);
      if (game) {
        selectedGame = game;
        clearSubmitSearch();
      }
    };
    syncSubmitGameSelect();
  }

  function populateGameSelect() {
    var select = $('lb-game-select');
    var html = '';
    var i;
    for (i = 0; i < games.length; i++) {
      var g = games[i];
      html += '<option value="' + g.number + '">#'
        + g.number + ' — ' + escapeHtml(g.name) + '</option>';
    }
    select.innerHTML = html;
    select.onchange = function () {
      var num = parseInt(select.value, 10);
      var game = findGameByNumber(num);
      if (game) {
        selectLeaderboardGame(game);
      }
    };
    if (games.length) {
      selectedGame = games[0];
    }
    populateSubmitGameSelect();
  }

  function loadLeaderboard() {
    if (!selectedGame) return;
    $('lb-title').innerHTML = '<span class="game-num-label">Game Number</span>'
      + '<span class="lb-head-num">#' + selectedGame.number + '</span> '
      + '<span class="lb-head-name">' + escapeHtml(selectedGame.name) + '</span>';
    $('lb-status').innerHTML = 'Loading...';
    $('lb-list').innerHTML = '';
    getScores(selectedGame.number, selectedGame.name, function (scores) {
      if (!scores.length) {
        $('lb-status').innerHTML = '<span class="lb-empty-msg">No scores yet — be the first!</span>';
        return;
      }
      $('lb-status').innerHTML = '';
      var html = '';
      var i;
      for (i = 0; i < scores.length; i++) {
        html += '<li class="lb-row' + (i === 0 ? ' lb-row-top' : '') + '"><span class="lb-rank">' + (i + 1) + '</span>'
          + '<span class="lb-ini">' + escapeHtml(scores[i].initials) + '</span>'
          + '<span class="lb-score">' + escapeHtml(String(scores[i].score)) + '</span></li>';
      }
      $('lb-list').innerHTML = html;
    });
  }

  function openPopularModal() {
    closeSubmitModal();
    var modal = $('popular-modal');
    var toggle = $('popular-toggle');
    if (!modal) return;
    modal.className = 'popular-modal';
    modal.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  function closePopularModal() {
    var modal = $('popular-modal');
    var toggle = $('popular-toggle');
    var closeBtn = $('popular-modal-close');
    if (!modal) return;
    if (closeBtn && document.activeElement && modal.contains(document.activeElement)) {
      if (toggle && toggle.focus) {
        toggle.focus();
      } else if (document.activeElement.blur) {
        document.activeElement.blur();
      }
    }
    modal.className = 'popular-modal is-hidden';
    modal.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function bindPopularModal() {
    var toggle = $('popular-toggle');
    var modal = $('popular-modal');
    var closeBtn = $('popular-modal-close');
    var backdrop = $('popular-modal-backdrop');
    if (!toggle || !modal) return;
    toggle.onclick = openPopularModal;
    if (closeBtn) closeBtn.onclick = closePopularModal;
    if (backdrop) backdrop.onclick = closePopularModal;
  }

  function openClassicsModal() {
    closeSubmitModal();
    var modal = $('classics-modal');
    var toggle = $('classics-toggle');
    if (!modal) return;
    renderClassicPopularList();
    modal.className = 'classics-modal';
    modal.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  function closeClassicsModal() {
    var modal = $('classics-modal');
    var toggle = $('classics-toggle');
    var closeBtn = $('classics-modal-close');
    if (!modal) return;
    if (closeBtn && document.activeElement && modal.contains(document.activeElement)) {
      if (toggle && toggle.focus) {
        toggle.focus();
      } else if (document.activeElement.blur) {
        document.activeElement.blur();
      }
    }
    modal.className = 'classics-modal is-hidden';
    modal.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function bindClassicsModal() {
    var toggle = $('classics-toggle');
    var modal = $('classics-modal');
    var closeBtn = $('classics-modal-close');
    var backdrop = $('classics-modal-backdrop');
    if (!toggle || !modal) return;
    toggle.onclick = openClassicsModal;
    if (closeBtn) closeBtn.onclick = closeClassicsModal;
    if (backdrop) backdrop.onclick = closeClassicsModal;
  }

  function openSearchModal() {
    closeSubmitModal();
    var modal = $('search-modal');
    var toggle = $('search-toggle');
    if (!modal) return;
    updateSearchUi();
    onSearchInput();
    modal.className = 'search-modal';
    modal.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    setTimeout(function () {
      var input = $('search-input');
      if (input && input.focus) input.focus();
    }, 150);
  }

  function closeSearchModal() {
    var modal = $('search-modal');
    var toggle = $('search-toggle');
    var closeBtn = $('search-modal-close');
    if (!modal) return;
    if (closeBtn && document.activeElement && modal.contains(document.activeElement)) {
      if (toggle && toggle.focus) {
        toggle.focus();
      } else if (document.activeElement.blur) {
        document.activeElement.blur();
      }
    }
    modal.className = 'search-modal is-hidden';
    modal.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function bindSearchModal() {
    var toggle = $('search-toggle');
    var modal = $('search-modal');
    var closeBtn = $('search-modal-close');
    var backdrop = $('search-modal-backdrop');
    if (!toggle || !modal) return;
    toggle.onclick = openSearchModal;
    if (closeBtn) closeBtn.onclick = closeSearchModal;
    if (backdrop) backdrop.onclick = closeSearchModal;
  }

  function bindLeaderboardModal() {
    var toggle = $('leaderboard-toggle');
    var modal = $('leaderboard-modal');
    var closeBtn = $('leaderboard-modal-close');
    var backdrop = $('leaderboard-modal-backdrop');
    if (!toggle || !modal) return;
    toggle.onclick = openLeaderboardModal;
    if (closeBtn) closeBtn.onclick = closeLeaderboardModal;
    if (backdrop) backdrop.onclick = closeLeaderboardModal;
    var lbSubmitBtn = $('lb-submit-score-btn');
    if (lbSubmitBtn) {
      lbSubmitBtn.onclick = function () {
        openSubmitModal(getLeaderboardPickedGame());
      };
    }
  }

  function updateStatusBar() {
    var gamesEls = document.querySelectorAll('.arcade-status-games');
    var onlineEls = document.querySelectorAll('.arcade-status-online');
    var indicators = document.querySelectorAll('.arcade-online-indicator');
    var i;
    if (!gamesEls.length || !games.length) return;
    for (i = 0; i < gamesEls.length; i++) {
      gamesEls[i].innerHTML = games.length + ' games';
    }
    resolveStorageMode(function (mode) {
      var isOnline = mode === 'supabase';
      var onlineText = isOnline ? 'online' : 'ready';
      for (i = 0; i < onlineEls.length; i++) {
        onlineEls[i].innerHTML = onlineText;
        onlineEls[i].className = isOnline ? 'arcade-status-online' : 'arcade-status-online is-ready';
      }
      for (i = 0; i < gamesEls.length; i++) {
        gamesEls[i].className = isOnline ? 'arcade-status-games' : 'arcade-status-games is-ready';
      }
      for (i = 0; i < indicators.length; i++) {
        indicators[i].className = isOnline ? 'arcade-online-indicator is-online' : 'arcade-online-indicator';
      }
    });
  }

  function bindEvents() {
    var navButtons = document.querySelectorAll('[data-tab]');
    var i;
    for (i = 0; i < navButtons.length; i++) {
      navButtons[i].onclick = (function (btn) {
        return function () {
          switchTab(btn.getAttribute('data-tab'));
        };
      })(navButtons[i]);
    }

    $('search-input').oninput = onSearchInput;
    $('search-input').onkeyup = onSearchInput;

    $('lb-search-input').oninput = onLbSearchInput;
    $('lb-search-input').onkeyup = onLbSearchInput;
    $('lb-search-clear-btn').onclick = function () {
      clearLbSearch();
      onLbSearchInput();
    };
  }

  function loadGames(done) {
    var req = new XMLHttpRequest();
    req.open('GET', 'games.json', true);
    req.onreadystatechange = function () {
      if (req.readyState !== 4) return;
      if (req.status >= 200 && req.status < 300) {
        try {
          var payload = JSON.parse(req.responseText);
          machine = payload.machine;
          games = payload.games || [];
          done(true);
        } catch (e) {
          done(false);
        }
      } else {
        done(false);
      }
    };
    req.send(null);
  }

  function showMaintenanceScreen(message) {
    var app = $('app');
    if (!app) return;
    app.innerHTML = '<div class="maintenance-screen">'
      + '<h1>Arcade Temporarily Unavailable</h1>'
      + '<p>' + escapeHtml(message || 'Check back soon!') + '</p>'
      + '</div>';
  }

  function applyMachineSettings(row) {
    if (!row || !row.price_text) return;
    var price = trim(row.price_text);
    var banner = $('quarter-banner');
    var homeStep = $('how-to-step-quarters');
    var modalStep = $('machine-instr-quarters');
    var insertText = 'INSERT ' + price.toUpperCase();
    if (banner) banner.innerHTML = insertText;
    if (homeStep) {
      homeStep.innerHTML = '<span class="step-num">4</span> ' + escapeHtml(insertText) + ' &mdash; START';
    }
    if (modalStep) {
      modalStep.innerHTML = '<span class="step-num">5</span> Insert quarters &mdash; <strong>'
        + escapeHtml(insertText) + '</strong>';
    }
  }

  function hideCabinetHintIfMissing() {
    var img = $('cabinet-hint-img');
    var openBtn = $('cabinet-hint-open');
    if (!img) return;
    img.onerror = function () {
      if (openBtn) openBtn.style.display = 'none';
    };
  }

  function bindCabinetHintModal() {
    var openBtn = $('cabinet-hint-open');
    var modal = $('cabinet-hint-modal');
    var closeBtn = $('cabinet-hint-modal-close');
    var backdrop = $('cabinet-hint-modal-backdrop');
    if (!openBtn || !modal) return;
    function closeModal() {
      var active = document.activeElement;
      if (active && modal.contains(active)) {
        if (openBtn && openBtn.focus) {
          openBtn.focus();
        } else if (active.blur) {
          active.blur();
        }
      }
      modal.className = 'cabinet-hint-modal is-hidden';
      modal.setAttribute('aria-hidden', 'true');
    }
    function openModal() {
      modal.className = 'cabinet-hint-modal';
      modal.setAttribute('aria-hidden', 'false');
    }
    openBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;
  }

  function bindMachineInstructionsModal() {
    var openBtn = $('how-to-open');
    var modal = $('machine-instructions-modal');
    var closeBtn = $('machine-instructions-close');
    var backdrop = $('machine-instructions-backdrop');
    if (!openBtn || !modal) return;
    function closeModal() {
      var active = document.activeElement;
      if (active && modal.contains(active)) {
        if (openBtn && openBtn.focus) {
          openBtn.focus();
        } else if (active.blur) {
          active.blur();
        }
      }
      modal.className = 'machine-instructions-modal is-hidden';
      modal.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
    }
    function openModal() {
      modal.className = 'machine-instructions-modal';
      modal.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
    }
    openBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;
  }

  function loadMachineSettings(done) {
    if (!machine || !machine.id) {
      if (done) done();
      return;
    }
    var url = SUPABASE_URL + '/rest/v1/arcade_machines?select=maintenance_mode,maintenance_message,price_text,is_active'
      + '&id=eq.' + encodeURIComponent(machine.id);
    xhr('GET', url, null, function (ok, status, data) {
      if (ok && data && data[0]) {
        var row = data[0];
        if (row.maintenance_mode || row.is_active === false) {
          showMaintenanceScreen(row.maintenance_message);
          return;
        }
        applyMachineSettings(row);
      }
      if (done) done();
    });
  }

  function bindResumeHandlers() {
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        setTimeout(fixLayoutAfterResume, 100);
      }
    }, false);
    window.addEventListener('pageshow', function () {
      setTimeout(fixLayoutAfterResume, 100);
    }, false);
    window.addEventListener('orientationchange', function () {
      setTimeout(fixLayoutAfterResume, 200);
    }, false);
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (isPhoneLayout()) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fixLayoutAfterResume, 150);
    }, false);
  }

  function init() {
    loadGames(function (ok) {
      if (!ok) {
        document.body.innerHTML = '<p style="color:#fff;padding:20px;text-align:center">Could not load game list. Check connection.</p>';
        return;
      }
        var nameEl = $('machine-name');
        var fullTitle = escapeHtml(machine.name) + ' Arcade';
        var longSpan = nameEl && nameEl.querySelector ? nameEl.querySelector('.title-long') : null;
        var shortSpan = nameEl && nameEl.querySelector ? nameEl.querySelector('.title-short') : null;
        if (longSpan && shortSpan) {
          longSpan.innerHTML = fullTitle;
          shortSpan.innerHTML = fullTitle;
        } else if (nameEl) {
          nameEl.innerHTML = fullTitle;
        }
        if (isPhoneLayout() && document.body) {
          document.body.className += ' is-phone';
        }
      loadMachineSettings(function () {
        if (window.ArcadeActivity) {
          ArcadeActivity.init(machine, resolveStorageMode);
        }
        populateGameSelect();
        updateStatusBar();
        renderPopularList([]);
        renderClassicsList([]);
        refreshRankedLists();
        hideCabinetHintIfMissing();
        bindCabinetHintModal();
        bindMachineInstructionsModal();
        bindPopularModal();
        bindClassicsModal();
        bindSearchModal();
        bindLeaderboardModal();
        bindSubmitModal();
        bindSearchClear();
        bindSearchHints();
        bindGameDetailEvents();
        bindEvents();
        initNativeCameraBridge();
        bindSubmitEvents();
        bindResumeHandlers();
        resetSubmitView();
        try {
          var saved = sessionStorage.getItem(SEARCH_KEY);
          if (saved) {
            $('search-input').value = saved;
            onSearchInput();
          }
        } catch (e) {}
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
