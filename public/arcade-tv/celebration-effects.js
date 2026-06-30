/**
 * TV high-score celebration — fireworks + staged audio (ES5).
 *
 * Playback order:
 *   1. celebration.mp3              — Upbeat fanfare / attention
 *   2. celebration-congrats.mp3     — or Congratulations.mp3
 *   3. Browser TTS                  — player name only
 *   4. celebration-outro.mp3        — or leaderboard.mp3
 *      celebration-outro-top.mp3    — or New High Score.mp3 (#1)
 *
 * Missing MP3s are skipped; the chain continues.
 */
(function (global) {
  var canvas = null;
  var ctx = null;
  var running = false;
  var rafId = null;
  var burstTimer = null;
  var particles = [];
  var activeAudio = null;
  var celebrationAudio = null;
  var audioUnlocked = false;

  var COLORS = [
    '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#a3e635', '#f97316', '#ffffff'
  ];

  var AUDIO_FANFARE = ['celebration.mp3'];
  var AUDIO_CONGRATS = ['celebration-congrats.mp3', 'Congratulations.mp3', 'congratulations.mp3'];
  var AUDIO_OUTRO = ['celebration-outro.mp3', 'leaderboard.mp3'];
  var AUDIO_OUTRO_TOP = ['celebration-outro-top.mp3', 'New High Score.mp3', 'new-high-score.mp3'];

  function resolveAudioUrl(filename) {
    var path = '';
    var encoded = encodeURIComponent(filename);
    try {
      path = global.location && global.location.pathname ? global.location.pathname : '';
    } catch (e0) {
      path = '';
    }
    if (path.indexOf('/tv') === 0) {
      return '/tv/audio/' + encoded;
    }
    if (path.indexOf('/arcade-tv') >= 0) {
      return '/arcade-tv/audio/' + encoded;
    }
    return 'audio/' + encoded;
  }

  function pickColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function resizeCanvas() {
    if (!canvas) return;
    var w = window.innerWidth || 1920;
    var h = window.innerHeight || 1080;
    canvas.width = w;
    canvas.height = h;
  }

  function addBurst(x, y) {
    var i, angle, speed, color;
    color = pickColor();
    for (i = 0; i < 48; i++) {
      angle = (Math.PI * 2 * i) / 48 + Math.random() * 0.2;
      speed = 2 + Math.random() * 5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.012 + Math.random() * 0.01,
        color: color,
        size: 2 + Math.random() * 2.5
      });
    }
  }

  function randomBurst() {
    if (!canvas) return;
    var x = canvas.width * (0.15 + Math.random() * 0.7);
    var y = canvas.height * (0.12 + Math.random() * 0.45);
    addBurst(x, y);
  }

  function tick() {
    var i, p, alive;
    if (!ctx || !canvas) return;
    ctx.fillStyle = 'rgba(5, 8, 18, 0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    alive = [];
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.vx *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      alive.push(p);
    }
    particles = alive;
    ctx.globalAlpha = 1;
    if (running) {
      rafId = global.requestAnimationFrame(tick);
    }
  }

  function trim(str) {
    return String(str || '').replace(/^\s+|\s+$/g, '');
  }

  function parseRank(rank) {
    var n = parseInt(rank, 10);
    return isFinite(n) ? n : null;
  }

  function isNewHighScore(rank) {
    return parseRank(rank) === 1;
  }

  function normalizeSpeechInfo(info) {
    if (info && typeof info === 'object') {
      return {
        playerName: info.playerName || info.initials || '',
        rank: info.rank != null ? info.rank : null
      };
    }
    return {
      playerName: info || '',
      rank: null
    };
  }

  function getPlayerNameForTts(speechInfo) {
    var name = trim(normalizeSpeechInfo(speechInfo).playerName);
    if (!name || name.indexOf('Enter your') >= 0) return '';
    return name;
  }

  function outroClipCandidates(speechInfo) {
    if (isNewHighScore(normalizeSpeechInfo(speechInfo).rank)) {
      return AUDIO_OUTRO_TOP;
    }
    return AUDIO_OUTRO;
  }

  function buildSpeechText(speechInfo) {
    var info = normalizeSpeechInfo(speechInfo);
    var name = trim(info.playerName);
    var placeholder = !name || name.indexOf('Enter your') >= 0;
    var topScore = isNewHighScore(info.rank);

    if (placeholder) {
      if (topScore) {
        return 'Congratulations, you got the new high score, you made the leaderboard!';
      }
      return 'Congratulations, you made the leaderboard!';
    }
    if (topScore) {
      return 'Congratulations, ' + name + ', you got the new high score, you made the leaderboard!';
    }
    return 'Congratulations, ' + name + ', you made the leaderboard!';
  }

  function speakCelebration(speechInfo) {
    var text, utterance;
    if (!global.speechSynthesis) return;
    try {
      global.speechSynthesis.cancel();
      text = buildSpeechText(speechInfo);
      utterance = new global.SpeechSynthesisUtterance(text);
      utterance.rate = 0.94;
      utterance.pitch = 1;
      utterance.volume = 1;
      global.speechSynthesis.speak(utterance);
    } catch (e2) {}
  }

  function speakPlayerName(speechInfo, onDone) {
    var name = getPlayerNameForTts(speechInfo);
    var utterance;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      if (onDone) onDone();
    }

    if (!name || !global.speechSynthesis) {
      finish();
      return;
    }

    try {
      global.speechSynthesis.cancel();
      utterance = new global.SpeechSynthesisUtterance(name);
      utterance.rate = 0.88;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = finish;
      utterance.onerror = finish;
      global.speechSynthesis.speak(utterance);
    } catch (e3) {
      finish();
    }
  }

  function stopSpeech() {
    if (global.speechSynthesis) {
      try { global.speechSynthesis.cancel(); } catch (e4) {}
    }
  }

  function stopAudioElement(el) {
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch (e5) {}
  }

  function stopCelebrationAudio() {
    stopAudioElement(celebrationAudio);
    stopAudioElement(activeAudio);
    activeAudio = null;
  }

  function unlockAudio() {
    var audio, promise;
    if (audioUnlocked) return;
    try {
      if (!celebrationAudio) {
        celebrationAudio = new Audio(resolveAudioUrl('celebration.mp3'));
        celebrationAudio.preload = 'auto';
      }
      audio = celebrationAudio;
      audio.volume = 0.01;
      audio.currentTime = 0;
      promise = audio.play();
      if (promise && promise.then) {
        promise.then(function () {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 1;
          audioUnlocked = true;
        }).catch(function () {});
      }
    } catch (e6) {}
  }

  function playAudioUrl(url, onDone) {
    var audio, finished, cleanup, onEnded, onFail, promise;

    finished = false;
    cleanup = function () {};

    function done(ok) {
      if (finished) return;
      finished = true;
      cleanup();
      if (onDone) onDone(ok !== false);
    }

    try {
      audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 1;
      activeAudio = audio;

      onEnded = function () {
        done(true);
      };
      onFail = function () {
        done(false);
      };
      cleanup = function () {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onFail);
        if (activeAudio === audio) activeAudio = null;
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onFail);

      promise = audio.play();
      if (promise && promise.then) {
        promise.catch(function () {
          onFail();
        });
      }
    } catch (e7) {
      done(false);
    }
  }

  function playFirstAvailable(filenames, onDone) {
    var index = 0;

    function tryNext() {
      if (index >= filenames.length) {
        if (onDone) onDone();
        return;
      }
      playAudioUrl(resolveAudioUrl(filenames[index]), function (ok) {
        if (ok) {
          if (onDone) onDone();
        } else {
          index += 1;
          tryNext();
        }
      });
    }

    tryNext();
  }

  function runSteps(steps, index) {
    if (index >= steps.length) return;
    steps[index](function () {
      runSteps(steps, index + 1);
    });
  }

  function playCelebrationSequence(speechInfo) {
    runSteps([
      function (next) {
        playFirstAvailable(AUDIO_FANFARE, next);
      },
      function (next) {
        playFirstAvailable(AUDIO_CONGRATS, next);
      },
      function (next) {
        speakPlayerName(speechInfo, next);
      },
      function (next) {
        playFirstAvailable(outroClipCandidates(speechInfo), next);
      }
    ], 0);
  }

  function startFireworks() {
    canvas = document.getElementById('tv-celebration-fireworks');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    stopFireworks();
    resizeCanvas();
    running = true;
    particles = [];
    randomBurst();
    randomBurst();
    burstTimer = setInterval(randomBurst, 900);
    rafId = global.requestAnimationFrame(tick);
  }

  function stopFireworks() {
    running = false;
    if (rafId) {
      global.cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (burstTimer) {
      clearInterval(burstTimer);
      burstTimer = null;
    }
    particles = [];
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function start(speechInfo) {
    startFireworks();
    setTimeout(function () {
      playCelebrationSequence(speechInfo);
    }, 400);
  }

  function stop() {
    stopFireworks();
    stopCelebrationAudio();
    stopSpeech();
  }

  function autoPrimeOnLoad() {
    unlockAudio();
  }

  function primeOnUserGesture() {
    unlockAudio();
    if (global.speechSynthesis) {
      try {
        var u = new global.SpeechSynthesisUtterance('');
        u.volume = 0;
        global.speechSynthesis.speak(u);
        global.speechSynthesis.cancel();
      } catch (e8) {}
    }
  }

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', autoPrimeOnLoad, false);
    } else {
      autoPrimeOnLoad();
    }
    global.addEventListener('load', autoPrimeOnLoad, false);
  }

  global.addEventListener('click', primeOnUserGesture, false);

  global.addEventListener('resize', function () {
    if (running) resizeCanvas();
  }, false);

  global.TvCelebrationEffects = {
    start: start,
    stop: stop,
    speak: speakCelebration,
    buildSpeechText: buildSpeechText
  };
})(typeof window !== 'undefined' ? window : this);
