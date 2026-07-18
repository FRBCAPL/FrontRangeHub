/* Legends Arcade admin — scores tab (ES5) */
(function (global) {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';

  var games = [];
  var machineId = 'legends-cabinet-1';
  var inited = false;

  function $(id) {
    return document.getElementById(id);
  }

  function trim(str) {
    return (str || '').replace(/^\s+|\s+$/g, '');
  }

  function normalizeName(str) {
    return trim(str).replace(/\s+/g, ' ').toUpperCase().slice(0, 40);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      callback(ok, req.status, data);
    };
    req.send(body ? JSON.stringify(body) : null);
  }

  function populateGameSelect() {
    var select = $('admin-scores-game-select');
    if (!select || !games.length) return;
    var html = '';
    var i;
    for (i = 0; i < games.length; i++) {
      var g = games[i];
      html += '<option value="' + g.number + '">#' + g.number + ' — ' + escapeHtml(g.name) + '</option>';
    }
    select.innerHTML = html;
  }

  function loadGames(done) {
    var req = new XMLHttpRequest();
    req.open('GET', 'games.json', true);
    req.onreadystatechange = function () {
      if (req.readyState !== 4) return;
      if (req.status >= 200 && req.status < 300) {
        try {
          var payload = JSON.parse(req.responseText);
          games = payload.games || [];
          if (payload.machine && payload.machine.id) {
            machineId = payload.machine.id;
          }
          populateGameSelect();
          if (done) done(true);
        } catch (e) {
          if (done) done(false);
        }
      } else if (done) {
        done(false);
      }
    };
    req.send(null);
  }

  function getSelectedGame() {
    var select = $('admin-scores-game-select');
    if (!select) return null;
    var num = parseInt(select.value, 10);
    var i;
    for (i = 0; i < games.length; i++) {
      if (games[i].number === num) return games[i];
    }
    return games[0] || null;
  }

  function setScoresStatus(msg) {
    var el = $('admin-scores-status');
    if (el) el.innerHTML = msg || '';
  }

  function pushScoreToOptiplex(game, displayName, score, done) {
    if (!window.ArcadeOptiplex) {
      if (done) done({ ok: false, skipped: true });
      return;
    }
    window.ArcadeOptiplex.setStaffPin(window.ArcadeOptiplex.getStaffPin());
    window.ArcadeOptiplex.addScore({
      machineId: machineId,
      gameNumber: game.number,
      gameName: game.name,
      initials: displayName,
      score: score
    }, function (result) {
      if (done) done(result || { ok: false });
    });
  }

  function deleteScoreOnOptiplex(game, displayName, done) {
    if (!window.ArcadeOptiplex || !game) {
      if (done) done({ ok: false, skipped: true });
      return;
    }
    window.ArcadeOptiplex.setStaffPin(window.ArcadeOptiplex.getStaffPin());
    window.ArcadeOptiplex.deleteScore({
      machineId: machineId,
      gameNumber: game.number,
      initials: displayName
    }, function (result) {
      if (done) done(result || { ok: false });
    });
  }

  function describeOptiplexResult(result, okCloudMsg) {
    if (result && result.ok) return okCloudMsg + ' TV updated.';
    if (result && result.reason === 'mixed_content') {
      return okCloudMsg + ' Open admin on Optiplex LAN (http://…) or wait ~5 min for TV pull.';
    }
    if (result && (result.skipped || !result.ok)) {
      return okCloudMsg + ' Set Optiplex URL in Tools (or wait ~5 min for TV pull).';
    }
    return okCloudMsg;
  }

  function renderScores(rows) {
    var ul = $('admin-score-list');
    if (!ul) return;
    if (!rows || !rows.length) {
      ul.innerHTML = '<li class="admin-empty">No scores for this game.</li>';
      return;
    }
    var html = '';
    var i;
    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      html += '<li class="admin-score-row" data-id="' + escapeHtml(row.id) + '"'
        + ' data-initials="' + escapeHtml(row.initials) + '"'
        + ' data-score="' + row.score + '">'
        + '<span class="admin-score-ini">' + escapeHtml(row.initials) + '</span>'
        + '<span class="admin-score-val">' + escapeHtml(String(row.score)) + '</span>'
        + '<button type="button" class="admin-btn admin-btn-inline" data-score-action="edit">Edit</button>'
        + '<button type="button" class="admin-btn admin-btn-inline danger" data-score-action="delete">Delete</button>'
        + '</li>';
    }
    ul.innerHTML = html;
  }

  function loadScores() {
    var game = getSelectedGame();
    if (!game) {
      setScoresStatus('Could not load game list.');
      return;
    }
    setScoresStatus('Loading...');
    var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=id,initials,score,updated_at'
      + '&machine_id=eq.' + encodeURIComponent(machineId)
      + '&game_number=eq.' + encodeURIComponent(String(game.number))
      + '&order=score.desc';
    xhr('GET', url, null, function (ok, status, data) {
      if (!ok) {
        setScoresStatus('Could not load scores.');
        renderScores([]);
        return;
      }
      dedupeCloudRows(data || [], function (cleaned, removed) {
        var msg = cleaned.length ? cleaned.length + ' score(s)' : '';
        if (removed) msg += ' (merged ' + removed + ' duplicate' + (removed === 1 ? '' : 's') + ')';
        setScoresStatus(msg);
        renderScores(cleaned);
      });
    });
  }

  /** Merge case-variant duplicates (e.g. Alex S / ALEX S); keep highest score. */
  function dedupeCloudRows(rows, done) {
    var byName = {};
    var i;
    var removed = 0;
    var keepers = [];
    var toDelete = [];

    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      var key = normalizeName(row.initials);
      if (!key) continue;
      if (!byName[key]) {
        byName[key] = row;
      } else {
        var prev = byName[key];
        if (Number(row.score) > Number(prev.score)) {
          toDelete.push(prev);
          byName[key] = row;
        } else {
          toDelete.push(row);
        }
      }
    }

    for (var k in byName) {
      if (byName.hasOwnProperty(k)) keepers.push(byName[k]);
    }
    keepers.sort(function (a, b) { return Number(b.score) - Number(a.score); });

    function deleteNext(idx) {
      if (idx >= toDelete.length) {
        // Normalize kept row initials to UPPERCASE when they still differ
        var normalizeNext = function (ni) {
          if (ni >= keepers.length) {
            done(keepers, removed);
            return;
          }
          var kr = keepers[ni];
          var want = normalizeName(kr.initials);
          if (kr.initials === want) {
            normalizeNext(ni + 1);
            return;
          }
          xhr('PATCH', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(kr.id), {
            initials: want,
            updated_at: new Date().toISOString()
          }, function () {
            kr.initials = want;
            normalizeNext(ni + 1);
          });
        };
        normalizeNext(0);
        return;
      }
      removed += 1;
      xhr('DELETE', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(toDelete[idx].id), null, function () {
        deleteNext(idx + 1);
      });
    }

    if (!toDelete.length) {
      // Still normalize casing on display rows
      var onlyNorm = function (ni) {
        if (ni >= keepers.length) {
          done(keepers, 0);
          return;
        }
        var kr = keepers[ni];
        var want = normalizeName(kr.initials);
        if (kr.initials === want) {
          onlyNorm(ni + 1);
          return;
        }
        xhr('PATCH', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(kr.id), {
          initials: want,
          updated_at: new Date().toISOString()
        }, function () {
          kr.initials = want;
          onlyNorm(ni + 1);
        });
      };
      onlyNorm(0);
      return;
    }
    deleteNext(0);
  }

  function deleteScore(id, initials) {
    if (!window.confirm('Delete score for ' + initials + '?')) return;
    var game = getSelectedGame();
    var norm = normalizeName(initials);
    xhr('DELETE', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(id), null, function (ok) {
      if (!ok) {
        window.alert('Delete failed.');
        return;
      }
      deleteScoreOnOptiplex(game, norm, function (opt) {
        setScoresStatus(describeOptiplexResult(opt, 'Deleted ' + norm + '.'));
        loadScores();
      });
    });
  }

  function editScore(li) {
    var id = li.getAttribute('data-id');
    var oldIni = li.getAttribute('data-initials') || '';
    var oldScore = li.getAttribute('data-score') || '';
    var nameVal = normalizeName(window.prompt('Name on leaderboard:', oldIni));
    if (!nameVal) return;
    var scoreStr = trim(window.prompt('Score:', oldScore));
    var score = parseInt(scoreStr, 10);
    if (!score || score <= 0) return;
    var game = getSelectedGame();
    var oldNorm = normalizeName(oldIni);
    xhr('PATCH', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(id), {
      initials: nameVal,
      score: score,
      updated_at: new Date().toISOString()
    }, function (ok) {
      if (!ok) {
        window.alert('Update failed.');
        return;
      }
      function afterOptiplex(opt) {
        setScoresStatus(describeOptiplexResult(opt, 'Score updated.'));
        loadScores();
      }
      if (nameVal !== oldNorm) {
        deleteScoreOnOptiplex(game, oldNorm, function () {
          pushScoreToOptiplex(game, nameVal, score, afterOptiplex);
        });
      } else {
        pushScoreToOptiplex(game, nameVal, score, afterOptiplex);
      }
    });
  }

  function addScore() {
    var game = getSelectedGame();
    var nameEl = $('admin-add-score-name');
    var scoreEl = $('admin-add-score-value');
    if (!game) {
      setScoresStatus('Choose a game first.');
      return;
    }
    var displayName = normalizeName(nameEl ? nameEl.value : '');
    var score = parseInt(trim(scoreEl ? scoreEl.value : ''), 10);
    if (!displayName || !score || score <= 0) {
      setScoresStatus('Enter a name and score greater than zero.');
      return;
    }
    setScoresStatus('Saving...');
    var listUrl = SUPABASE_URL + '/rest/v1/arcade_scores?select=id,initials,score'
      + '&machine_id=eq.' + encodeURIComponent(machineId)
      + '&game_number=eq.' + encodeURIComponent(String(game.number));
    xhr('GET', listUrl, null, function (ok, status, data) {
      var rows = (ok && data) ? data : [];
      var matches = [];
      var i;
      for (i = 0; i < rows.length; i++) {
        if (normalizeName(rows[i].initials) === displayName) matches.push(rows[i]);
      }
      var payload = {
        machine_id: machineId,
        game_number: game.number,
        game_name: game.name,
        initials: displayName,
        score: score,
        updated_at: new Date().toISOString()
      };

      function finish(opt) {
        if (nameEl) nameEl.value = '';
        if (scoreEl) scoreEl.value = '';
        setScoresStatus(describeOptiplexResult(opt, 'Saved score for ' + displayName + '.'));
        loadScores();
      }

      function deleteExtras(keepId, idx, then) {
        if (idx >= matches.length) {
          then();
          return;
        }
        if (matches[idx].id === keepId) {
          deleteExtras(keepId, idx + 1, then);
          return;
        }
        xhr('DELETE', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(matches[idx].id), null, function () {
          deleteExtras(keepId, idx + 1, then);
        });
      }

      if (matches.length) {
        var keep = matches[0];
        for (i = 1; i < matches.length; i++) {
          if (Number(matches[i].score) > Number(keep.score)) keep = matches[i];
        }
        xhr('PATCH', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(keep.id), payload, function (patchOk) {
          if (!patchOk) {
            setScoresStatus('Could not update score.');
            return;
          }
          deleteExtras(keep.id, 0, function () {
            pushScoreToOptiplex(game, displayName, score, finish);
          });
        });
      } else {
        xhr('POST', SUPABASE_URL + '/rest/v1/arcade_scores', payload, function (postOk) {
          if (!postOk) {
            setScoresStatus('Could not add score.');
            return;
          }
          pushScoreToOptiplex(game, displayName, score, finish);
        });
      }
    });
  }

  function bindEvents() {
    var refreshBtn = $('admin-scores-refresh-btn');
    var select = $('admin-scores-game-select');
    var list = $('admin-score-list');
    var addBtn = $('admin-add-score-btn');
    if (refreshBtn) refreshBtn.onclick = loadScores;
    if (addBtn) addBtn.onclick = addScore;
    if (select) select.onchange = loadScores;
    if (list) {
      list.onclick = function (e) {
        var target = e.target || e.srcElement;
        if (!target || !target.getAttribute) return;
        var action = target.getAttribute('data-score-action');
        if (!action) return;
        var li = target;
        while (li && li.className.indexOf('admin-score-row') < 0) {
          li = li.parentNode;
        }
        if (!li) return;
        if (action === 'delete') {
          deleteScore(li.getAttribute('data-id'), li.getAttribute('data-initials'));
        } else if (action === 'edit') {
          editScore(li);
        }
      };
    }
  }

  global.ArcadeAdminScores = {
    init: function () {
      if (!inited) {
        bindEvents();
        inited = true;
      }
      loadGames(function (ok) {
        if (ok) loadScores();
        else setScoresStatus('Could not load games.json');
      });
    },
    refresh: loadScores
  };
}(window));
