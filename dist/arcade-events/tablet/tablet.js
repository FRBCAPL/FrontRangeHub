(function () {
  var MAX_INITIALS = 3;
  var client = new ArcadeWsClient({ role: 'tablet' });
  var initials = '';
  var pending = null;

  var waitingEl = document.getElementById('tablet-waiting');
  var enterEl = document.getElementById('tablet-enter');
  var thanksEl = document.getElementById('tablet-thanks');
  var wsEl = document.getElementById('tablet-ws');
  var gameEl = document.getElementById('tablet-game');
  var scoreEl = document.getElementById('tablet-score');
  var initialsEl = document.getElementById('tablet-initials');
  var confirmMsgEl = document.getElementById('tablet-confirm-msg');
  var thanksMsgEl = document.getElementById('tablet-thanks-msg');
  var keyboardEl = document.getElementById('tablet-keyboard');

  function formatScore(n) {
    var num = Number(n);
    if (!Number.isFinite(num)) return '—';
    return num.toLocaleString('en-US');
  }

  function showPanel(name) {
    waitingEl.hidden = name !== 'waiting';
    enterEl.hidden = name !== 'enter';
    thanksEl.hidden = name !== 'thanks';
  }

  function renderInitials() {
    var pad = '';
    for (var i = initials.length; i < MAX_INITIALS; i++) pad += '_';
    initialsEl.textContent = initials + pad;
  }

  function resetEntry() {
    initials = '';
    pending = null;
    renderInitials();
    showPanel('waiting');
  }

  function openEntry(payload) {
    pending = payload || {};
    initials = '';
    renderInitials();
    gameEl.textContent = pending.gameName || 'Game ' + (pending.gameNumber || '?');
    scoreEl.textContent = formatScore(pending.score);
    confirmMsgEl.hidden = !pending.confirmScore;
    showPanel('enter');
  }

  function submit() {
    if (!pending || initials.length < 1) return;
    client.submitPlayer({
      initials: initials,
      confirmedScore: pending.confirmScore ? pending.score : undefined
    });
    thanksMsgEl.textContent = initials + ' — ' + formatScore(pending.score);
    showPanel('thanks');
    setTimeout(resetEntry, 4000);
  }

  keyboardEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var key = btn.getAttribute('data-key');
    var action = btn.getAttribute('data-action');
    if (key && initials.length < MAX_INITIALS) {
      initials += key;
      renderInitials();
    }
    if (action === 'backspace' && initials.length) {
      initials = initials.slice(0, -1);
      renderInitials();
    }
    if (action === 'submit') submit();
  });

  client.on('open', function () {
    wsEl.textContent = 'Connected';
  });

  client.on('close', function () {
    wsEl.textContent = 'Reconnecting…';
  });

  client.on('ENTER_PLAYER', function (msg) {
    openEntry(msg.payload);
  });

  client.on('SCORE_UNCERTAIN', function (msg) {
    var p = msg.payload || {};
    p.confirmScore = true;
    openEntry(p);
  });

  client.on('BACK_TO_IDLE', function () {
    resetEntry();
  });

  client.on('PLAYER_TIMEOUT', function () {
    resetEntry();
  });

  client.connect();
  showPanel('waiting');
})();
