/* Legends Arcade admin — cabinet tab (ES5) */
(function (global) {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var MACHINE_ID = 'legends-cabinet-1';
  var inited = false;

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
      callback(ok, data);
    };
    req.send(body ? JSON.stringify(body) : null);
  }

  function setGlobalStatus(msg) {
    var el = $('admin-global-status');
    if (el) el.innerHTML = msg || '';
  }

  function loadMachine() {
    var url = SUPABASE_URL + '/rest/v1/arcade_machines?select=*'
      + '&id=eq.' + encodeURIComponent(MACHINE_ID);
    xhr('GET', url, null, function (ok, data) {
      var row = ok && data && data[0] ? data[0] : null;
      var modeEl = $('admin-maintenance-mode');
      var msgEl = $('admin-maintenance-message');
      var priceEl = $('admin-price-text');
      var metaEl = $('admin-machine-meta');
      if (row) {
        if (modeEl) modeEl.checked = !!row.maintenance_mode;
        if (msgEl) {
          msgEl.value = row.maintenance_message
            || 'Arcade cabinet is temporarily down for maintenance. Check back soon!';
        }
        if (priceEl) priceEl.value = row.price_text || 'INSERT 2 QUARTERS';
        if (metaEl) {
          metaEl.innerHTML = 'Machine active: ' + (row.is_active !== false ? 'yes' : 'no');
        }
      } else if (metaEl) {
        metaEl.innerHTML = 'Machine record not found in Supabase.';
      }
    });
  }

  function saveCabinet() {
    var payload = {
      maintenance_mode: $('admin-maintenance-mode').checked,
      maintenance_message: trim($('admin-maintenance-message').value),
      price_text: trim($('admin-price-text').value)
    };
    xhr('PATCH', SUPABASE_URL + '/rest/v1/arcade_machines?id=eq.' + encodeURIComponent(MACHINE_ID), payload, function (ok) {
      if (!ok) {
        setGlobalStatus('Could not save. Run arcade-admin-migration.sql in Supabase if needed.');
        return;
      }
      setGlobalStatus('Cabinet settings saved.');
      loadMachine();
    });
  }

  function bindEvents() {
    var saveBtn = $('admin-cabinet-save-btn');
    if (saveBtn) saveBtn.onclick = saveCabinet;
  }

  global.ArcadeAdminCabinet = {
    init: function () {
      if (!inited) {
        bindEvents();
        inited = true;
      }
      loadMachine();
    },
    reload: loadMachine
  };
}(window));
