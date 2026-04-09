// websocket.js — Fixed version
// Key fixes:
// 1. NEVER stop reconnecting (removed maxReconnects limit — network can come back any time)
// 2. Manual connect() resets reconnect counter so it starts fresh after network switch
// 3. connect() cancels any pending reconnect timer before starting new connection
// 4. Reconnect delay resets to 1s on each manual connect() call

const WS_URL = import.meta.env.VITE_WS_URL || "wss://drivo-y49d.onrender.com";

class WS {
  constructor() {
    this.ws = null;
    this.handlers = {};
    this.reconnectTimer = null;
    this.reconnects = 0;
    this.endpoint = null;
    this.closed = false;
    this.pingTimer = null;
    this.connecting = false; // guard against double-connect race
  }

  connect(endpoint) {
    const token = localStorage.getItem("drivo_token");
    if (!token) return;

    // Check token not expired
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        console.warn("[WS] Token expired");
        localStorage.clear();
        window.location.href = "/";
        return;
      }
    } catch {}

    this.endpoint = endpoint;
    // ← KEY FIX: reset closed flag and reconnect counter every time connect() is
    // called manually (e.g. when network comes back). This means the next attempt
    // starts with a 1s delay, not the accumulated 30s delay.
    this.closed = false;
    this.reconnects = 0;

    // Cancel any pending auto-reconnect timer — we're connecting right now
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;

    this._connect();
  }

  _connect() {
    const token = localStorage.getItem("drivo_token");
    if (!token || this.closed) return;
    if (this.connecting) return; // prevent race condition

    this.connecting = true;

    // Tear down existing socket cleanly without triggering onclose reconnect
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this._stopClientPing();

    try {
      const url = `${WS_URL}${this.endpoint}?token=${token}`;
      console.log(`[WS] Connecting to ${url}`);
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        console.log(`[WS] Connected to ${this.endpoint}`);
        this.connecting = false;
        this.reconnects = 0;
        this._startClientPing();
        this.emit("connected", {});
      };

      this.ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          this.emit(m.type, m.payload);
          this.emit("*", m);
        } catch {}
      };

      this.ws.onclose = (e) => {
        console.log(`[WS] Closed: code=${e.code}`);
        this.connecting = false;
        this._stopClientPing();
        this.emit("disconnected", {});

        // Only auto-reconnect if not intentionally closed
        if (!this.closed) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.connecting = false;
        // onclose fires after onerror — reconnect handled there
      };
    } catch (e) {
      console.error("[WS] Connection failed:", e);
      this.connecting = false;
      if (!this.closed) this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer);

    // ← KEY FIX: NO maxReconnects limit.
    // Keep trying forever with capped backoff (max 15s).
    // When the user turns data back on, the network listener calls connect()
    // which resets reconnects=0. But even without that, we keep retrying.
    const delay = Math.min(1000 * Math.pow(2, this.reconnects), 15000);
    this.reconnects++;

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnects})`);
    this.reconnectTimer = setTimeout(() => {
      if (!this.closed) this._connect();
    }, delay);
  }

  _startClientPing() {
    this._stopClientPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping", payload: {} }));
        } catch {}
      }
    }, 25000);
  }

  _stopClientPing() {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, payload }));
      } catch (e) {
        console.warn("[WS] Send failed:", e);
      }
    }
  }

  on(event, fn) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (this.handlers[event]) {
      this.handlers[event] = this.handlers[event].filter((h) => h !== fn);
    }
  }

  emit(event, data) {
    (this.handlers[event] || []).forEach((h) => {
      try {
        h(data);
      } catch {}
    });
  }

  disconnect() {
    this.closed = true;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this._stopClientPing();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close(1000, "Intentional disconnect");
      } catch {}
      this.ws = null;
    }
    this.handlers = {};
    this.reconnects = 0;
    this.connecting = false;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const driverWS = new WS();
export const riderWS = new WS();
