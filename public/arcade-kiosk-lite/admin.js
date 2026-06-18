/* Legends Arcade lite admin — PIN gate, tabs, pending submissions */
(function () {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var STAFF_PIN = '8675';
  var SESSION_KEY = 'frph-arcade-admin-unlocked';
  var MACHINE_ID = 'legends-cabinet-1';
  var activeTab = 'submissions';
  var modulesInited = false;
  var pendingRowsById = {};

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
    var el = $('admin-status');
    if (el) el.innerHTML = msg || '';
  }

  function setGlobalStatus(msg) {
    var el = $('admin-global-status');
    if (el) el.innerHTML = msg || '';
  }

  function formatLeaderboardName(first, last) {
    first = trim(first || '');
    last = trim(last || '');
    if (first && last) {
      return first + ' ' + last.charAt(0).toUpperCase();
    }
    return '';
  }

  function formatSubmissionPlayerInfo(row) {
    var parts = [];
    if (row.initials_on_screen) {
      parts.push('Initials visible on photo.');
    }
    var first = trim(row.player_first_name || '');
    var last = trim(row.player_last_name || '');
    var ini = trim(row.player_initials || '');
    if (first || last) {
      var fullName = trim((first + ' ' + last).replace(/\s+/g, ' '));
      parts.push('Name: <strong>' + escapeHtml(fullName) + '</strong>');
      var lbName = formatLeaderboardName(first, last);
      if (lbName) {
        parts.push('Leaderboard: <strong>' + escapeHtml(lbName) + '</strong>');
      }
    }
    if (ini && !row.initials_on_screen) {
      parts.push('Initials typed: <strong>' + escapeHtml(ini) + '</strong>');
    }
    if (!parts.length) {
      return 'No player details entered.';
    }
    return parts.join(' &middot; ');
  }

  function suggestLeaderboardDisplayName(row) {
    var first = trim(row.player_first_name || '');
    var last = trim(row.player_last_name || '');
    var fromName = formatLeaderboardName(first, last);
    if (fromName) return fromName;
    var ini = trim(row.player_initials || '');
    if (ini) return ini.toUpperCase().slice(0, 3);
    if (first) return first.slice(0, 40);
    if (last) return last.charAt(0).toUpperCase();
    return '';
  }

  function showTab(tabId) {
    activeTab = tabId;
    var tabs = document.querySelectorAll('.admin-tab');
    var panels = document.querySelectorAll('.admin-tab-panel');
    var i;
    for (i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var isActive = t.getAttribute('data-tab') === tabId;
      t.className = isActive ? 'admin-tab is-active' : 'admin-tab';
    }
    for (i = 0; i < panels.length; i++) {
      var p = panels[i];
      var show = p.getAttribute('data-tab-panel') === tabId;
      p.className = show ? 'admin-tab-panel is-visible' : 'admin-tab-panel';
    }
    if (tabId === 'submissions') loadPending();
    if (tabId === 'scores' && window.ArcadeAdminScores) ArcadeAdminScores.refresh();
    if (tabId === 'cabinet' && window.ArcadeAdminCabinet) ArcadeAdminCabinet.reload();
  }

  function bindTabs() {
    var nav = $('admin-tabs');
    if (!nav) return;
    nav.onclick = function (e) {
      var target = e.target || e.srcElement;
      if (!target || !target.getAttribute) return;
      var tabId = target.getAttribute('data-tab');
      if (tabId) showTab(tabId);
    };
  }

  function showPanel() {
    $('admin-gate').className = 'admin-gate is-hidden';
    $('admin-panel').className = 'admin-panel';
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {}
    if (!modulesInited) {
      if (window.ArcadeAdminScores) ArcadeAdminScores.init();
      if (window.ArcadeAdminCabinet) ArcadeAdminCabinet.init();
      modulesInited = true;
    }
    showTab(activeTab);
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

  function publishScore(gameNumber, gameName, displayName, score, playerPhoto, done) {
    var lookup = SUPABASE_URL + '/rest/v1/arcade_scores?select=id,score'
      + '&machine_id=eq.' + encodeURIComponent(MACHINE_ID)
      + '&game_number=eq.' + encodeURIComponent(String(gameNumber))
      + '&initials=eq.' + encodeURIComponent(displayName);
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
        initials: displayName,
        score: score,
        photo_url: playerPhoto || null,
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
    if (!ul) return;
    if (!rows.length) {
      ul.innerHTML = '<li class="admin-empty">No pending submissions.</li>';
      setStatus('');
      return;
    }
    var html = '';
    var i;
    pendingRowsById = {};
    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      pendingRowsById[row.id] = row;
      var defaultName = suggestLeaderboardDisplayName(row);
      var nameHint = (trim(row.player_first_name || '') && trim(row.player_last_name || ''))
        ? '(first name + last initial, e.g. Alex S)'
        : '(3 letters if from cabinet screen)';
      html += '<li class="admin-submission-card" data-id="' + escapeHtml(row.id) + '"'
        + ' data-game-number="' + row.game_number + '"'
        + ' data-game-name="' + escapeHtml(row.game_name) + '">'
        + '<p class="admin-submission-meta">#' + row.game_number + ' — ' + escapeHtml(row.game_name) + '</p>'
        + '<p class="admin-submission-note">' + formatSubmissionPlayerInfo(row) + '</p>'
        + '<p class="admin-photo-label">Score photo (for verification)</p>'
        + '<img class="admin-submission-photo" src="' + escapeHtml(row.photo_data) + '" alt="Score photo">'
        + (row.player_photo_data
          ? '<p class="admin-photo-label">Leaderboard selfie</p>'
            + '<img class="admin-submission-photo admin-selfie-photo" src="' + escapeHtml(row.player_photo_data) + '" alt="Player selfie">'
          : '<p class="admin-submission-note admin-no-selfie">No selfie — name/initials only on leaderboard.</p>')
        + '<div class="admin-submission-fields">'
        + '<label>Name for leaderboard <span class="admin-field-hint">' + nameHint + '</span>'
        + '<input type="text" class="admin-ini-input" maxlength="40" value="' + escapeHtml(defaultName) + '" placeholder="Alex S or ABC">'
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
    ArcadeSubmissions.listPending(MACHINE_ID, function (rows, errMsg) {
      if (errMsg) {
        setStatus('');
        $('admin-submission-list').innerHTML = '<li class="admin-alert">' + escapeHtml(errMsg) + '</li>';
        return;
      }
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
      var displayName = trim(iniInput.value).slice(0, 40);
      var score = parseInt(scoreInput.value, 10);
      if (!displayName || !score || score <= 0) {
        window.alert('Enter the leaderboard name and score from the photo.');
        return;
      }
      var gameNumber = parseInt(card.getAttribute('data-game-number'), 10);
      var gameName = card.getAttribute('data-game-name') || '';
      var pendingRow = pendingRowsById[id] || null;
      var playerPhoto = pendingRow ? pendingRow.player_photo_data : null;
      publishScore(gameNumber, gameName, displayName, score, playerPhoto || null, function (ok) {
        if (!ok) {
          window.alert('Could not save score to leaderboard.');
          return;
        }
        ArcadeSubmissions.updateSubmission(id, {
          status: 'approved',
          approved_initials: displayName,
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
    bindTabs();
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
