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
      setScoresStatus((data && data.length) ? data.length + ' score(s)' : '');
      renderScores(data || []);
    });
  }

  function deleteScore(id, initials) {
    if (!window.confirm('Delete score for ' + initials + '?')) return;
    xhr('DELETE', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(id), null, function (ok) {
      if (!ok) {
        window.alert('Delete failed.');
        return;
      }
      setScoresStatus('Deleted ' + initials + '.');
      loadScores();
    });
  }

  function editScore(li) {
    var id = li.getAttribute('data-id');
    var oldIni = li.getAttribute('data-initials') || '';
    var oldScore = li.getAttribute('data-score') || '';
    var nameVal = trim(window.prompt('Name on leaderboard:', oldIni));
    if (!nameVal) return;
    nameVal = nameVal.slice(0, 40);
    var scoreStr = trim(window.prompt('Score:', oldScore));
    var score = parseInt(scoreStr, 10);
    if (!score || score <= 0) return;
    xhr('PATCH', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(id), {
      initials: nameVal,
      score: score,
      updated_at: new Date().toISOString()
    }, function (ok) {
      if (!ok) {
        window.alert('Update failed.');
        return;
      }
      setScoresStatus('Score updated.');
      loadScores();
    });
  }

  function bindEvents() {
    var refreshBtn = $('admin-scores-refresh-btn');
    var select = $('admin-scores-game-select');
    var list = $('admin-score-list');
    if (refreshBtn) refreshBtn.onclick = loadScores;
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
