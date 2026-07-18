/* Shared Optiplex (arcade-events) bridge for kiosk-lite admin — ES5 */
(function (global) {
  var STORAGE_KEY = 'arcade-events-http';
  var WS_KEY = 'arcade-events-ws';
  var PIN_KEY = 'arcade-admin-pin';
  var DEFAULT_PIN = '8675';

  function trim(str) {
    return String(str || '').replace(/^\s+|\s+$/g, '');
  }

  function resolveBaseUrl() {
    try {
      var explicit = localStorage.getItem(STORAGE_KEY);
      if (explicit) return trim(explicit).replace(/\/$/, '');
    } catch (e1) {}

    try {
      var ws = localStorage.getItem(WS_KEY);
      if (ws) return trim(ws).replace(/^ws/i, 'http').replace(/\/$/, '');
    } catch (e2) {}

    var host = (global.location && global.location.hostname) || '';
    var port = (global.location && global.location.port) || '';
    var protocol = (global.location && global.location.protocol) || 'http:';

    if (port === '3080') {
      return protocol + '//' + host + ':' + port;
    }
    if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      if (port === '5173' || port === '4173' || port === '' || port === '80') {
        return 'http://' + host + ':3080';
      }
    }
    return null;
  }

  function setBaseUrl(url) {
    var trimmed = trim(url).replace(/\/$/, '');
    try {
      if (trimmed) {
        localStorage.setItem(STORAGE_KEY, trimmed);
        localStorage.setItem(WS_KEY, trimmed.replace(/^http/i, 'ws'));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
  }

  function getStaffPin() {
    try {
      return trim(sessionStorage.getItem(PIN_KEY) || localStorage.getItem(PIN_KEY) || DEFAULT_PIN);
    } catch (e) {
      return DEFAULT_PIN;
    }
  }

  function setStaffPin(pin) {
    var value = trim(pin);
    try {
      if (value) {
        sessionStorage.setItem(PIN_KEY, value);
        localStorage.setItem(PIN_KEY, value);
      }
    } catch (e) {}
  }

  function postJson(path, body, done) {
    var base = resolveBaseUrl();
    if (!base) {
      done({ ok: false, skipped: true, reason: 'no_optiplex_url' });
      return;
    }
    // Browsers block HTTPS page → HTTP Optiplex (mixed content).
    if (global.location && global.location.protocol === 'https:' && /^http:\/\//i.test(base)) {
      done({ ok: false, skipped: true, reason: 'mixed_content' });
      return;
    }

    var req = new XMLHttpRequest();
    var timer = setTimeout(function () {
      try { req.abort(); } catch (eAbort) {}
      done({ ok: false, reason: 'timeout', base: base });
    }, 5000);

    req.open('POST', base + path, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.onreadystatechange = function () {
      if (req.readyState !== 4) return;
      clearTimeout(timer);
      var data = null;
      try {
        if (req.responseText) data = JSON.parse(req.responseText);
      } catch (eParse) {
        data = null;
      }
      done({
        ok: req.status >= 200 && req.status < 300 && !(data && data.success === false),
        status: req.status,
        data: data,
        base: base,
        reason: data && data.error ? data.error : null
      });
    };
    try {
      req.send(JSON.stringify(body || {}));
    } catch (eSend) {
      clearTimeout(timer);
      done({ ok: false, reason: eSend.message || 'network', base: base });
    }
  }

  /** Write score to Optiplex local store (TV). Non-fatal if Optiplex unreachable. */
  function addScore(opts, done) {
    var pin = getStaffPin();
    postJson('/api/scores/staff/add', {
      pin: pin,
      machine_id: opts.machineId || opts.machine_id || 'legends-cabinet-1',
      game_number: opts.gameNumber || opts.game_number,
      game_name: opts.gameName || opts.game_name,
      initials: opts.initials || opts.displayName,
      score: opts.score
    }, done || function () {});
  }

  /** Remove a player score from Optiplex local store (by name, not cloud UUID). */
  function deleteScore(opts, done) {
    var pin = getStaffPin();
    postJson('/api/scores/staff/delete-by-player', {
      pin: pin,
      machine_id: opts.machineId || opts.machine_id || 'legends-cabinet-1',
      game_number: opts.gameNumber || opts.game_number,
      initials: opts.initials || opts.displayName
    }, done || function () {});
  }

  function pullCloud(done) {
    postJson('/api/scores/pull-cloud', { pin: getStaffPin() }, done || function () {});
  }

  global.ArcadeOptiplex = {
    resolveBaseUrl: resolveBaseUrl,
    setBaseUrl: setBaseUrl,
    getStaffPin: getStaffPin,
    setStaffPin: setStaffPin,
    addScore: addScore,
    deleteScore: deleteScore,
    pullCloud: pullCloud
  };
})(typeof window !== 'undefined' ? window : this);
