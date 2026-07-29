/**
 * Browser WebSocket client for Legends Arcade events (ES5-friendly).
 */
(function (global) {
  var DEFAULT_PORT = 3080;

  function parseQueryParam(name) {
    var search = global.location.search || '';
    var parts, i, pair, key;
    if (search.charAt(0) === '?') search = search.substring(1);
    parts = search.split('&');
    for (i = 0; i < parts.length; i++) {
      pair = parts[i].split('=');
      key = decodeURIComponent(pair[0] || '');
      if (key === name) {
        return pair.length > 1 ? decodeURIComponent(pair[1].replace(/\+/g, ' ')) : '';
      }
    }
    return '';
  }

  function isVenueLiveSite(host) {
    host = (host || '').toLowerCase();
    return host === 'frontrangepool.com' || host === 'www.frontrangepool.com';
  }

  function resolveWsUrl(override) {
    if (override) return override;
    var fromQuery = parseQueryParam('events') || parseQueryParam('ws');
    if (fromQuery) return fromQuery;
    try {
      var stored = global.localStorage.getItem('arcade-events-ws');
      if (stored) return stored;
    } catch (e) { /* ignore */ }
    var host = global.location.hostname || 'localhost';
    var port = global.location.port || '';
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'ws://' + host + ':3080';
    }
    if (port === '5173' || port === '4173') {
      return 'ws://' + host + ':3080';
    }
    if (port === '3080') {
      return 'ws://' + host + ':3080';
    }
    /* Live site on Optiplex at the venue — event server runs on same PC */
    if (isVenueLiveSite(host)) {
      return 'ws://127.0.0.1:' + DEFAULT_PORT;
    }
    return null;
  }

  function ArcadeWsClient(options) {
    this.url = resolveWsUrl(options && options.url);
    this.role = (options && options.role) || 'dev';
    this.ws = null;
    this.handlers = {};
    this.reconnectMs = (options && options.reconnectMs) || 3000;
    this.shouldReconnect = true;
    this._reconnectTimer = null;
  }

  ArcadeWsClient.prototype.on = function (event, fn) {
    this.handlers[event] = fn;
  };

  ArcadeWsClient.prototype._emit = function (event, data) {
    if (this.handlers[event]) this.handlers[event](data);
    if (this.handlers['*']) this.handlers['*'](event, data);
  };

  ArcadeWsClient.prototype.connect = function () {
    var self = this;
    if (!this.url) {
      this._emit('error', { message: 'No WebSocket URL configured. Use ?events=ws://host:3080' });
      return;
    }
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this._emit('error', err);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = function () {
      self._emit('open');
      self.send({ type: 'REGISTER', role: self.role });
    };

    this.ws.onmessage = function (evt) {
      var msg;
      try {
        msg = JSON.parse(evt.data);
      } catch (e) {
        return;
      }
      if (msg.type === 'EVENT') {
        self._emit(msg.event, msg);
        self._emit('event', msg);
      } else {
        self._emit(msg.type, msg);
      }
    };

    this.ws.onclose = function () {
      self._emit('close');
      self._scheduleReconnect();
    };

    this.ws.onerror = function () {
      self._emit('error', { message: 'WebSocket error' });
    };
  };

  ArcadeWsClient.prototype._scheduleReconnect = function () {
    var self = this;
    if (!this.shouldReconnect || this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(function () {
      self._reconnectTimer = null;
      self.connect();
    }, this.reconnectMs);
  };

  ArcadeWsClient.prototype.disconnect = function () {
    this.shouldReconnect = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.ws) this.ws.close();
  };

  ArcadeWsClient.prototype.send = function (data) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    }
  };

  ArcadeWsClient.prototype.simulate = function (event, payload) {
    this.send({ type: 'SIMULATE', event: event, payload: payload || {} });
  };

  ArcadeWsClient.prototype.submitPlayer = function (payload) {
    this.send({ type: 'PLAYER_SUBMIT', payload: payload || {} });
  };

  ArcadeWsClient.prototype.reset = function () {
    this.send({ type: 'RESET' });
  };

  global.ArcadeWsClient = ArcadeWsClient;
  global.arcadeEventsResolveWsUrl = resolveWsUrl;
})(typeof window !== 'undefined' ? window : this);
