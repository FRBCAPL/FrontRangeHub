/* Arcade score photo submissions — ES5 for KitKat */
(function (global) {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var LOCAL_KEY = 'frph-arcade-pending-submissions';
  var MODE_KEY = 'frph-arcade-submissions-mode';
  var storageMode = null;

  function xhr(method, url, body, callback) {
    var req = new XMLHttpRequest();
    req.open(method, url, true);
    req.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    req.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_ANON_KEY);
    req.setRequestHeader('Content-Type', 'application/json');
    if (method === 'POST') {
      req.setRequestHeader('Prefer', 'return=representation');
    }
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

  function resolveMode(done) {
    if (storageMode) {
      done(storageMode);
      return;
    }
    var url = SUPABASE_URL + '/rest/v1/arcade_score_submissions?select=id&limit=1';
    xhr('GET', url, null, function (ok, status, data, text) {
      if (ok || !isTableMissing(status, data, text)) {
        storageMode = 'supabase';
      } else {
        storageMode = 'local';
      }
      done(storageMode);
    });
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function writeLocal(list) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function makeLocalId() {
    return 'local-sub-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
  }

  function compressPhotoDataUrl(dataUrl, maxWidth, quality, done) {
    if (!dataUrl) {
      done('');
      return;
    }
    var img = new Image();
    img.onload = function () {
      var w = img.width;
      var h = img.height;
      var targetW = w;
      var targetH = h;
      if (w > maxWidth) {
        targetW = maxWidth;
        targetH = Math.round(h * (maxWidth / w));
      }
      var canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetW, targetH);
      try {
        done(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        done(dataUrl);
      }
    };
    img.onerror = function () {
      done(dataUrl);
    };
    img.src = dataUrl;
  }

  function submit(payload, done) {
    resolveMode(function (mode) {
      if (mode === 'supabase') {
        xhr('POST', SUPABASE_URL + '/rest/v1/arcade_score_submissions', payload, function (ok, status, data, text) {
          if (!ok) {
            if (isTableMissing(status, data, text)) {
              storageMode = 'local';
              submitLocal(payload, done);
              return;
            }
            done(false, 'Could not send submission. Try again.');
            return;
          }
          var row = data && data[0] ? data[0] : data;
          done(true, row);
        });
      } else {
        submitLocal(payload, done);
      }
    });
  }

  function submitLocal(payload, done) {
    var list = readLocal();
    var row = {
      id: makeLocalId(),
      machine_id: payload.machine_id,
      game_number: payload.game_number,
      game_name: payload.game_name,
      photo_data: payload.photo_data,
      player_initials: payload.player_initials || null,
      initials_on_screen: payload.initials_on_screen,
      status: 'pending',
      approved_score: null,
      approved_initials: null,
      review_notes: null,
      created_at: new Date().toISOString(),
      reviewed_at: null
    };
    list.unshift(row);
    writeLocal(list);
    done(true, row);
  }

  function listPending(machineId, done) {
    resolveMode(function (mode) {
      if (mode === 'supabase') {
        var url = SUPABASE_URL + '/rest/v1/arcade_score_submissions?select=*'
          + '&machine_id=eq.' + encodeURIComponent(machineId)
          + '&status=eq.pending'
          + '&order=created_at.desc';
        xhr('GET', url, null, function (ok, status, data, text) {
          if (!ok) {
            if (isTableMissing(status, data, text)) {
              storageMode = 'local';
              done(filterLocalPending(machineId));
              return;
            }
            done([]);
            return;
          }
          done(data || []);
        });
      } else {
        done(filterLocalPending(machineId));
      }
    });
  }

  function filterLocalPending(machineId) {
    var list = readLocal();
    var out = [];
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].machine_id === machineId && list[i].status === 'pending') {
        out.push(list[i]);
      }
    }
    return out;
  }

  function updateSubmission(id, patch, done) {
    resolveMode(function (mode) {
      if (mode === 'supabase' && String(id).indexOf('local-sub-') !== 0) {
        var url = SUPABASE_URL + '/rest/v1/arcade_score_submissions?id=eq.' + encodeURIComponent(id);
        xhr('PATCH', url, patch, function (ok) {
          done(!!ok);
        });
      } else {
        var list = readLocal();
        var i;
        for (i = 0; i < list.length; i++) {
          if (list[i].id === id) {
            for (var key in patch) {
              if (patch.hasOwnProperty(key)) list[i][key] = patch[key];
            }
            writeLocal(list);
            done(true);
            return;
          }
        }
        done(false);
      }
    });
  }

  global.ArcadeSubmissions = {
    submit: submit,
    listPending: listPending,
    updateSubmission: updateSubmission,
    compressPhotoDataUrl: compressPhotoDataUrl
  };
})(window);
