/* Legends Arcade Lite Kiosk — ES5 for Android 4.4 KitKat WebView */
(function () {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var LOCAL_KEY = 'frph-arcade-scores';
  var MODE_KEY = 'frph-arcade-supabase-mode';
  var SEARCH_KEY = 'frph-arcade-search-query';
  var POPULAR_EXPAND_KEY = 'frph-arcade-popular-expanded';
  var TOP_LIMIT = 10;
  var SEARCH_LIMIT = 25;
  var CLASSICS_LIMIT = 37;
  var POPULAR_LIMIT = 10;

  var machine = null;
  var games = [];
  var rankedPopularGames = [];
  var storageMode = null;
  var selectedGame = null;
  var topScoreCache = {};
  var submitStream = null;
  var submitCameraWatchdog = null;
  var activeTabId = 'find';
  var tabBeforeGame = 'find';

  function $(id) {
    return document.getElementById(id);
  }

  function trim(str) {
    return (str || '').replace(/^\s+|\s+$/g, '');
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
    if (!window.ArcadeActivity || !games.length) {
      renderTop50List([]);
      return;
    }
    renderTop50List(ArcadeActivity.getClassicPopularGames(games, CLASSICS_LIMIT));
  }

  function renderTop50List(list) {
    renderGameQuickList($('top50-list'), list, 'Loading games...');
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
      + '<span class="quick-game-name">' + escapeHtml(game.name) + '</span>'
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

  function openGameDetail(game) {
    tabBeforeGame = activeTabId === 'game' ? tabBeforeGame : activeTabId;
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
        switchTab(tabBeforeGame === 'game' ? 'search' : tabBeforeGame);
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
        switchTab('submit');
      };
    }
  }

  function searchGames(query) {
    var q = trim(query).toLowerCase();
    var results = [];
    var i;
    if (!q) return results;
    for (i = 0; i < games.length; i++) {
      var g = games[i];
      var nameMatch = g.name.toLowerCase().indexOf(q) >= 0;
      var numberMatch = String(g.number).indexOf(q) >= 0;
      var aliasMatch = false;
      var a;
      if (g.aliases && g.aliases.length) {
        for (a = 0; a < g.aliases.length; a++) {
          if (g.aliases[a].toLowerCase().indexOf(q) >= 0) {
            aliasMatch = true;
            break;
          }
        }
      }
      if (nameMatch || numberMatch || aliasMatch) {
        results.push(g);
      }
    }
    results.sort(function (a, b) {
      var aStarts = a.name.toLowerCase().indexOf(q) === 0 ? 0 : 1;
      var bStarts = b.name.toLowerCase().indexOf(q) === 0 ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.number - b.number;
    });
    return results.slice(0, SEARCH_LIMIT);
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
          + '<span class="finder-tap">TAP TO VIEW</span></span>'
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
    if (window.ArcadeActivity && trim(q).length >= 2 && results.length) {
      ArcadeActivity.trackSearchResults(results, q);
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
    setPanelVisible('panel-search', tabId === 'search');
    setPanelVisible('panel-game', tabId === 'game');
    setPanelVisible('panel-top50', tabId === 'top50');
    setPanelVisible('panel-submit', tabId === 'submit');
    setPanelVisible('panel-leaderboards', tabId === 'leaderboards');
    if (tabId === 'leaderboards' && selectedGame) {
      loadLeaderboard();
    }
    if (tabId === 'top50') {
      renderClassicPopularList();
    }
    if (tabId === 'search') {
      updateSearchUi();
      setTimeout(function () {
        var input = $('search-input');
        if (input) input.focus();
      }, 150);
    }

    if (tabId !== 'submit') {
      resetSubmitView();
    }
    fixLayoutAfterResume();
  }

  function fixLayoutAfterResume() {
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
    setPanelVisible('panel-find', activeTabId === 'find');
    setPanelVisible('panel-search', activeTabId === 'search');
    setPanelVisible('panel-game', activeTabId === 'game');
    setPanelVisible('panel-top50', activeTabId === 'top50');
    setPanelVisible('panel-submit', activeTabId === 'submit');
    setPanelVisible('panel-leaderboards', activeTabId === 'leaderboards');
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

  function shouldPreferNativeRearCamera() {
    var ua = navigator.userAgent || '';
    if (ua.indexOf('Android 4') >= 0) return true;
    if (!navigator.mediaDevices && !(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)) {
      return true;
    }
    return false;
  }

  function fallbackToNativeRearCamera() {
    clearSubmitCameraWatchdog();
    stopSubmitCamera();
    hideSubmitCameraOverlay();
    $('submit-start').style.display = 'none';
    openRearPhotoPicker();
  }

  function resetSubmitView() {
    clearSubmitCameraWatchdog();
    stopSubmitCamera();
    hideSubmitCameraOverlay();
    showSubmitError('');
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
    if (!overlay) return;
    overlay.className = 'submit-camera-overlay is-hidden';
    overlay.setAttribute('aria-hidden', 'true');
  }

  function setSubmitCameraStatus(msg) {
    var el = $('submit-camera-status');
    if (el) el.innerHTML = escapeHtml(msg || 'Point at the score screen');
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

  function isLikelyFrontCamera(stream) {
    var tracks;
    var label;
    if (!stream || !stream.getVideoTracks) return false;
    tracks = stream.getVideoTracks();
    if (!tracks || !tracks.length) return false;
    label = (tracks[0].label || '').toLowerCase();
    if (label.indexOf('front') >= 0 || label.indexOf('user') >= 0 || label.indexOf('self') >= 0 || label.indexOf('fac') >= 0) {
      return true;
    }
    if (label.indexOf('back') >= 0 || label.indexOf('rear') >= 0 || label.indexOf('environment') >= 0) {
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
    $('submit-preview-img').src = dataUrl;
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
    video.className = 'submit-video';
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
    var attempts = [
      { video: { mandatory: { minFacingMode: 'environment' } }, audio: false },
      { video: { mandatory: { facingMode: 'environment' } }, audio: false },
      { video: { facingMode: 'environment' }, audio: false },
      {
        video: {
          optional: [
            { minFacingMode: 'environment' },
            { facingMode: 'environment' }
          ]
        },
        audio: false
      }
    ];
    var i = 0;

    function tryNext(err) {
      if (i >= attempts.length) {
        done(err || new Error('rear camera unavailable'));
        return;
      }
      tryGetUserMedia(attempts[i], 4000, function (tryErr, stream) {
        i += 1;
        if (!stream) {
          tryNext(tryErr);
          return;
        }
        if (isLikelyFrontCamera(stream)) {
          stopStreamOnly(stream);
          tryNext(tryErr);
          return;
        }
        done(null, stream);
      });
    }

    tryNext();
  }

  function startSubmitCamera() {
    var video = $('submit-video');
    if (!video) return;

    showSubmitError('');
    $('submit-start').style.display = 'none';

    if (shouldPreferNativeRearCamera()) {
      fallbackToNativeRearCamera();
      return;
    }

    setSubmitCameraStatus('Opening camera...');
    showSubmitCameraOverlay();
    clearSubmitCameraWatchdog();
    submitCameraWatchdog = setTimeout(function () {
      fallbackToNativeRearCamera();
    }, 10000);

    requestSubmitCameraStream(function (err, stream) {
      if (err || !stream) {
        fallbackToNativeRearCamera();
        return;
      }
      attachSubmitStream(video, stream);
      waitForSubmitVideoReady(function (ready) {
        if (!ready) {
          fallbackToNativeRearCamera();
          return;
        }
        clearSubmitCameraWatchdog();
        setSubmitCameraStatus('Point at the score screen');
        fixLayoutAfterResume();
      });
    });
  }

  function openRearPhotoPicker() {
    showSubmitError('');
    var input = $('submit-photo-input');
    if (!input) return;
    input.setAttribute('capture', 'environment');
    try {
      input.value = '';
    } catch (e) {}
    input.click();
  }

  function captureSubmitPhoto() {
    var video = $('submit-video');
    if (!video || !video.videoWidth) {
      fallbackToNativeRearCamera();
      return;
    }
    var canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    try {
      showSubmitPreview(canvas.toDataURL('image/jpeg', 0.9));
    } catch (e2) {
      showSubmitError('Could not save photo.');
    }
  }

  function bindSubmitEvents() {
    $('submit-take-photo').onclick = function () {
      startSubmitCamera();
    };

    $('submit-photo-input').onchange = function () {
      var input = $('submit-photo-input');
      if (!input.files || !input.files[0]) {
        resetSubmitView();
        fixLayoutAfterResume();
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (ev.target && ev.target.result) {
          showSubmitPreview(ev.target.result);
        }
        fixLayoutAfterResume();
      };
      reader.onerror = function () {
        showSubmitError('Could not read photo.');
        fixLayoutAfterResume();
      };
      reader.readAsDataURL(input.files[0]);
    };

    $('submit-capture-btn').onclick = captureSubmitPhoto;
    $('submit-cancel-btn').onclick = function () {
      resetSubmitView();
      switchTab('find');
    };
    $('submit-retake-btn').onclick = resetSubmitView;
    $('submit-go-leaderboard').onclick = function () {
      switchTab('leaderboards');
    };
  }

  function openLeaderboard(game) {
    selectedGame = game;
    $('lb-game-select').value = String(game.number);
    trackActivity(game, 'leaderboard');
    switchTab('leaderboards');
    loadLeaderboard();
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
      var j;
      for (j = 0; j < games.length; j++) {
        if (games[j].number === num) {
          selectedGame = games[j];
          trackActivity(selectedGame, 'leaderboard');
          loadLeaderboard();
          break;
        }
      }
    };
    if (games.length) {
      selectedGame = games[0];
    }
  }

  function loadLeaderboard() {
    if (!selectedGame) return;
    $('lb-title').innerHTML = '<span class="game-num-label">Game Number</span>'
      + '<span class="lb-head-num">#' + selectedGame.number + '</span> '
      + '<span class="lb-head-name">' + escapeHtml(selectedGame.name) + ' &mdash; Legends Leaderboard</span>';
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
        html += '<li class="lb-row"><span class="lb-rank">' + (i + 1) + '</span>'
          + '<span class="lb-ini">' + escapeHtml(scores[i].initials) + '</span>'
          + '<span class="lb-score">' + escapeHtml(String(scores[i].score)) + '</span></li>';
      }
      $('lb-list').innerHTML = html;
    });
  }

  function initPopularExpand() {
    try {
      if (!sessionStorage.getItem(POPULAR_EXPAND_KEY)) {
        setPopularExpanded(true);
        sessionStorage.setItem(POPULAR_EXPAND_KEY, '1');
      }
    } catch (e) {}
  }

  function updateStatusBar() {
    var el = $('arcade-status');
    if (!el || !games.length) return;
    resolveStorageMode(function (mode) {
      var status = mode === 'supabase' ? 'Online' : 'Ready';
      el.innerHTML = games.length + ' Games &bull; ' + status;
    });
  }

  function setPopularExpanded(expanded) {
    var block = $('popular-block');
    var toggle = $('popular-toggle');
    if (!block || !toggle) return;
    if (expanded) {
      block.className = 'popular-block is-expanded';
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      block.className = 'popular-block is-collapsed';
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  function bindPopularToggle() {
    var toggle = $('popular-toggle');
    if (!toggle) return;
    toggle.onclick = function () {
      var block = $('popular-block');
      var open = block && block.className.indexOf('is-expanded') < 0;
      setPopularExpanded(open);
    };
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

    $('lb-form').onsubmit = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (!selectedGame) return false;
      var initials = trim($('lb-initials').value).toUpperCase().slice(0, 3);
      var score = parseInt($('lb-score').value, 10);
      if (!initials || !score || score <= 0) {
        $('lb-form-status').innerHTML = 'Enter initials and a valid score.';
        return false;
      }
      $('lb-form-status').innerHTML = 'Saving...';
      submitScore(selectedGame, initials, score, function () {
        $('lb-initials').value = '';
        $('lb-score').value = '';
        $('lb-form-status').innerHTML = 'Nice! Score saved!';
        topScoreCache = {};
        loadLeaderboard();
        refreshRankedLists();
        onSearchInput();
    updateSearchUi();
      });
      return false;
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
    var step1 = document.querySelector('.how-to-big-steps li');
    var text = 'INSERT ' + price.toUpperCase();
    if (banner) banner.innerHTML = text;
    if (step1) {
      step1.innerHTML = '<span class="step-num">1</span> ' + escapeHtml(text);
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
  }

  function init() {
    loadGames(function (ok) {
      if (!ok) {
        document.body.innerHTML = '<p style="color:#fff;padding:20px;text-align:center">Could not load game list. Check connection.</p>';
        return;
      }
      $('machine-name').innerHTML = escapeHtml(machine.name) + ' Arcade';
      loadMachineSettings(function () {
        if (window.ArcadeActivity) {
          ArcadeActivity.init(machine, resolveStorageMode);
        }
        populateGameSelect();
        updateStatusBar();
        initPopularExpand();
        renderPopularList([]);
        renderTop50List([]);
        refreshRankedLists();
        updateStatusBar();
        hideCabinetHintIfMissing();
        bindCabinetHintModal();
        bindPopularToggle();
        bindSearchClear();
        bindSearchHints();
        bindGameDetailEvents();
        bindEvents();
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
