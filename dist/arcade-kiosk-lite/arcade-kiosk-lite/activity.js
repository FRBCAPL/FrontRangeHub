/* Arcade activity ranking — ES5 for KitKat. Loaded before kiosk.js */
(function (global) {
  var SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';
  var LOCAL_KEY = 'frph-arcade-activity';
  var SCORES_LOCAL_KEY = 'frph-arcade-scores';
  var ACTIVITY_MODE_KEY = 'frph-arcade-activity-mode';

  var WEIGHT_SEARCH = 1;
  var WEIGHT_LEADERBOARD = 3;
  var WEIGHT_SCORE = 10;

  /* Arcade Classics — curated cabinet list (display order) */
  var CLASSIC_POPULAR_NUMBERS = [
    1,   /* Ms. Pac-Man */
    4,   /* Galaga */
    5,   /* Frogger */
    7,   /* Donkey Kong */
    9,   /* Donkey Kong Junior */
    14,  /* Dig Dug */
    16,  /* Mr. Do! */
    21,  /* Pac-Man */
    29,  /* 1942 */
    31,  /* Burger Time */
    33,  /* Centipede */
    34,  /* Millipede */
    35,  /* Jr. Pac-Man */
    43,  /* Super Breakout */
    44,  /* Arkanoid */
    47,  /* Xevious */
    52,  /* Super Pac-Man */
    62,  /* Zaxxon */
    69,  /* Congo Bongo */
    149, /* Kangaroo */
    220, /* Bagman */
    280, /* Tetris (1P) */
    370, /* Q*bert */
    379, /* Space Invaders */
    388  /* Tron */
  ];

  var DEFAULT_POPULAR_NUMBERS = [1, 21, 4, 7, 379, 5, 14, 33, 370, 31];

  var machineId = null;
  var storageMode = null;
  var resolveStorageModeFn = null;
  var statsCache = null;
  var lastSearchTracked = '';

  function trim(str) {
    return (str || '').replace(/^\s+|\s+$/g, '');
  }

  function activityScore(row) {
    return (row.searches || 0) * WEIGHT_SEARCH
      + (row.leaderboard_views || 0) * WEIGHT_LEADERBOARD
      + (row.score_submits || 0) * WEIGHT_SCORE;
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

  function isTableMissing(status, data, text) {
    if (status === 404) return true;
    var msg = '';
    if (data && data.message) msg = String(data.message).toLowerCase();
    else if (text) msg = String(text).toLowerCase();
    return msg.indexOf('does not exist') >= 0
      || msg.indexOf('could not find') >= 0
      || msg.indexOf('increment_arcade_game_activity') >= 0;
  }

  function readLocalAll() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeLocalAll(all) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function localKey(gameNumber) {
    return machineId + '|' + gameNumber;
  }

  function bumpLocal(gameNumber, gameName, deltas) {
    var all = readLocalAll();
    var key = localKey(gameNumber);
    var row = all[key] || {
      game_number: gameNumber,
      game_name: gameName,
      searches: 0,
      score_submits: 0,
      leaderboard_views: 0
    };
    row.game_name = gameName;
    row.searches += deltas.searches || 0;
    row.score_submits += deltas.score_submits || 0;
    row.leaderboard_views += deltas.leaderboard_views || 0;
    row.updated_at = Date.now();
    all[key] = row;
    writeLocalAll(all);
    if (statsCache) {
      statsCache[key] = row;
    }
  }

  function deltasForEvent(eventType) {
    if (eventType === 'search') return { searches: 1, score_submits: 0, leaderboard_views: 0 };
    if (eventType === 'score') return { searches: 0, score_submits: 1, leaderboard_views: 0 };
    if (eventType === 'leaderboard') return { searches: 0, score_submits: 0, leaderboard_views: 1 };
    return { searches: 0, score_submits: 0, leaderboard_views: 0 };
  }

  function resolveMode(done) {
    if (storageMode) {
      done(storageMode);
      return;
    }
    try {
      var stored = sessionStorage.getItem(ACTIVITY_MODE_KEY);
      if (stored === 'supabase' || stored === 'local') {
        storageMode = stored;
        done(stored);
        return;
      }
    } catch (e) {}

    if (resolveStorageModeFn) {
      resolveStorageModeFn(function (scoresMode) {
        if (scoresMode === 'local') {
          storageMode = 'local';
          try { sessionStorage.setItem(ACTIVITY_MODE_KEY, 'local'); } catch (e2) {}
          done('local');
          return;
        }
        var url = SUPABASE_URL + '/rest/v1/arcade_game_activity?select=game_number&limit=1';
        xhr('GET', url, null, function (ok, status, data, text) {
          if (ok) {
            storageMode = 'supabase';
            try { sessionStorage.setItem(ACTIVITY_MODE_KEY, 'supabase'); } catch (e3) {}
            done('supabase');
          } else if (isTableMissing(status, data, text)) {
            storageMode = 'local';
            try { sessionStorage.setItem(ACTIVITY_MODE_KEY, 'local'); } catch (e4) {}
            done('local');
          } else {
            storageMode = 'local';
            done('local');
          }
        });
      });
      return;
    }
    storageMode = 'local';
    done('local');
  }

  function track(gameNumber, gameName, eventType) {
    if (!machineId || !gameNumber) return;
    var deltas = deltasForEvent(eventType);
    resolveMode(function (mode) {
      if (mode === 'supabase') {
        xhr('POST', SUPABASE_URL + '/rest/v1/rpc/increment_arcade_game_activity', {
          p_machine_id: machineId,
          p_game_number: gameNumber,
          p_game_name: gameName || ('Game ' + gameNumber),
          p_searches: deltas.searches,
          p_score_submits: deltas.score_submits,
          p_leaderboard_views: deltas.leaderboard_views
        }, function (ok, status, data, text) {
          if (!ok && isTableMissing(status, data, text)) {
            storageMode = 'local';
            try { sessionStorage.setItem(ACTIVITY_MODE_KEY, 'local'); } catch (e) {}
            bumpLocal(gameNumber, gameName, deltas);
          }
        });
      } else {
        bumpLocal(gameNumber, gameName, deltas);
      }
    });
  }

  function trackSearchResults(games, query) {
    var q = trim(query).toLowerCase();
    var i;
    if (q.length < 2) return;
    if (q === lastSearchTracked) return;
    lastSearchTracked = q;
    for (i = 0; i < games.length; i++) {
      track(games[i].number, games[i].name, 'search');
    }
  }

  function resetSearchTrack() {
    lastSearchTracked = '';
  }

  function loadStats(done) {
    resolveMode(function (mode) {
      if (mode === 'supabase') {
        var url = SUPABASE_URL + '/rest/v1/arcade_game_activity?select=game_number,game_name,searches,score_submits,leaderboard_views,updated_at'
          + '&machine_id=eq.' + encodeURIComponent(machineId);
        xhr('GET', url, null, function (ok, status, data, text) {
          if (ok && data) {
            var map = {};
            var i;
            for (i = 0; i < data.length; i++) {
              map[machineId + '|' + data[i].game_number] = data[i];
            }
            statsCache = map;
            done(map);
            return;
          }
          if (isTableMissing(status, data, text)) {
            storageMode = 'local';
          }
          statsCache = readLocalAll();
          done(statsCache);
        });
      } else {
        statsCache = readLocalAll();
        done(statsCache);
      }
    });
  }

  function findGameInList(allGames, gameNumber) {
    var i;
    for (i = 0; i < allGames.length; i++) {
      if (allGames[i].number === gameNumber) return allGames[i];
    }
    return null;
  }

  function gamesByNumbers(allGames, numbers) {
    var list = [];
    var i;
    var g;
    for (i = 0; i < numbers.length; i++) {
      g = findGameInList(allGames, numbers[i]);
      if (g) list.push(g);
    }
    return list;
  }

  function hasAnyActivity(statsMap) {
    var key;
    for (key in statsMap) {
      if (statsMap.hasOwnProperty(key) && activityScore(statsMap[key]) > 0) return true;
    }
    return false;
  }

  function parseUpdatedAt(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    var t = Date.parse(val);
    return isNaN(t) ? 0 : t;
  }

  function getClassicPopularGames(allGames, limit) {
    var list = gamesByNumbers(allGames, CLASSIC_POPULAR_NUMBERS);
    if (limit && list.length > limit) {
      return list.slice(0, limit);
    }
    return list;
  }

  function readLocalRecentScoreMap() {
    var map = {};
    var key;
    var parts;
    var gn;
    var gname;
    var scores;
    var j;
    var ts;
    var maxTs;
    if (!machineId) return map;
    try {
      var raw = localStorage.getItem(SCORES_LOCAL_KEY);
      var all = raw ? JSON.parse(raw) : {};
      for (key in all) {
        if (!all.hasOwnProperty(key)) continue;
        parts = key.split('|');
        if (parts.length < 3 || parts[0] !== machineId) continue;
        gn = parseInt(parts[1], 10);
        if (!gn) continue;
        gname = parts.slice(2).join('|');
        scores = all[key];
        if (!scores || !scores.length) continue;
        maxTs = 0;
        for (j = 0; j < scores.length; j++) {
          ts = parseUpdatedAt(scores[j].updated_at);
          if (ts > maxTs) maxTs = ts;
        }
        if (maxTs > 0 && (!map[gn] || maxTs > map[gn].updated)) {
          map[gn] = { game_number: gn, game_name: gname, updated: maxTs };
        }
      }
    } catch (e) {}
    return map;
  }

  function loadRecentScoreMap(done) {
    resolveMode(function (mode) {
      if (mode === 'supabase' && machineId) {
        var url = SUPABASE_URL + '/rest/v1/arcade_scores?select=game_number,game_name,updated_at'
          + '&machine_id=eq.' + encodeURIComponent(machineId)
          + '&order=updated_at.desc&limit=150';
        xhr('GET', url, null, function (ok, status, data) {
          if (!ok || !data) {
            done(readLocalRecentScoreMap());
            return;
          }
          var map = {};
          var i;
          var row;
          var gn;
          var ts;
          for (i = 0; i < data.length; i++) {
            row = data[i];
            gn = row.game_number;
            ts = parseUpdatedAt(row.updated_at);
            if (!gn || !ts) continue;
            if (!map[gn] || ts > map[gn].updated) {
              map[gn] = { game_number: gn, game_name: row.game_name, updated: ts };
            }
          }
          done(map);
        });
      } else {
        done(readLocalRecentScoreMap());
      }
    });
  }

  /* Top 10 — games with scores first, then search / leaderboard / other activity */
  function rankRecentGames(allGames, limit, done) {
    loadStats(function (statsMap) {
      loadRecentScoreMap(function (scoreMap) {
        var ranked = [];
        var withScores = [];
        var withActivity = [];
        var used = {};
        var key;
        var row;
        var g;
        var gn;
        var i;

        for (gn in scoreMap) {
          if (!scoreMap.hasOwnProperty(gn)) continue;
          row = scoreMap[gn];
          g = findGameInList(allGames, row.game_number);
          if (!g) {
            g = { number: row.game_number, name: row.game_name || ('Game ' + gn) };
          }
          withScores.push({ game: g, updated: row.updated });
          used[g.number] = true;
        }

        withScores.sort(function (a, b) {
          if (b.updated !== a.updated) return b.updated - a.updated;
          return a.game.number - b.game.number;
        });

        for (key in statsMap) {
          if (!statsMap.hasOwnProperty(key)) continue;
          row = statsMap[key];
          if ((row.searches || 0) + (row.leaderboard_views || 0) + (row.score_submits || 0) <= 0) continue;
          if (used[row.game_number]) continue;
          g = findGameInList(allGames, row.game_number);
          if (!g) {
            g = { number: row.game_number, name: row.game_name || ('Game ' + row.game_number) };
          }
          withActivity.push({
            game: g,
            updated: parseUpdatedAt(row.updated_at),
            activity: activityScore(row)
          });
          used[row.game_number] = true;
        }

        withActivity.sort(function (a, b) {
          if (b.activity !== a.activity) return b.activity - a.activity;
          if (b.updated !== a.updated) return b.updated - a.updated;
          return a.game.number - b.game.number;
        });

        for (i = 0; i < withScores.length && ranked.length < limit; i++) {
          ranked.push(withScores[i].game);
        }

        for (i = 0; i < withActivity.length && ranked.length < limit; i++) {
          ranked.push(withActivity[i].game);
        }

        if (ranked.length < limit) {
          var classics = getClassicPopularGames(allGames);
          for (i = 0; i < classics.length && ranked.length < limit; i++) {
            if (!used[classics[i].number]) {
              ranked.push(classics[i]);
              used[classics[i].number] = true;
            }
          }
        }

        done(ranked);
      });
    });
  }

  function rankGames(allGames, limit, done) {
    loadStats(function (statsMap) {
      var ranked = [];
      var used = {};
      var i;
      var g;
      var key;
      var row;
      var entries = [];

      if (!hasAnyActivity(statsMap)) {
        if (limit <= 10) {
          var fallbackPopular = gamesByNumbers(allGames, DEFAULT_POPULAR_NUMBERS);
          if (fallbackPopular.length >= limit) {
            done(fallbackPopular.slice(0, limit));
            return;
          }
          done(fallbackPopular);
          return;
        }
        var fallback = [];
        for (i = 0; i < allGames.length && fallback.length < limit; i++) {
          if (allGames[i].number <= limit) fallback.push(allGames[i]);
        }
        fallback.sort(function (a, b) { return a.number - b.number; });
        done(fallback);
        return;
      }

      for (key in statsMap) {
        if (!statsMap.hasOwnProperty(key)) continue;
        row = statsMap[key];
        if (activityScore(row) <= 0) continue;
        g = findGameInList(allGames, row.game_number);
        if (!g) {
          g = { number: row.game_number, name: row.game_name || ('Game ' + row.game_number) };
        }
        entries.push({ game: g, score: activityScore(row) });
      }

      entries.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.game.number - b.game.number;
      });

      for (i = 0; i < entries.length && ranked.length < limit; i++) {
        ranked.push(entries[i].game);
        used[entries[i].game.number] = true;
      }

      if (ranked.length < limit) {
        var padded = allGames.slice(0);
        padded.sort(function (a, b) { return a.number - b.number; });
        for (i = 0; i < padded.length && ranked.length < limit; i++) {
          if (!used[padded[i].number]) {
            ranked.push(padded[i]);
            used[padded[i].number] = true;
          }
        }
      }

      done(ranked);
    });
  }

  global.ArcadeActivity = {
    init: function (machine, resolveScoresMode) {
      machineId = machine && machine.id ? machine.id : null;
      resolveStorageModeFn = resolveScoresMode;
      storageMode = null;
      statsCache = null;
      lastSearchTracked = '';
    },
    track: track,
    trackSearchResults: trackSearchResults,
    resetSearchTrack: resetSearchTrack,
    rankGames: rankGames,
    rankRecentGames: rankRecentGames,
    getClassicPopularGames: getClassicPopularGames,
    refresh: function (done) {
      statsCache = null;
      if (done) done();
    },
    getGameStats: function (gameNumber, done) {
      loadStats(function (statsMap) {
        var key = machineId + '|' + gameNumber;
        var row = statsMap[key];
        if (!row) {
          done({ searches: 0, score_submits: 0, leaderboard_views: 0, total: 0 });
          return;
        }
        done({
          searches: row.searches || 0,
          score_submits: row.score_submits || 0,
          leaderboard_views: row.leaderboard_views || 0,
          total: (row.searches || 0) + (row.score_submits || 0) + (row.leaderboard_views || 0)
        });
      });
    }
  };
}(this));
