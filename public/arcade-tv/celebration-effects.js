/**
 * TV high-score celebration — fireworks + staged audio (ES5).
 *
 * Tiered by leaderboard rank (shorter for lower ranks):
 *   - Ranks 6–10 (low):  name entry: 6-10 place/2-10 Congrats Leaderboard Enter Name.mp3;
 *                        celebration: way to go short.mp3 -> name TTS -> break the top 5.mp3
 *   - Ranks 2–5  (mid):  name entry: 2-5 place/2-10 Congrats Leaderboard Enter Name.mp3;
 *                        celebration: way to go.mp3 -> name TTS -> made the top 5.mp3
 *   - Rank 1     (first): name entry: 1st place/You got high score -enter name.mp3;
 *                        celebration: way to go.mp3 -> name TTS -> your the champ.mp3
 *   - Rank 1 + prize (champ): name entry: 1st - Beat the champ/... enter name.mp3;
 *                        celebration: awesome-amazing.mp3 -> name TTS -> beat the champ ending.mp3
 *
 * Missing MP3s are skipped; the chain continues.
 * TV overlay hides a few seconds after the finale clip finishes (see onCelebrationEnd).
 */
(function (global) {
  var canvas = null;
  var ctx = null;
  var running = false;
  var rafId = null;
  var burstTimer = null;
  var megaBurstTimer = null;
  var particles = [];
  var confetti = [];
  var confettiTimer = null;
  var fireworksTier = 'leaderboard';
  var activeAudio = null;
  var celebrationAudio = null;
  var audioUnlocked = false;
  var activeAudios = [];

  /** Start next clip this many seconds before the current one ends (overlap). */
  var FANFARE_CUT_EARLY_SEC = 1.35;
  var CONGRATS_CUT_EARLY_SEC = 0;
  var CONGRATS_TO_NAME_DELAY_MS = 750;
  var OUTRO_CUT_EARLY_SEC = 0.35;
  var WAY_TO_GO_ENDS_BEFORE_WINNER_SEC = 0.55;
  var FINALE_AFTER_WINNER_MS = 350;
  var FINALE_END_PADDING_MS = 2500;
  var START_AUDIO_DELAY_MS = 100;
  var celebrationEndCallback = null;
  var celebrationEndTimer = null;
  var winnerFinaleWayTimer = null;

  var COLORS = [
    '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#a3e635', '#f97316', '#ffffff'
  ];

  var AUDIO_FANFARE = ['celebration.mp3'];
  var AUDIO_CONGRATS = ['celebration-congrats.mp3', 'Congratulations.mp3', 'congratulations.mp3'];
  var AUDIO_OUTRO = ['celebration-outro.mp3', 'leaderboard.mp3'];
  var AUDIO_OUTRO_TOP = [
    'new high score legend.mp3',
    'New high score legend.mp3',
    'new-high-score-legend.mp3'
  ];
  var AUDIO_WINNER_OUTRO = ['Winner outro.mp3', 'winner-outro.mp3', 'celebration-winner-outro.mp3'];
  var AUDIO_WAY_TO_GO = ['way to go.mp3', 'Way to go.mp3', 'way-to-go.mp3', 'celebration-way-to-go.mp3'];
  var AUDIO_GO_GET_HIGH_SCORE = ['go get high score.mp3', 'Go get high score.mp3', 'go-get-high-score.mp3'];
  var AUDIO_GOAT = ['goat 2.mp3', 'goat-2.mp3', 'your the goat.mp3', 'You\'re the goat.mp3', 'youre the goat.mp3', 'your-the-goat.mp3'];
  var AUDIO_BEAT_CHAMP = ['You Beat the champ.mp3', 'You beat the champ.mp3', 'you beat the champ.mp3', 'You-Beat-the-champ.mp3', 'you-beat-the-champ.mp3'];
  var AUDIO_CLAIM_PRIZE = ['Claim Prize.mp3', 'Claim prize.mp3', 'claim prize.mp3', 'Claim-Prize.mp3', 'claim-prize.mp3', 'Claim your prize.mp3', 'claim your prize.mp3'];
  var AUDIO_CONGRATS_WAV = ['Congrats.wav', 'congrats.wav', 'Congrats.mp3', 'congrats.mp3'];
  var AUDIO_TOP10 = ['top10.mp3', 'top 10.mp3', 'Top10.mp3', 'Top 10.mp3'];
  var AUDIO_TRY_TOP5 = ['try to break top 5.mp3', 'try to break the top 5.mp3', 'Try to break top 5.mp3', 'try-to-break-top-5.mp3'];
  var AUDIO_LEADERBOARD = ['leaderboard.mp3', 'Leaderboard.mp3'];
  var AUDIO_TOP5 = ['top 5.mp3', 'top5.mp3', 'Top 5.mp3', 'Top5.mp3'];
  var AUDIO_MUSIC_BED = ['8bit-music-winner-ni-sound-1-00-09.mp3', '8bit-music.mp3', '8bit music.mp3'];
  // Name-entry prompt: played when a score was AUTO-detected (vision) and we need the
  // player to walk over to the tablet and type their name. top10.mp3 already says
  // "enter your name", so it works as a fallback if the dedicated clip is missing.
  var AUDIO_ENTER_NAME = ['Enter name.mp3', 'enter name.mp3', 'Enter your name.mp3', 'enter your name.mp3'];
  // 6–10 place tier clips (audio/6-10 place/).
  var AUDIO_LOW_NAME_ENTRY = ['6-10 place/2-10 - Congrats Leaderboard -Enter Name.mp3'];
  var AUDIO_LOW_WAY_TO_GO = ['6-10 place/way to go short.mp3', 'way to go short.mp3'];
  var AUDIO_LOW_BREAK_TOP5 = ['6-10 place/break the top 5.mp3', 'break the top 5.mp3', 'try to break top 5.mp3', 'try to break the top 5.mp3'];
  // 2–5 place tier clips (audio/2-5 place/).
  var AUDIO_MID_NAME_ENTRY = ['2-5 place/2-10 - Congrats Leaderboard -Enter Name.mp3'];
  var AUDIO_MID_WAY_TO_GO = ['2-5 place/way to go.mp3', 'way to go.mp3', 'Way to go.mp3', 'way-to-go.mp3'];
  var AUDIO_MID_MADE_TOP5 = ['2-5 place/made the top 5.mp3', 'made the top 5.mp3', 'top 5.mp3', 'top5.mp3'];
  // 1st place tier clips (audio/1st place/).
  var AUDIO_FIRST_NAME_ENTRY = ['1st place/You got high score -enter name.mp3', 'You got the high score.mp3'];
  var AUDIO_FIRST_WAY_TO_GO = ['1st place/way to go.mp3', 'way to go.mp3', 'Way to go.mp3'];
  var AUDIO_FIRST_CHAMP = ['1st place/your the champ.mp3', 'your the champ.mp3', 'your the goat.mp3', 'goat 2.mp3'];
  // Beat-the-champ tier clips (audio/1st - Beat the champ/).
  var AUDIO_CHAMP_NAME_ENTRY = ['1st - Beat the champ/1st place beat the champ - enter name.mp3'];
  var AUDIO_CHAMP_AMAZING = ['1st - Beat the champ/awesome-amazing.mp3', 'Awesome- amazing.mp3', 'Awesome.mp3'];
  var AUDIO_CHAMP_ENDING = ['1st - Beat the champ/beat the champ ending.mp3', 'You Beat the champ.mp3'];

  /** Background music bed volume for the mid-tier (2–5) celebration. */
  var MUSIC_BED_VOLUME = 0.4;
  var musicBedAudio = null;
  // Audios played during the name-entry phase (keyboard up, before the celebration).
  // nameEntryGen guards late callbacks so a cancelled sequence can't keep chaining.
  var nameEntryAudios = [];
  var nameEntryGen = 0;

  function resolveAudioUrl(filename) {
    var path = '';
    var encoded = String(filename || '').split('/').map(function (part) {
      return encodeURIComponent(part);
    }).join('/');
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

  var COLORS_TOP = [
    '#fbbf24', '#fde68a', '#ffffff', '#f472b6', '#22d3ee', '#a3e635', '#f97316'
  ];

  function pickColor() {
    var pool = fireworksTier === 'top' ? COLORS_TOP : COLORS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function resizeCanvas() {
    if (!canvas) return;
    var w = window.innerWidth || 1920;
    var h = window.innerHeight || 1080;
    canvas.width = w;
    canvas.height = h;
  }

  function addBurst(x, y, opts) {
    var i, angle, speed, color, count, sizeBase, power;
    opts = opts || {};
    power = opts.power || 1;
    count = Math.floor((fireworksTier === 'top' ? 56 : 32) * power);
    sizeBase = fireworksTier === 'top' ? 2.8 : 2;
    color = pickColor();
    for (i = 0; i < count; i++) {
      angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      speed = (2 + Math.random() * 5) * (fireworksTier === 'top' ? 1.15 : 1) * power;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: (fireworksTier === 'top' ? 0.009 : 0.012) + Math.random() * 0.01,
        color: color,
        size: sizeBase + Math.random() * (fireworksTier === 'top' ? 3.5 : 2.5)
      });
    }
  }

  function randomBurst(power) {
    if (!canvas) return;
    var x = canvas.width * (0.12 + Math.random() * 0.76);
    var y = canvas.height * (0.1 + Math.random() * (fireworksTier === 'top' ? 0.5 : 0.4));
    addBurst(x, y, { power: power || 1 });
  }

  function megaBurst() {
    if (!canvas || fireworksTier !== 'top') return;
    randomBurst(1.8);
    randomBurst(1.5);
  }

  function spawnConfetti() {
    var i, n, piece;
    if (!canvas) return;
    n = fireworksTier === 'top' ? 18 : 6;
    for (i = 0; i < n; i++) {
      piece = {
        x: Math.random() * canvas.width,
        y: -12 - Math.random() * 60,
        vx: (Math.random() - 0.5) * (fireworksTier === 'top' ? 5 : 2.5),
        vy: 2.5 + Math.random() * (fireworksTier === 'top' ? 6 : 3.5),
        w: 5 + Math.random() * (fireworksTier === 'top' ? 10 : 6),
        h: 8 + Math.random() * (fireworksTier === 'top' ? 14 : 8),
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.22,
        color: pickColor(),
        life: 1,
        decay: 0.0025 + Math.random() * 0.0035
      };
      confetti.push(piece);
    }
  }

  function drawConfetti() {
    var i, c, alive;
    if (!ctx) return;
    alive = [];
    for (i = 0; i < confetti.length; i++) {
      c = confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += fireworksTier === 'top' ? 0.04 : 0.05;
      c.vx *= 0.995;
      c.rot += c.spin;
      c.life -= c.decay;
      if (c.life <= 0 || c.y > canvas.height + 40) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life));
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
      alive.push(c);
    }
    confetti = alive;
    ctx.globalAlpha = 1;
  }

  function tick() {
    var i, p, alive;
    if (!ctx || !canvas) return;
    ctx.fillStyle = fireworksTier === 'top' ? 'rgba(5, 8, 18, 0.14)' : 'rgba(5, 8, 18, 0.22)';
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
    drawConfetti();
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
        rank: info.rank != null ? info.rank : null,
        prizeWon: Boolean(info.prizeWon)
      };
    }
    return {
      playerName: info || '',
      rank: null,
      prizeWon: false
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

  /**
   * Resolve which celebration level to play from rank + prize.
   *   'champ' = rank 1 + beat the champ (prize)
   *   'first' = rank 1, no prize
   *   'mid'   = ranks 2–5
   *   'low'   = ranks 6–10 (or lower)
   * Unknown rank falls back to 'mid'.
   */
  function celebrationTier(speechInfo) {
    var info = normalizeSpeechInfo(speechInfo);
    var rank = parseRank(info.rank);
    if (rank === 1 && info.prizeWon) return 'champ';
    if (rank === 1) return 'first';
    if (rank != null && rank >= 2 && rank <= 5) return 'mid';
    if (rank != null && rank >= 6) return 'low';
    return 'mid';
  }

  function startMusicBed(filenames) {
    stopMusicBed();
    resolveFirstAvailableUrl(filenames, function (url) {
      var bed;
      if (!url) return;
      try {
        bed = new Audio(url);
        bed.preload = 'auto';
        bed.loop = true;
        bed.volume = MUSIC_BED_VOLUME;
        musicBedAudio = bed;
        trackPlayingAudio(bed);
        bed.play().catch(function () {});
      } catch (eBed) {}
    });
  }

  function stopMusicBed() {
    if (musicBedAudio) {
      stopAudioElement(musicBedAudio);
      var idx = activeAudios.indexOf(musicBedAudio);
      if (idx >= 0) activeAudios.splice(idx, 1);
      musicBedAudio = null;
    }
  }

  /**
   * Play one clip during the name-entry phase, tracked so it can be cancelled. `gen`
   * guards against a stopNameEntryPrompt() that happened after this step was scheduled.
   */
  function playNameEntryClip(filenames, gen, onDone) {
    if (gen !== nameEntryGen) { if (onDone) onDone(); return; }
    resolveFirstAvailableUrl(filenames, function (url) {
      var a, finish;
      if (gen !== nameEntryGen) return;
      if (!url) { if (onDone) onDone(); return; }
      try {
        a = new Audio(url);
        a.preload = 'auto';
        a.volume = 1;
        nameEntryAudios.push(a);
        trackPlayingAudio(a);
        finish = function () {
          a.removeEventListener('ended', finish);
          a.removeEventListener('error', finish);
          if (gen !== nameEntryGen) return;
          if (onDone) onDone();
        };
        a.addEventListener('ended', finish);
        a.addEventListener('error', finish);
        a.play().catch(function () {});
      } catch (ePrompt) {
        if (onDone) onDone();
      }
    });
  }

  /**
   * Name-entry phase (the keyboard just came up). Each tier plays one combined clip;
   * only unknown tiers fall back to congrats + enter-name.
   */
  function promptNameEntry(speechInfo) {
    var tier = celebrationTier(speechInfo);
    var gen;
    stopNameEntryPrompt();
    unlockAudio(true);
    gen = nameEntryGen;
    if (tier === 'low') {
      playNameEntryClip(AUDIO_LOW_NAME_ENTRY, gen, function () {});
      return;
    }
    if (tier === 'mid') {
      playNameEntryClip(AUDIO_MID_NAME_ENTRY, gen, function () {});
      return;
    }
    if (tier === 'first') {
      playNameEntryClip(AUDIO_FIRST_NAME_ENTRY, gen, function () {});
      return;
    }
    if (tier === 'champ') {
      playNameEntryClip(AUDIO_CHAMP_NAME_ENTRY, gen, function () {});
      return;
    }
    playNameEntryClip(AUDIO_CONGRATS_WAV, gen, function () {
      playNameEntryClip(AUDIO_ENTER_NAME, gen, function () {});
    });
  }

  function stopNameEntryPrompt() {
    var i, idx;
    nameEntryGen += 1;
    for (i = 0; i < nameEntryAudios.length; i++) {
      stopAudioElement(nameEntryAudios[i]);
      idx = activeAudios.indexOf(nameEntryAudios[i]);
      if (idx >= 0) activeAudios.splice(idx, 1);
    }
    nameEntryAudios = [];
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
    var i;
    stopAudioElement(celebrationAudio);
    for (i = 0; i < activeAudios.length; i++) {
      stopAudioElement(activeAudios[i]);
    }
    activeAudios = [];
  }

  /** Stop overlapping clips so the finale (beat champ / goat / claim prize) is audible. */
  function pauseActiveCelebrationAudios() {
    var i;
    for (i = 0; i < activeAudios.length; i++) {
      stopAudioElement(activeAudios[i]);
    }
    activeAudios = [];
  }

  function trackPlayingAudio(audio) {
    activeAudios.push(audio);
    audio.addEventListener('ended', function () {
      var idx = activeAudios.indexOf(audio);
      if (idx >= 0) activeAudios.splice(idx, 1);
    }, false);
  }

  function unlockAudio(force) {
    var audio, promise;
    if (audioUnlocked && !force) return;
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
        }).catch(function () {
          audioUnlocked = false;
        });
      }
    } catch (e6) {
      audioUnlocked = false;
    }
  }

  function primeAudio() {
    unlockAudio(true);
  }

  function playAudioUrl(url, onDone, opts) {
    var audio, finished, cleanup, onEnded, onFail, onTimeUpdate, onCanPlay, promise;
    var cutEarlySec = 0;
    var chainFired = false;
    var playAttempt = 0;
    var maxPlayAttempts = 2;
    var playbackStarted = false;

    opts = opts || {};
    cutEarlySec = opts.cutEarlySec || 0;
    if (opts.retry === false) {
      maxPlayAttempts = 1;
    }
    finished = false;
    cleanup = function () {};

    function fireChain(ok) {
      if (chainFired) return;
      chainFired = true;
      if (onDone) onDone(ok !== false);
    }

    function done(ok) {
      if (finished) return;
      finished = true;
      cleanup();
      fireChain(ok);
    }

    function tryCutEarly() {
      if (chainFired || !cutEarlySec || !audio.duration || !isFinite(audio.duration)) return;
      if (audio.duration - audio.currentTime <= cutEarlySec) {
        fireChain(true);
      }
    }

    function startPlayback() {
      if (finished || playbackStarted) return;
      playbackStarted = true;
      promise = audio.play();
      if (promise && promise.then) {
        promise.catch(function () {
          playbackStarted = false;
          if (playAttempt < maxPlayAttempts) {
            playAttempt += 1;
            unlockAudio(true);
            setTimeout(startPlayback, 200);
            return;
          }
          onFail();
        });
      }
    }

    try {
      audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 1;
      trackPlayingAudio(audio);

      onEnded = function () {
        done(true);
      };
      onFail = function () {
        done(false);
      };
      onTimeUpdate = function () {
        tryCutEarly();
      };
      cleanup = function () {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onFail);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('loadedmetadata', tryCutEarly);
        audio.removeEventListener('canplaythrough', onCanPlay);
      };

      onCanPlay = function () {
        startPlayback();
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onFail);
      if (cutEarlySec > 0) {
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', tryCutEarly);
      }
      audio.addEventListener('canplaythrough', onCanPlay, false);
      audio.addEventListener('loadeddata', onCanPlay, false);
      audio.load();
      if (audio.readyState >= 3) {
        startPlayback();
      }
    } catch (e7) {
      done(false);
    }
  }

  function playFirstAvailable(filenames, onDone, opts) {
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
      }, opts);
    }

    tryNext();
  }

  function resolveFirstAvailableUrl(filenames, onResolved) {
    var index = 0;

    function tryNext() {
      var probe, url;
      if (index >= filenames.length) {
        if (onResolved) onResolved(null);
        return;
      }
      url = resolveAudioUrl(filenames[index]);
      probe = new Audio();
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', function () {
        if (onResolved) onResolved(url);
      });
      probe.addEventListener('error', function () {
        index += 1;
        tryNext();
      });
      probe.src = url;
    }

    tryNext();
  }

  function clearWinnerFinaleWayTimer() {
    if (winnerFinaleWayTimer) {
      clearTimeout(winnerFinaleWayTimer);
      winnerFinaleWayTimer = null;
    }
  }

  function clearCelebrationEndTimer() {
    if (celebrationEndTimer) {
      clearTimeout(celebrationEndTimer);
      celebrationEndTimer = null;
    }
  }

  function fireCelebrationEnd() {
    clearCelebrationEndTimer();
    if (celebrationEndCallback) {
      try { celebrationEndCallback(); } catch (e9) {}
    }
  }

  function scheduleCelebrationEndAfterFinale() {
    clearCelebrationEndTimer();
    celebrationEndTimer = setTimeout(fireCelebrationEnd, FINALE_END_PADDING_MS);
  }

  function probeAudioDuration(url, onDuration) {
    var probe = new Audio();
    var finished = false;

    function finish(dur) {
      if (finished) return;
      finished = true;
      onDuration(dur && isFinite(dur) ? dur : 0);
    }

    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', function () {
      finish(probe.duration);
    });
    probe.addEventListener('error', function () {
      finish(0);
    });
    probe.src = url;
    try {
      probe.load();
    } catch (eProbe) {
      finish(0);
    }
    setTimeout(function () {
      finish(probe.duration || 0);
    }, 5000);
  }

  function playWinnerFinale(onDone) {
    var winnerDone = false;
    var wayStarted = false;

    function startWayClip(wayUrl) {
      var wayAudio;
      if (wayStarted || !wayUrl) return;
      wayStarted = true;
      wayAudio = new Audio(wayUrl);
      wayAudio.preload = 'auto';
      wayAudio.volume = 1;
      trackPlayingAudio(wayAudio);
      wayAudio.play().catch(function () {});
    }

    function finishWinner(wayUrl) {
      if (winnerDone) return;
      winnerDone = true;
      clearWinnerFinaleWayTimer();
      if (!wayStarted && wayUrl) startWayClip(wayUrl);
      if (onDone) onDone();
    }

    resolveFirstAvailableUrl(AUDIO_WINNER_OUTRO, function (winnerUrl) {
      if (!winnerUrl) {
        playFirstAvailable(AUDIO_WAY_TO_GO, onDone);
        return;
      }

      resolveFirstAvailableUrl(AUDIO_WAY_TO_GO, function (wayUrl) {
        probeAudioDuration(winnerUrl, function (winDur) {
          var winnerAudio, wayDelayMs, startAt;

          winnerAudio = new Audio(winnerUrl);
          winnerAudio.preload = 'auto';
          winnerAudio.volume = 1;
          trackPlayingAudio(winnerAudio);
          winnerAudio.addEventListener('ended', function () {
            finishWinner(wayUrl);
          });
          winnerAudio.addEventListener('error', function () {
            finishWinner(wayUrl);
          });

          if (!wayUrl) {
            winnerAudio.play().catch(function () {
              finishWinner(null);
            });
            return;
          }

          probeAudioDuration(wayUrl, function (wayDur) {
            wayDelayMs = 0;
            if (winDur > 0 && wayDur > 0) {
              startAt = winDur - WAY_TO_GO_ENDS_BEFORE_WINNER_SEC - wayDur;
              if (startAt < 0) startAt = 0;
              wayDelayMs = Math.max(0, Math.round(startAt * 1000));
            }

            clearWinnerFinaleWayTimer();
            winnerFinaleWayTimer = setTimeout(function () {
              winnerFinaleWayTimer = null;
              startWayClip(wayUrl);
            }, wayDelayMs);

            winnerAudio.play().catch(function () {
              finishWinner(wayUrl);
            });
          });
        });
      });
    });
  }

  function runSteps(steps, index) {
    if (index >= steps.length) return;
    steps[index](function () {
      runSteps(steps, index + 1);
    });
  }

  function playNonTopFinale(onDone) {
    playFirstAvailable(AUDIO_WAY_TO_GO, function () {
      playFirstAvailable(AUDIO_GO_GET_HIGH_SCORE, function () {
        scheduleCelebrationEndAfterFinale();
        if (onDone) onDone();
      });
    });
  }

  /**
   * Ranks 6–10 celebration (after name entry). way to go short, then reads the player's
   * name, then the "break the top 5" cap. (Combined name-entry clip played earlier.)
   */
  function playLowCelebration(speechInfo, onDone) {
    playFirstAvailable(AUDIO_LOW_WAY_TO_GO, function () {
      speakPlayerName(speechInfo, function () {
        playFirstAvailable(AUDIO_LOW_BREAK_TOP5, function () {
          scheduleCelebrationEndAfterFinale();
          if (onDone) onDone();
        });
      });
    });
  }

  /**
   * Ranks 2–5 celebration (after name entry). way to go, then reads the player's name,
   * then made the top 5. (Combined name-entry clip played earlier.)
   */
  function playMidCelebration(speechInfo, onDone) {
    playFirstAvailable(AUDIO_MID_WAY_TO_GO, function () {
      speakPlayerName(speechInfo, function () {
        playFirstAvailable(AUDIO_MID_MADE_TOP5, function () {
          scheduleCelebrationEndAfterFinale();
          if (onDone) onDone();
        });
      });
    });
  }

  /**
   * Rank 1 celebration (no prize). way to go, then name TTS, then your the champ.
   */
  function playFirstCelebration(speechInfo, onDone) {
    playFirstAvailable(AUDIO_FIRST_WAY_TO_GO, function () {
      speakPlayerName(speechInfo, function () {
        playFirstAvailable(AUDIO_FIRST_CHAMP, function () {
          scheduleCelebrationEndAfterFinale();
          if (onDone) onDone();
        });
      });
    });
  }

  /**
   * Beat-the-champ celebration (rank 1 + prize). awesome-amazing, then name TTS,
   * then beat the champ ending.
   */
  function playChampCelebration(speechInfo, onDone) {
    playFirstAvailable(AUDIO_CHAMP_AMAZING, function () {
      speakPlayerName(speechInfo, function () {
        playFirstAvailable(AUDIO_CHAMP_ENDING, function () {
          scheduleCelebrationEndAfterFinale();
          if (onDone) onDone();
        });
      });
    });
  }

  function playCelebrationSequence(speechInfo) {
    var tier = celebrationTier(speechInfo);

    if (tier === 'low') {
      playLowCelebration(speechInfo);
      return;
    }
    if (tier === 'mid') {
      playMidCelebration(speechInfo);
      return;
    }
    if (tier === 'first') {
      playFirstCelebration(speechInfo);
      return;
    }
    if (tier === 'champ') {
      playChampCelebration(speechInfo);
      return;
    }

    // Fallback for unknown tier — keep the legacy full sequence.
    var info = normalizeSpeechInfo(speechInfo);
    var topScore = isNewHighScore(info.rank);
    var prizeWon = Boolean(info.prizeWon);
    runSteps([
      function (next) {
        playFirstAvailable(AUDIO_FANFARE, next, { cutEarlySec: FANFARE_CUT_EARLY_SEC });
      },
      function (next) {
        playFirstAvailable(AUDIO_CONGRATS, next, { cutEarlySec: CONGRATS_CUT_EARLY_SEC });
      },
      function (next) {
        setTimeout(function () {
          speakPlayerName(speechInfo, next);
        }, CONGRATS_TO_NAME_DELAY_MS);
      },
      function (next) {
        playFirstAvailable(outroClipCandidates(speechInfo), next, { cutEarlySec: OUTRO_CUT_EARLY_SEC });
      },
      function (next) {
        if (topScore) {
          playWinnerFinale(next);
        } else {
          playNonTopFinale(next);
        }
      },
      function (next) {
        if (!topScore) {
          if (next) next();
          return;
        }
        function playGoatThenMaybePrize() {
          pauseActiveCelebrationAudios();
          unlockAudio(true);
          playFirstAvailable(AUDIO_GOAT, function () {
            if (prizeWon) {
              pauseActiveCelebrationAudios();
              unlockAudio(true);
              playFirstAvailable(AUDIO_CLAIM_PRIZE, function () {
                scheduleCelebrationEndAfterFinale();
                if (next) next();
              });
            } else {
              scheduleCelebrationEndAfterFinale();
              if (next) next();
            }
          });
        }
        setTimeout(function () {
          if (prizeWon) {
            pauseActiveCelebrationAudios();
            unlockAudio(true);
            playFirstAvailable(AUDIO_BEAT_CHAMP, playGoatThenMaybePrize);
          } else {
            playGoatThenMaybePrize();
          }
        }, FINALE_AFTER_WINNER_MS);
      }
    ], 0);
  }

  function startFireworks(speechInfo) {
    var info = normalizeSpeechInfo(speechInfo);
    fireworksTier = isNewHighScore(info.rank) ? 'top' : 'leaderboard';
    canvas = document.getElementById('tv-celebration-fireworks');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    stopFireworks();
    resizeCanvas();
    running = true;
    particles = [];
    randomBurst(1.2);
    randomBurst(1);
    if (fireworksTier === 'top') {
      randomBurst(1.4);
      megaBurst();
      spawnConfetti();
      burstTimer = setInterval(function () { randomBurst(1); }, 420);
      megaBurstTimer = setInterval(megaBurst, 2200);
      confettiTimer = setInterval(spawnConfetti, 650);
    } else {
      spawnConfetti();
      burstTimer = setInterval(function () { randomBurst(0.85); }, 1300);
      confettiTimer = setInterval(spawnConfetti, 1800);
    }
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
    if (megaBurstTimer) {
      clearInterval(megaBurstTimer);
      megaBurstTimer = null;
    }
    if (confettiTimer) {
      clearInterval(confettiTimer);
      confettiTimer = null;
    }
    particles = [];
    confetti = [];
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function start(speechInfo) {
    stopNameEntryPrompt();
    startFireworks(speechInfo);
    setTimeout(function () {
      playCelebrationSequence(speechInfo);
    }, START_AUDIO_DELAY_MS);
  }

  function stop() {
    clearWinnerFinaleWayTimer();
    clearCelebrationEndTimer();
    stopFireworks();
    stopMusicBed();
    stopNameEntryPrompt();
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
    buildSpeechText: buildSpeechText,
    prime: primeAudio,
    promptNameEntry: promptNameEntry,
    stopNameEntryPrompt: stopNameEntryPrompt
  };

  Object.defineProperty(global.TvCelebrationEffects, 'onCelebrationEnd', {
    get: function () { return celebrationEndCallback; },
    set: function (fn) { celebrationEndCallback = fn; }
  });

  Object.defineProperty(global.TvCelebrationEffects, 'onWinnerOutroEnd', {
    get: function () { return celebrationEndCallback; },
    set: function (fn) { celebrationEndCallback = fn; }
  });
})(typeof window !== 'undefined' ? window : this);
