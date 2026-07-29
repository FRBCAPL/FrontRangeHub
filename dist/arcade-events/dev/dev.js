(function () {
  var client = new ArcadeWsClient({ role: 'dev' });
  var logEl = document.getElementById('dev-log');
  var stateEl = document.getElementById('dev-state');
  var dotEl = document.getElementById('dev-ws-dot');
  var labelEl = document.getElementById('dev-ws-label');

  function $(id) {
    return document.getElementById(id);
  }

  function payload() {
    return {
      gameName: $('game-name').value.trim() || 'Galaga',
      gameNumber: Number($('game-number').value) || 4,
      score: Number($('game-score').value) || 0,
      machineId: 'legends-cabinet-1'
    };
  }

  function logEvent(name, data) {
    if (!logEl) return;
    var row = document.createElement('div');
    row.className = 'dev-log-entry';
    row.innerHTML = '<strong>' + name + '</strong> ' + JSON.stringify(data && data.payload ? data.payload : data);
    logEl.insertBefore(row, logEl.firstChild);
    while (logEl.children.length > 40) {
      logEl.removeChild(logEl.lastChild);
    }
  }

  function refreshState(data) {
    if (!stateEl) return;
    var state = data && data.state ? data.state : data;
    stateEl.textContent = JSON.stringify(state, null, 2);
  }

  client.on('open', function () {
    dotEl.classList.add('is-online');
    labelEl.textContent = 'Connected';
  });

  client.on('close', function () {
    dotEl.classList.remove('is-online');
    labelEl.textContent = 'Disconnected — retrying…';
  });

  client.on('REGISTERED', function (msg) {
    refreshState(msg.state);
  });

  client.on('STATE_CHANGED', function (msg) {
    refreshState(msg.payload);
    logEvent(msg.event, msg);
  });

  client.on('event', function (msg) {
    logEvent(msg.event, msg);
    if (msg.event === 'BACK_TO_IDLE') {
      setTimeout(function () {
        fetch('/api/state').then(function (r) { return r.json(); }).then(refreshState);
      }, 100);
    }
  });

  $('btn-menu').onclick = function () {
    client.simulate('MENU_SELECTED', payload());
  };

  $('btn-start').onclick = function () {
    client.simulate('GAME_STARTED', payload());
  };

  $('btn-game-over').onclick = function () {
    var p = payload();
    client.simulate('GAME_OVER', p);
  };

  $('btn-low-confidence').onclick = function () {
    var p = payload();
    p.confidence = Number($('ocr-confidence').value) || 0.45;
    client.simulate('OCR_COMPLETE', p);
  };

  $('btn-reset').onclick = function () {
    client.reset();
  };

  $('btn-happy-path').onclick = function () {
    var p = payload();
    client.reset();
    setTimeout(function () {
      client.simulate('MENU_SELECTED', p);
    }, 300);
    setTimeout(function () {
      client.simulate('GAME_STARTED', p);
    }, 800);
    setTimeout(function () {
      client.simulate('GAME_OVER', p);
    }, 1400);
  };

  client.connect();

  var host = window.location.hostname || 'localhost';
  var viteBase = (host === 'localhost' || host === '127.0.0.1')
    ? 'http://localhost:5173'
    : 'http://' + host + ':5173';

  var tabletVite = document.getElementById('link-tablet-vite');
  var tvVite = document.getElementById('link-tv-vite');
  if (tabletVite) tabletVite.href = viteBase + '/arcade-player/';
  if (tvVite) tvVite.href = viteBase + '/arcade-tv/';

  var lanLinksEl = document.getElementById('dev-lan-links');
  fetch('/api/info')
    .then(function (r) { return r.json(); })
    .then(function (info) {
      if (!lanLinksEl || !info || !info.lanIp) return;
      lanLinksEl.innerHTML =
        '<strong>On a physical tablet (same Wi‑Fi), bookmark:</strong><br>' +
        '<a href="' + info.tabletUrl + '" target="_blank" rel="noopener">' + info.tabletUrl + '</a> ' +
        '(easiest — only needs event server)<br>' +
        'Or Vite preview: <a href="' + info.viteTabletUrl + '" target="_blank" rel="noopener">' + info.viteTabletUrl + '</a> ' +
        '(needs Vite + event server; allow port 5173 in firewall)';
    })
    .catch(function () {
      if (lanLinksEl) lanLinksEl.textContent = 'Start the event server to see tablet URLs for your network.';
    });

  var tvLink = document.getElementById('link-tv');
  if (tvLink) {
    tvLink.href = 'https://frontrangepool.com/arcade-tv/';
    tvLink.textContent = 'Open live TV (production)';
  }

  var ipEl = document.getElementById('dev-lan-tv');
  if (ipEl) {
    ipEl.innerHTML = 'Home dev: run <strong>START-ARCADE-DEV.bat</strong>. ' +
      'Browser on this PC → use links above. Physical tablet → use LAN URLs (not localhost).';
  }

  fetch('/api/state')
    .then(function (r) { return r.json(); })
    .then(refreshState)
    .catch(function () { /* server may still be starting */ });
})();
