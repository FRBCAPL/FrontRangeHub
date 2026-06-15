/* Legends Arcade Lite Admin — ES5, PIN gate. Change ADMIN_PIN below. */
(function () {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var ADMIN_PIN = '8675';
  var SESSION_KEY = 'frph-arcade-admin-unlock';
  var MACHINE_ID = 'legends-cabinet-1';

  var machine = null;
  var games = [];
  var selectedGame = null;
  var activeTab = 'scores';

  function $(id) {
    return document.getElementById(id);
  }

  function trim(str) {
    return (str || '').replace(/^\s+|\s+$/g, '');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setStatus(msg) {
    $('admin-status').innerHTML = escapeHtml(msg || '');
  }

  function setPanelVisible(panelId, visible) {
    var panel = $(panelId);
    if (!panel) return;
    panel.className = visible ? 'admin-panel is-visible' : 'admin-panel';
  }

  function switchTab(tabId) {
    var tabs = document.querySelectorAll('.admin-tab');
    var i;
    activeTab = tabId;
    for (i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-tab') === tabId) {
        tabs[i].className = 'admin-tab active';
      } else {
        tabs[i].className = 'admin-tab';
      }
    }
    setPanelVisible('panel-scores', tabId === 'scores');
    setPanelVisible('panel-cabinet', tabId === 'cabinet');
    setPanelVisible('panel-tools', tabId === 'tools');
    if (tabId === 'scores') {
      loadScores();
    }
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

  function isUnlocked() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function unlock() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {}
    $('login').style.display = 'none';
    $('app').style.display = 'block';
    bootAdmin();
  }

  function lock() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    $('app').style.display = 'none';
    $('login').style.display = 'block';
    $('pin-input').value = '';
  }

  function tryLogin() {
    var pin = $('pin-input').value;
    if (pin === ADMIN_PIN) {
      $('pin-error').style.display = 'none';
      unlock();
    } else {
      $('pin-error').style.display = 'block';
      $('pin-error').innerHTML = 'Wrong PIN';
    }
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

  function populateGameSelect() {
    var select = $('game-select');
    var html = '';
    var i;
    for (i = 0; i < games.length; i++) {
      html += '<option value="' + games[i].number + '">#' + games[i].number + ' — ' + escapeHtml(games[i].name) + '</option>';
    }
    select.innerHTML = html;
    selectedGame = games[0] || null;
    select.onchange = function () {
      var num = parseInt(select.value, 10);
      var j;
      for (j = 0; j < games.length; j++) {
        if (games[j].number === num) {
          selectedGame = games[j];
          loadScores();
          break;
        }
      }
    };
  }

  function patchScoreEntry(row, nextInitials, nextScore, done) {
    var ini = trim(nextInitials).toUpperCase().slice(0, 3);
    if (!ini || !nextScore || nextScore <= 0) {
      setStatus('Invalid initials or score.');
      if (done) done(false);
      return;
    }

    function applyPatch() {
      var patchUrl = SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(row.id);
      xhr('PATCH', patchUrl, {
        initials: ini,
        score: nextScore,
        updated_at: new Date().toISOString()
      }, function (ok) {
        if (done) done(ok);
      });
    }

    if (ini !== row.initials) {
      var lookupUrl = SUPABASE_URL + '/rest/v1/arcade_scores?select=id'
        + '&machine_id=eq.' + encodeURIComponent(MACHINE_ID)
        + '&game_number=eq.' + encodeURIComponent(String(selectedGame.number))
        + '&initials=eq.' + encodeURIComponent(ini);
      xhr('GET', lookupUrl, null, function (ok, status, data) {
        if (ok && data && data[0] && data[0].id !== row.id) {
          setStatus('Those initials already have a score. Delete or edit that entry first.');
          if (done) done(false);
          return;
        }
        applyPatch();
      });
      return;
    }

    applyPatch();
  }

  function loadScores() {
    if (!selectedGame) return;
    setStatus('Loading scores...');
    var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=id,initials,score,updated_at'
      + '&machine_id=eq.' + encodeURIComponent(MACHINE_ID)
      + '&game_number=eq.' + encodeURIComponent(String(selectedGame.number))
      + '&order=score.desc&limit=50';
    xhr('GET', url, null, function (ok, status, data) {
      var ul = $('score-list');
      ul.innerHTML = '';
      if (!ok || !data || !data.length) {
        setStatus(ok ? 'No scores for this game.' : 'Could not load scores.');
        ul.innerHTML = '<li class="admin-note">No scores</li>';
        return;
      }
      setStatus('');
      var i;
      for (i = 0; i < data.length; i++) {
        (function (row) {
          var li = document.createElement('li');
          li.className = 'admin-score-row';
          li.innerHTML = '<span class="admin-ini">' + escapeHtml(row.initials) + '</span>'
            + '<span class="admin-score-val">' + escapeHtml(String(row.score)) + '</span>';
          var editBtn = document.createElement('button');
          editBtn.className = 'admin-btn small';
          editBtn.innerHTML = 'Edit';
          editBtn.onclick = function () {
            var rawIni = window.prompt('Initials (3 letters):', row.initials);
            if (rawIni === null) return;
            var rawScore = window.prompt('Score:', String(row.score));
            if (rawScore === null) return;
            var next = parseInt(rawScore, 10);
            patchScoreEntry(row, rawIni, next, function (ok) {
              setStatus(ok ? 'Score updated.' : 'Update failed. Run arcade-admin-migration.sql?');
              if (ok) loadScores();
            });
          };
          var delBtn = document.createElement('button');
          delBtn.className = 'admin-btn small danger';
          delBtn.innerHTML = 'Delete';
          delBtn.onclick = function () {
            if (!window.confirm('Delete ' + row.initials + '?')) return;
            var delUrl = SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(row.id);
            xhr('DELETE', delUrl, null, function (ok3) {
              setStatus(ok3 ? 'Deleted.' : 'Delete failed. Run arcade-admin-migration.sql?');
              loadScores();
            });
          };
          li.appendChild(editBtn);
          li.appendChild(delBtn);
          ul.appendChild(li);
        })(data[i]);
      }
    });
  }

  function loadCabinetForm() {
    var url = SUPABASE_URL + '/rest/v1/arcade_machines?select=maintenance_mode,maintenance_message,price_text,name'
      + '&id=eq.' + encodeURIComponent(MACHINE_ID);
    xhr('GET', url, null, function (ok, status, data) {
      if (!ok || !data || !data[0]) return;
      var row = data[0];
      $('machine-label').innerHTML = escapeHtml(row.name || 'Legends Arcade');
      $('maintenance-mode').checked = !!row.maintenance_mode;
      $('maintenance-message').value = row.maintenance_message
        || 'Arcade cabinet is temporarily down for maintenance. Check back soon!';
      $('price-text').value = row.price_text || '2 quarters ($0.50)';
    });
  }

  function saveCabinet() {
    var payload = {
      maintenance_mode: $('maintenance-mode').checked,
      maintenance_message: trim($('maintenance-message').value),
      price_text: trim($('price-text').value),
      updated_at: new Date().toISOString()
    };
    var url = SUPABASE_URL + '/rest/v1/arcade_machines?id=eq.' + encodeURIComponent(MACHINE_ID);
    xhr('PATCH', url, payload, function (ok) {
      setStatus(ok ? 'Cabinet settings saved.' : 'Save failed. Run arcade-admin-migration.sql in Supabase.');
    });
  }

  function bootAdmin() {
    $('reload-kiosk').href = './?t=' + String(new Date().getTime());
    loadGames(function (ok) {
      if (!ok) {
        setStatus('Could not load games.json');
        return;
      }
      populateGameSelect();
      loadCabinetForm();
      loadScores();
    });
  }

  function init() {
    var tabButtons = document.querySelectorAll('.admin-tab');
    var i;
    for (i = 0; i < tabButtons.length; i++) {
      tabButtons[i].onclick = (function (btn) {
        return function () {
          switchTab(btn.getAttribute('data-tab'));
        };
      })(tabButtons[i]);
    }
    $('pin-submit').onclick = tryLogin;
    $('pin-input').onkeyup = function (e) {
      if (e && e.keyCode === 13) tryLogin();
    };
    $('logout-btn').onclick = lock;
    $('refresh-scores').onclick = loadScores;
    $('save-cabinet').onclick = saveCabinet;
    if (isUnlocked()) {
      unlock();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
