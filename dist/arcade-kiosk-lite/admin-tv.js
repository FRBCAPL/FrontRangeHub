/* Legends Arcade admin — TV display tab (ES5) */
(function (global) {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var MACHINE_ID = 'legends-cabinet-1';
  var MIN_COUNT = 1;
  var MAX_COUNT = 20;
  var games = [];
  var picked = [];
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
      callback(ok, data);
    };
    req.send(body ? JSON.stringify(body) : null);
  }

  function setStatus(msg) {
    var el = $('admin-tv-status');
    if (el) el.innerHTML = msg || '';
  }

  function setGlobalStatus(msg) {
    var el = $('admin-global-status');
    if (el) el.innerHTML = msg || '';
  }

  function getCountLimit() {
    var el = $('admin-tv-count');
    var n = el ? parseInt(el.value, 10) : 8;
    if (isNaN(n) || n < MIN_COUNT) n = MIN_COUNT;
    if (n > MAX_COUNT) n = MAX_COUNT;
    return n;
  }

  function isAutoMode() {
    var el = $('admin-tv-auto');
    return el ? !!el.checked : true;
  }

  function findGame(num) {
    var i;
    for (i = 0; i < games.length; i++) {
      if (games[i].number === num) return games[i];
    }
    return null;
  }

  function trimPickedToLimit() {
    var limit = getCountLimit();
    if (picked.length > limit) {
      picked = picked.slice(0, limit);
    }
  }

  function updatePickUi() {
    var wrap = $('admin-tv-pick-wrap');
    var countEl = $('admin-tv-count');
    var pickedEl = $('admin-tv-picked-count');
    var addBtn = $('admin-tv-add-btn');
    var limit = getCountLimit();
    var auto = isAutoMode();
    var html = '';
    var i;
    var g;

    if (wrap) wrap.style.display = auto ? 'none' : 'block';
    if (countEl) countEl.value = String(limit);

    trimPickedToLimit();

    if (pickedEl) {
      pickedEl.innerHTML = picked.length + ' / ' + limit + ' games selected';
    }
    if (addBtn) {
      addBtn.disabled = auto || picked.length >= limit;
    }

    var list = $('admin-tv-picked-list');
    if (!list) return;

    if (!picked.length) {
      list.innerHTML = '<li class="admin-tv-picked-empty">No games picked yet — use Add game below.</li>';
      return;
    }

    for (i = 0; i < picked.length; i++) {
      g = findGame(picked[i]);
      html += '<li class="admin-tv-picked-row">';
      html += '<span class="admin-tv-picked-label">#' + picked[i]
        + ' — ' + escapeHtml(g ? g.name : ('Game ' + picked[i])) + '</span>';
      html += '<button type="button" class="admin-btn admin-tv-remove-btn" data-num="' + picked[i] + '">Remove</button>';
      html += '</li>';
    }
    list.innerHTML = html;

    var buttons = list.querySelectorAll('.admin-tv-remove-btn');
    for (i = 0; i < buttons.length; i++) {
      buttons[i].onclick = (function (btn) {
        return function () {
          var num = parseInt(btn.getAttribute('data-num'), 10);
          removePicked(num);
        };
      })(buttons[i]);
    }
  }

  function removePicked(num) {
    var next = [];
    var i;
    for (i = 0; i < picked.length; i++) {
      if (picked[i] !== num) next.push(picked[i]);
    }
    picked = next;
    updatePickUi();
  }

  function addPicked(num) {
    var limit = getCountLimit();
    var i;
    if (!num || !findGame(num)) return;
    for (i = 0; i < picked.length; i++) {
      if (picked[i] === num) {
        setStatus('That game is already in the list.');
        return;
      }
    }
    if (picked.length >= limit) {
      setStatus('Remove a game first — limit is ' + limit + '.');
      return;
    }
    picked.push(num);
    setStatus('');
    updatePickUi();
  }

  function populateGameSelects() {
    populateAddSelect();
    populateGomSelect();
  }

  function populateGomSelect() {
    var select = $('admin-tv-gom-game');
    if (!select || !games.length) return;
    var html = '';
    var i;
    for (i = 0; i < games.length; i++) {
      html += '<option value="' + games[i].number + '">#' + games[i].number
        + ' — ' + escapeHtml(games[i].name) + '</option>';
    }
    select.innerHTML = html;
  }

  function populateAddSelect() {
    var select = $('admin-tv-game-add');
    if (!select || !games.length) return;
    var html = '<option value="">Choose a game…</option>';
    var i;
    for (i = 0; i < games.length; i++) {
      html += '<option value="' + games[i].number + '">#' + games[i].number
        + ' — ' + escapeHtml(games[i].name) + '</option>';
    }
    select.innerHTML = html;
  }

  function loadGames(done) {
    var req = new XMLHttpRequest();
    req.open('GET', 'games.json', true);
    req.onreadystatechange = function () {
      if (req.readyState !== 4) return;
      var ok = req.status >= 200 && req.status < 300;
      var data = null;
      try {
        if (req.responseText) data = JSON.parse(req.responseText);
      } catch (e) {
        data = null;
      }
      games = ok && data && data.games ? data.games : [];
      populateGameSelects();
      if (done) done();
    };
    req.send(null);
  }

  function loadSettings() {
    var url = SUPABASE_URL + '/rest/v1/arcade_machines?select=tv_rotation_count,tv_rotation_games,tv_gom_number,tv_gom_prize,tv_gom_subtitle'
      + '&id=eq.' + encodeURIComponent(MACHINE_ID);
    xhr('GET', url, null, function (ok, data) {
      var row = ok && data && data[0] ? data[0] : null;
      var countEl = $('admin-tv-count');
      var autoEl = $('admin-tv-auto');
      var gomGameEl = $('admin-tv-gom-game');
      var gomPrizeEl = $('admin-tv-gom-prize');
      var gomSubEl = $('admin-tv-gom-subtitle');
      var nums = [];
      var i;

      if (row && row.tv_rotation_games && row.tv_rotation_games.length) {
        for (i = 0; i < row.tv_rotation_games.length; i++) {
          nums.push(parseInt(row.tv_rotation_games[i], 10));
        }
        picked = nums;
        if (autoEl) autoEl.checked = false;
      } else {
        picked = [];
        if (autoEl) autoEl.checked = true;
      }

      if (countEl) {
        countEl.value = String(row && row.tv_rotation_count ? row.tv_rotation_count : 8);
      }

      if (gomGameEl) {
        gomGameEl.value = String(row && row.tv_gom_number ? row.tv_gom_number : 4);
      }
      if (gomPrizeEl) {
        gomPrizeEl.value = row && row.tv_gom_prize
          ? row.tv_gom_prize
          : 'WIN A FREE BURGER';
      }
      if (gomSubEl) {
        gomSubEl.value = row && row.tv_gom_subtitle
          ? row.tv_gom_subtitle
          : 'Highest score wins — ask staff for details!';
      }

      trimPickedToLimit();
      updatePickUi();
      setStatus('');
    });
  }

  function saveSettings() {
    var limit = getCountLimit();
    var auto = isAutoMode();
    var gomNum = parseInt($('admin-tv-gom-game') ? $('admin-tv-gom-game').value : '4', 10);
    var payload = {
      tv_rotation_count: limit,
      tv_rotation_games: auto ? [] : picked.slice(0, limit),
      tv_gom_number: gomNum || 4,
      tv_gom_prize: trim($('admin-tv-gom-prize') ? $('admin-tv-gom-prize').value : '') || 'WIN A FREE BURGER',
      tv_gom_subtitle: trim($('admin-tv-gom-subtitle') ? $('admin-tv-gom-subtitle').value : '')
    };

    if (!auto && !picked.length) {
      setStatus('Pick at least one game, or turn on automatic selection.');
      return;
    }

    xhr('PATCH', SUPABASE_URL + '/rest/v1/arcade_machines?id=eq.' + encodeURIComponent(MACHINE_ID), payload, function (ok) {
      if (!ok) {
        setGlobalStatus('Could not save TV settings. Run arcade TV migrations in Supabase.');
        return;
      }
      setGlobalStatus('TV display settings saved.');
      setStatus(auto ? 'Automatic rotation (' + limit + ' games max).' : ('Showing ' + picked.length + ' picked games.'));
      loadSettings();
    });
  }

  function bindEvents() {
    var countEl = $('admin-tv-count');
    var autoEl = $('admin-tv-auto');
    var addBtn = $('admin-tv-add-btn');
    var saveBtn = $('admin-tv-save-btn');

    if (countEl) {
      countEl.onchange = function () {
        trimPickedToLimit();
        updatePickUi();
      };
    }
    if (autoEl) {
      autoEl.onchange = updatePickUi;
    }
    if (addBtn) {
      addBtn.onclick = function () {
        var select = $('admin-tv-game-add');
        var num = select ? parseInt(select.value, 10) : 0;
        if (!num) {
          setStatus('Choose a game from the list first.');
          return;
        }
        addPicked(num);
        if (select) select.value = '';
      };
    }
    if (saveBtn) saveBtn.onclick = saveSettings;
  }

  global.ArcadeAdminTv = {
    init: function () {
      if (!inited) {
        bindEvents();
        inited = true;
      }
      loadGames(function () {
        loadSettings();
      });
    },
    reload: function () {
      loadSettings();
    }
  };
}(window));
