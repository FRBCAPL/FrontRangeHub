/**
 * TV high-score celebration — fireworks canvas + speech (ES5).
 */
(function (global) {
  var canvas = null;
  var ctx = null;
  var running = false;
  var rafId = null;
  var burstTimer = null;
  var particles = [];
  var voicesReady = false;

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

  function loadVoices() {
    if (!global.speechSynthesis) return;
    try {
      var list = global.speechSynthesis.getVoices();
      if (list && list.length) voicesReady = true;
    } catch (e) {}
  }

  function pickVoice() {
    var list, i, v;
    if (!global.speechSynthesis) return null;
    list = global.speechSynthesis.getVoices();
    for (i = 0; i < list.length; i++) {
      v = list[i];
      if (v.lang && v.lang.indexOf('en') === 0 && v.name && v.name.indexOf('Google') >= 0) {
        return v;
      }
    }
    for (i = 0; i < list.length; i++) {
      v = list[i];
      if (v.lang && v.lang.indexOf('en') === 0) return v;
    }
    return list.length ? list[0] : null;
  }

  function speakCelebration(playerName) {
    if (!global.speechSynthesis) return;
    var name, text, utterance, voice;
    try {
      global.speechSynthesis.cancel();
      name = trim(playerName || '');
      if (!name || name.indexOf('Enter your') >= 0) {
        text = 'Congratulations, you made it to the leaderboard!';
      } else {
        text = 'Congratulations, ' + name + ', you made it to the leaderboard!';
      }
      utterance = new global.SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.08;
      utterance.volume = 1;
      voice = pickVoice();
      if (voice) utterance.voice = voice;
      global.speechSynthesis.speak(utterance);
    } catch (e2) {}
  }

  function trim(str) {
    return String(str || '').replace(/^\s+|\s+$/g, '');
  }

  function stopSpeech() {
    if (global.speechSynthesis) {
      try { global.speechSynthesis.cancel(); } catch (e3) {}
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

  function start(playerName) {
    startFireworks();
    loadVoices();
    setTimeout(function () {
      speakCelebration(playerName);
    }, 400);
  }

  function stop() {
    stopFireworks();
    stopSpeech();
  }

  if (global.speechSynthesis) {
    loadVoices();
    if (global.speechSynthesis.onvoiceschanged !== undefined) {
      global.speechSynthesis.onvoiceschanged = loadVoices;
    }
    global.addEventListener('click', function primeSpeech() {
      loadVoices();
      try {
        var u = new global.SpeechSynthesisUtterance('');
        u.volume = 0;
        global.speechSynthesis.speak(u);
        global.speechSynthesis.cancel();
      } catch (e4) {}
    }, false);
  }

  global.addEventListener('resize', function () {
    if (running) resizeCanvas();
  }, false);

  global.TvCelebrationEffects = {
    start: start,
    stop: stop,
    speak: speakCelebration
  };
})(typeof window !== 'undefined' ? window : this);
