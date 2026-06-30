/**
 * TV high-score celebration — fireworks + MP3 attention clip + system TTS (ES5).
 *
 * 1. audio/celebration.mp3 plays first
 * 2. Browser default voice announces player name (+ new #1 line when rank is 1)
 */
(function (global) {
  var canvas = null;
  var ctx = null;
  var running = false;
  var rafId = null;
  var burstTimer = null;
  var particles = [];
  var celebrationAudio = null;
  var audioUnlocked = false;

  var CELEBRATION_AUDIO_URL = resolveCelebrationAudioUrl();
  var audioLoadFailed = false;

  function resolveCelebrationAudioUrl() {
    var path = '';
    try {
      path = global.location && global.location.pathname ? global.location.pathname : '';
    } catch (e0) {
      path = '';
    }
    if (path.indexOf('/tv') === 0) {
      return '/tv/audio/celebration.mp3';
    }
    if (path.indexOf('/arcade-tv') >= 0) {
      return '/arcade-tv/audio/celebration.mp3';
    }
    return 'audio/celebration.mp3';
  }

  var COLORS = [
    '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#a3e635', '#f97316', '#ffffff'
  ];

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

  function stopSpeech() {
    if (global.speechSynthesis) {
      try { global.speechSynthesis.cancel(); } catch (e3) {}
    }
  }

  function getCelebrationAudio() {
    if (!celebrationAudio) {
      celebrationAudio = new Audio(CELEBRATION_AUDIO_URL);
      celebrationAudio.preload = 'auto';
      celebrationAudio.addEventListener('error', function () {
        audioLoadFailed = true;
      });
    }
    return celebrationAudio;
  }

  function stopCelebrationAudio() {
    if (!celebrationAudio) return;
    try {
      celebrationAudio.pause();
      celebrationAudio.currentTime = 0;
    } catch (e4) {}
  }

  function unlockAudio() {
    var audio, promise;
    if (audioUnlocked) return;
    try {
      audio = getCelebrationAudio();
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
    } catch (e5) {}
  }

  function playCelebrationClip(speechInfo) {
    var audio, finished, cleanup, onEnded, onFail;

    if (audioLoadFailed) {
      speakCelebration(speechInfo);
      return;
    }

    finished = false;
    function done(playSpeech) {
      if (finished) return;
      finished = true;
      cleanup();
      if (playSpeech) speakCelebration(speechInfo);
    }

    cleanup = function () {};
    try {
      audio = getCelebrationAudio();
      audio.volume = 1;
      audio.currentTime = 0;

      onEnded = function () {
        done(true);
      };
      onFail = function () {
        audioLoadFailed = true;
        done(true);
      };
      cleanup = function () {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onFail);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onFail);

      var promise = audio.play();
      if (promise && promise.then) {
        promise.catch(function () {
          onFail();
        });
      }
    } catch (e6) {
      done(true);
    }
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
      playCelebrationClip(speechInfo);
    }, 400);
  }

  function stop() {
    stopFireworks();
    stopCelebrationAudio();
    stopSpeech();
  }

  function primeOnUserGesture() {
    unlockAudio();
    if (global.speechSynthesis) {
      try {
        var u = new global.SpeechSynthesisUtterance('');
        u.volume = 0;
        global.speechSynthesis.speak(u);
        global.speechSynthesis.cancel();
      } catch (e7) {}
    }
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
