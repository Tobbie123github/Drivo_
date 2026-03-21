const WS_URL = import.meta.env.VITE_WS_URL || "wss://drivo-y49d.onrender.com";

class WS {
  constructor() {
    this.ws = null;
    this.handlers = {};
    this.reconnectTimer = null;
    this.reconnects = 0;
    this.maxReconnects = 20; // ← increased from 5
    this.endpoint = null;
    this.closed = false;
    this.pingTimer = null;
    this.lastPong = Date.now();
  }

  connect(endpoint) {
    const token = localStorage.getItem("drivo_token");
    if (!token) return;

    // Check token not expired
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        console.warn("[WS] Token expired — redirecting to login");
        localStorage.clear();
        window.location.href = "/";
        return;
      }
    } catch {}

    this.endpoint = endpoint;
    this.closed = false;
    this._connect();
  }

  _connect() {
    const token = localStorage.getItem("drivo_token");
    if (!token || this.closed) return;

    // Clear any existing connection first
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    try {
      this.ws = new WebSocket(`${WS_URL}${this.endpoint}?token=${token}`);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        console.log(`[WS] Connected to ${this.endpoint}`);
        this.reconnects = 0;
        this._startClientPing();
        this.emit("connected", {});
      };

      this.ws.onmessage = (e) => {
        this.lastPong = Date.now();
        try {
          const m = JSON.parse(e.data);
          this.emit(m.type, m.payload);
          this.emit("*", m);
        } catch (err) {}
      };

      this.ws.onclose = (e) => {
        console.log(`[WS] Closed: code=${e.code} reason=${e.reason}`);
        this._stopClientPing();
        this.emit("disconnected", {});

        if (!this.closed) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (e) => {
        console.warn("[WS] Error:", e);
      };
    } catch (e) {
      console.error("[WS] Connection failed:", e);
      if (!this.closed) this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer);

    if (this.reconnects >= this.maxReconnects) {
      console.warn("[WS] Max reconnects reached");
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnects), 30000);
    this.reconnects++;

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnects})`);
    this.reconnectTimer = setTimeout(() => this._connect(), delay);
  }

  // Client-side ping to keep connection alive
  _startClientPing() {
    this._stopClientPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send a ping payload — server treats it as a regular message
        try {
          this.ws.send(JSON.stringify({ type: "ping", payload: {} }));
        } catch (e) {}
      }
    }, 30000); // every 30 seconds
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
      } catch (e) {}
    });
  }

  disconnect() {
    this.closed = true;
    clearTimeout(this.reconnectTimer);
    this._stopClientPing();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close(1000, "Intentional disconnect");
      } catch (e) {}
      this.ws = null;
    }
    this.handlers = {};
    this.reconnects = 0;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const driverWS = new WS();
export const riderWS = new WS();
