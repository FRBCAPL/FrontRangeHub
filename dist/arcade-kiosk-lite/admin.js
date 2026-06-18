/* Legends Arcade lite admin — pending photo submissions */
(function () {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var STAFF_PIN = '2580';
  var SESSION_KEY = 'frph-arcade-admin-unlocked';
  var MACHINE_ID = 'legends-cabinet-1';

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
      callback(ok, req.status, data, req.responseText);
    };
    req.send(body ? JSON.stringify(body) : null);
  }

  function setStatus(msg) {
    $('admin-status').innerHTML = msg || '';
  }

  function showPanel() {
    $('admin-gate').className = 'admin-gate is-hidden';
    $('admin-panel').className = 'admin-panel';
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {}
    loadPending();
  }

  function tryUnlock() {
    var pin = trim($('admin-pin-input').value);
    var err = $('admin-gate-error');
    if (pin !== STAFF_PIN) {
      err.style.display = 'block';
      err.innerHTML = 'Wrong PIN.';
      return;
    }
    err.style.display = 'none';
    showPanel();
  }

  function publishScore(gameNumber, gameName, initials, score, done) {
    var lookup = SUPABASE_URL + '/rest/v1/arcade_scores?select=id,score'
      + '&machine_id=eq.' + encodeURIComponent(MACHINE_ID)
      + '&game_number=eq.' + encodeURIComponent(String(gameNumber))
      + '&initials=eq.' + encodeURIComponent(initials);
    xhr('GET', lookup, null, function (ok, status, data) {
      var existing = ok && data && data[0] ? data[0] : null;
      if (existing && score <= existing.score) {
        done(true);
        return;
      }
      var payload = {
        machine_id: MACHINE_ID,
        game_number: gameNumber,
        game_name: gameName,
        initials: initials,
        score: score,
        updated_at: new Date().toISOString()
      };
      if (existing && existing.id) {
        xhr('PATCH', SUPABASE_URL + '/rest/v1/arcade_scores?id=eq.' + encodeURIComponent(existing.id), payload, function (patchOk) {
          done(!!patchOk);
        });
      } else {
        xhr('POST', SUPABASE_URL + '/rest/v1/arcade_scores', payload, function (postOk) {
          done(!!postOk);
        });
      }
    });
  }

  function renderPending(rows) {
    var ul = $('admin-submission-list');
    if (!rows.length) {
      ul.innerHTML = '<li class="admin-empty">No pending submissions.</li>';
      setStatus('');
      return;
    }
    var html = '';
    var i;
    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      var defaultIni = row.player_initials || '';
      if (row.initials_on_screen) defaultIni = '';
      html += '<li class="admin-submission-card" data-id="' + escapeHtml(row.id) + '"'
        + ' data-game-number="' + row.game_number + '"'
        + ' data-game-name="' + escapeHtml(row.game_name) + '">'
        + '<p class="admin-submission-meta">#' + row.game_number + ' — ' + escapeHtml(row.game_name) + '</p>'
        + '<p class="admin-submission-note">'
        + (row.initials_on_screen
          ? 'Player says initials are visible on the photo.'
          : 'Player entered initials: <strong>' + escapeHtml(row.player_initials || '—') + '</strong>')
        + '</p>'
        + '<img class="admin-submission-photo" src="' + escapeHtml(row.photo_data) + '" alt="Score photo">'
        + '<div class="admin-submission-fields">'
        + '<label>Initials for leaderboard'
        + '<input type="text" class="admin-ini-input" maxlength="3" value="' + escapeHtml(defaultIni) + '" placeholder="ABC">'
        + '</label>'
        + '<label>Score from photo'
        + '<input type="number" class="admin-score-input" min="1" placeholder="12345">'
        + '</label>'
        + '</div>'
        + '<div class="admin-submission-actions">'
        + '<button type="button" class="admin-btn approve" data-action="approve">Approve</button>'
        + '<button type="button" class="admin-btn reject" data-action="reject">Reject</button>'
        + '</div>'
        + '</li>';
    }
    ul.innerHTML = html;
    setStatus(rows.length + ' pending');
  }

  function loadPending() {
    if (!window.ArcadeSubmissions) {
      setStatus('Submissions module missing.');
      return;
    }
    setStatus('Loading...');
    ArcadeSubmissions.listPending(MACHINE_ID, function (rows) {
      renderPending(rows || []);
    });
  }

  function handleListClick(e) {
    var target = e.target || e.srcElement;
    if (!target || !target.getAttribute) return;
    var action = target.getAttribute('data-action');
    if (!action) return;
    var card = target;
    while (card && card.className.indexOf('admin-submission-card') < 0) {
      card = card.parentNode;
    }
    if (!card) return;
    var id = card.getAttribute('data-id');
    var iniInput = card.querySelector('.admin-ini-input');
    var scoreInput = card.querySelector('.admin-score-input');
    if (action === 'reject') {
      if (!window.confirm('Reject this submission?')) return;
      ArcadeSubmissions.updateSubmission(id, {
        status: 'rejected',
        reviewed_at: new Date().toISOString()
      }, function () {
        loadPending();
      });
      return;
    }
    if (action === 'approve') {
      var initials = trim(iniInput.value).toUpperCase().slice(0, 3);
      var score = parseInt(scoreInput.value, 10);
      if (!initials || initials.length < 2 || !score || score <= 0) {
        window.alert('Enter initials and score from the photo.');
        return;
      }
      var gameNumber = parseInt(card.getAttribute('data-game-number'), 10);
      var gameName = card.getAttribute('data-game-name') || '';
      publishScore(gameNumber, gameName, initials, score, function (ok) {
        if (!ok) {
          window.alert('Could not save score to leaderboard.');
          return;
        }
        ArcadeSubmissions.updateSubmission(id, {
          status: 'approved',
          approved_initials: initials,
          approved_score: score,
          reviewed_at: new Date().toISOString()
        }, function () {
          loadPending();
        });
      });
    }
  }

  function init() {
    $('admin-pin-btn').onclick = tryUnlock;
    $('admin-pin-input').onkeyup = function (e) {
      if (e.keyCode === 13) tryUnlock();
    };
    $('admin-refresh-btn').onclick = loadPending;
    $('admin-submission-list').onclick = handleListClick;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        showPanel();
      }
    } catch (e2) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
