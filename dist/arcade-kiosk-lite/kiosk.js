/* Legends Arcade Lite Kiosk — ES5 for Android 4.4 KitKat WebView */
(function () {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var LOCAL_KEY = 'frph-arcade-scores';
  var MODE_KEY = 'frph-arcade-supabase-mode';
  var SEARCH_KEY = 'frph-arcade-search-query';
  var TOP_LIMIT = 10;
  var SEARCH_LIMIT = 25;

  var machine = null;
  var games = [];
  var storageMode = null;
  var selectedGame = null;
  var topScoreCache = {};
  var submitStream = null;

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
            mergeAndSaveLocal(game.number, game.name, initials, score, done);
            return;
          }
          var existing = data && data[0] ? data[0] : null;
          if (existing && score <= existing.score) {
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
              getScores(game.number, game.name, done);
            });
          } else {
            xhr('POST', SUPABASE_URL + '/rest/v1/arcade_scores', payload, function () {
              getScores(game.number, game.name, done);
            });
          }
        });
      } else {
        mergeAndSaveLocal(game.number, game.name, initials, score, done);
      }
    });
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
        var topHtml;
        if (top) {
          topHtml = '#1<br><strong style="color:#a3e635">' + escapeHtml(top.initials)
            + '</strong><br>' + escapeHtml(String(top.score));
        } else {
          topHtml = '<span class="finder-top-empty">No scores yet</span>';
        }
        var li = document.createElement('li');
        li.innerHTML = '<button type="button" class="finder-card" data-num="' + game.number + '">'
          + '<div class="finder-card-inner">'
          + '<span class="finder-num">#' + game.number + '</span>'
          + '<span class="finder-name">' + escapeHtml(game.name.toUpperCase()) + '</span>'
          + '<span class="finder-top">' + topHtml + '</span>'
          + '</div></button>';
        li.querySelector('button').onclick = function () {
          openLeaderboard(game);
        };
        ul.appendChild(li);
        if (!topScoreCache.hasOwnProperty(key)) {
          getScores(game.number, game.name, function (scores) {
            topScoreCache[key] = scores[0] || null;
            var topEl = li.querySelector('.finder-top');
            if (!topEl) return;
            if (scores[0]) {
              topEl.innerHTML = '#1<br><strong style="color:#a3e635">' + escapeHtml(scores[0].initials)
                + '</strong><br>' + escapeHtml(String(scores[0].score));
            }
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
  }

  function switchTab(tabId) {
    var tabs = document.querySelectorAll('.kiosk-tab');
    var i;
    for (i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-tab') === tabId) {
        tabs[i].className = 'kiosk-tab active';
      } else {
        tabs[i].className = 'kiosk-tab';
      }
    }
    $('panel-find').style.display = tabId === 'find' ? '' : 'none';
    $('panel-submit').style.display = tabId === 'submit' ? '' : 'none';
    $('panel-leaderboards').style.display = tabId === 'leaderboards' ? '' : 'none';
    if (tabId === 'leaderboards' && selectedGame) {
      loadLeaderboard();
    }
    if (tabId !== 'submit') {
      stopSubmitCamera();
    }
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

  function resetSubmitView() {
    stopSubmitCamera();
    showSubmitError('');
    $('submit-start').style.display = 'block';
    $('submit-camera-wrap').style.display = 'none';
    $('submit-preview').style.display = 'none';
    $('submit-preview-img').src = '';
    var fileInput = $('submit-photo-input');
    if (fileInput) fileInput.value = '';
  }

  function showSubmitPreview(dataUrl) {
    stopSubmitCamera();
    $('submit-start').style.display = 'none';
    $('submit-camera-wrap').style.display = 'none';
    $('submit-preview').style.display = 'block';
    $('submit-preview-img').src = dataUrl;
  }

  function stopSubmitCamera() {
    if (submitStream) {
      try {
        var tracks = submitStream.getTracks ? submitStream.getTracks() : submitStream.getVideoTracks();
        var t;
        if (tracks && tracks.length) {
          for (t = 0; t < tracks.length; t++) {
            tracks[t].stop();
          }
        }
      } catch (e) {}
      submitStream = null;
    }
    var video = $('submit-video');
    if (video) {
      if (video.srcObject !== undefined) {
        video.srcObject = null;
      }
      video.src = '';
    }
  }

  function openRearPhotoPicker() {
    showSubmitError('');
    var input = $('submit-photo-input');
    if (!input) return;
    /* Native camera app — capture="environment" requests rear camera on Android */
    input.setAttribute('capture', 'environment');
    try {
      input.value = '';
    } catch (e) {}
    input.click();
  }

  function captureSubmitPhoto() {
    var video = $('submit-video');
    if (!video || !video.videoWidth) return;
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
      /* Prefer native camera app (rear) — in-browser preview often defaults to selfie */
      openRearPhotoPicker();
    };

    $('submit-photo-input').onchange = function () {
      var input = $('submit-photo-input');
      if (!input.files || !input.files[0]) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (ev.target && ev.target.result) {
          showSubmitPreview(ev.target.result);
        }
      };
      reader.onerror = function () {
        showSubmitError('Could not read photo.');
      };
      reader.readAsDataURL(input.files[0]);
    };

    $('submit-capture-btn').onclick = captureSubmitPhoto;
    $('submit-cancel-btn').onclick = resetSubmitView;
    $('submit-retake-btn').onclick = resetSubmitView;
    $('submit-go-leaderboard').onclick = function () {
      switchTab('leaderboards');
    };
  }

  function openLeaderboard(game) {
    selectedGame = game;
    $('lb-game-select').value = String(game.number);
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
    $('lb-title').innerHTML = escapeHtml(selectedGame.name) + ' — Legends Leaderboard';
    $('lb-status').innerHTML = 'Loading...';
    $('lb-list').innerHTML = '';
    getScores(selectedGame.number, selectedGame.name, function (scores) {
      if (!scores.length) {
        $('lb-status').innerHTML = 'No scores yet. Be the first!';
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

  function bindEvents() {
    var tabButtons = document.querySelectorAll('.kiosk-tab');
    var i;
    for (i = 0; i < tabButtons.length; i++) {
      tabButtons[i].onclick = (function (btn) {
        return function () {
          switchTab(btn.getAttribute('data-tab'));
        };
      })(tabButtons[i]);
    }

    $('how-to-toggle').onclick = function () {
      var steps = $('how-to-steps');
      var open = steps.style.display === 'none';
      steps.style.display = open ? 'block' : 'none';
      $('how-to-chevron').innerHTML = open ? '&#9650;' : '&#9660;';
      $('how-to-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    };

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
        $('lb-form-status').innerHTML = 'Score saved!';
        topScoreCache = {};
        loadLeaderboard();
        onSearchInput();
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

  function init() {
    loadGames(function (ok) {
      if (!ok) {
        document.body.innerHTML = '<p style="color:#fff;padding:20px;text-align:center">Could not load game list. Check connection.</p>';
        return;
      }
      $('machine-name').innerHTML = escapeHtml(machine.name);
      $('machine-location').innerHTML = escapeHtml(machine.location);
      $('game-count').innerHTML = games.length + ' games';
      populateGameSelect();
      bindEvents();
      bindSubmitEvents();
      resetSubmitView();
      try {
        var saved = sessionStorage.getItem(SEARCH_KEY);
        if (saved) {
          $('search-input').value = saved;
          onSearchInput();
        }
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
