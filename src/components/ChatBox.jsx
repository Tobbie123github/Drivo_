import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, ChevronDown } from "lucide-react";
import { rideAPI } from "../services/api";

export default function ChatBox({
  rideId,
  senderType,
  ws,
  otherName,
  isActive,
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // ROOT FIX: container must be display:block (not flex).
  // flex+column makes scrollHeight === clientHeight so scroll never works.
  const scrollToBottom = useCallback((instant = false) => {
    const el = containerRef.current;
    if (!el) return;
    if (instant) {
      el.scrollTop = el.scrollHeight;
    } else {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, []);

  useEffect(() => {
    if (!open || historyLoaded || !rideId) return;
    setHistoryLoaded(true);
    setLoadingHistory(true);
    rideAPI
      .getChatHistory(rideId)
      .then((r) => {
        const msgs = (r.data.messages || []).map((m) => ({
          ...m,
          isMine: m.sender_type === senderType,
        }));
        setMessages(msgs);
        setTimeout(() => scrollToBottom(true), 80);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [open, historyLoaded, rideId, senderType, scrollToBottom]);

  useEffect(() => {
    if (!ws || !rideId) return;
    const unsubMsg = ws.on("chat_message", (p) => {
      const payloadId = p.ride_id || p.rideId;
      if (payloadId && String(payloadId) !== String(rideId)) return;
      if (!p.sender_type || !p.message) return;
      const isMine = p.sender_type === senderType;
      setMessages((prev) => {
        if (isMine) {
          const idx = prev.findIndex(
            (m) =>
              m.id?.toString().startsWith("local-") && m.message === p.message,
          );
          if (idx !== -1) {
            const n = [...prev];
            n[idx] = { ...p, isMine };
            return n;
          }
        }
        if (p.id && prev.find((m) => m.id === p.id)) return prev;
        return [...prev, { ...p, isMine }];
      });
      if (!open && !isMine) setUnread((n) => n + 1);
    });
    const unsubClosed = ws.on("chat_closed", (p) => {
      const payloadId = p.ride_id || p.rideId;
      if (payloadId && String(payloadId) !== String(rideId)) return;
      setMessages((prev) => [
        ...prev,
        {
          id: "sys-" + Date.now(),
          system: true,
          message: "Trip ended — chat closed",
          created_at: new Date().toISOString(),
        },
      ]);
    });
    return () => {
      unsubMsg?.();
      unsubClosed?.();
    };
  }, [ws, rideId, senderType, open]);

  // Scroll when message count changes — NOT when messages object changes
  // (avoids infinite loop with scrollToBottom dependency)
  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]); // eslint-disable-line

  useEffect(() => {
    if (!open) return;
    setUnread(0);
    setTimeout(() => {
      inputRef.current?.focus();
      scrollToBottom(true);
    }, 360);
  }, [open]); // eslint-disable-line

  const send = () => {
    const text = input.trim();
    if (!text || !isActive || !ws) return;
    ws.send("chat_message", { ride_id: rideId, message: text });
    setMessages((prev) => [
      ...prev,
      {
        id: "local-" + Date.now(),
        sender_type: senderType,
        message: text,
        created_at: new Date().toISOString(),
        isMine: true,
      },
    ]);
    setInput("");
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="relative z-20">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative w-12 h-12 glass-light dark:glass-dark rounded-2xl flex items-center justify-center shadow-float border border-zinc-200/50 dark:border-zinc-700/50 text-brand active:scale-95 transition-all"
      >
        {open ? <ChevronDown size={20} /> : <MessageCircle size={20} />}
        {unread > 0 && !open && (
          <motion.span
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-14 right-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-float border border-zinc-100 dark:border-zinc-800 overflow-hidden"
            style={{ width: 300, height: 420 }}
            initial={{ opacity: 0, scale: 0.88, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-brand/10 rounded-xl flex items-center justify-center font-black text-brand text-sm">
                  {otherName?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                    {otherName || "Chat"}
                  </p>
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-brand animate-pulse" : "bg-zinc-400"}`}
                    />
                    <p className="text-[10px] text-zinc-400">
                      {isActive ? "Active" : "Closed"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"
              >
                <X size={13} />
              </button>
            </div>

            {/* Messages — display:block is the fix, NOT display:flex */}
            <div
              ref={containerRef}
              className="flex-1"
              style={{
                overflowY: "auto",
                overflowX: "hidden",
                display: "block",
                padding: 12,
                minHeight: 0,
              }}
            >
              {loadingHistory ? (
                <div className="flex justify-center items-center h-32">
                  <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-2xl">
                    💬
                  </div>
                  <p className="text-xs font-medium text-zinc-400">
                    No messages yet
                  </p>
                  {isActive && (
                    <p className="text-xs text-zinc-300 dark:text-zinc-600">
                      Say hi! 👋
                    </p>
                  )}
                </div>
              ) : (
                messages.map((msg, i) => {
                  if (msg.system)
                    return (
                      <div
                        key={msg.id || i}
                        className="flex justify-center mb-2"
                      >
                        <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                          {msg.message}
                        </span>
                      </div>
                    );
                  return (
                    <motion.div
                      key={msg.id || i}
                      className={`flex mb-2 ${msg.isMine ? "justify-end" : "justify-start"}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.12 }}
                    >
                      <div
                        className={`max-w-[80%] flex flex-col gap-0.5 ${msg.isMine ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`px-3 py-2 text-sm leading-relaxed break-words ${
                            msg.isMine
                              ? "bg-brand text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          }`}
                          style={{
                            borderRadius: msg.isMine
                              ? "16px 16px 4px 16px"
                              : "16px 16px 16px 4px",
                          }}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[9px] text-zinc-400 px-1">
                          {fmtTime(msg.created_at)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex-shrink-0">
              {isActive ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Type a message..."
                    maxLength={500}
                    className="flex-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5 outline-none text-zinc-900 dark:text-white placeholder-zinc-400 border-2 border-transparent focus:border-brand transition-colors"
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim()}
                    className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all flex-shrink-0"
                  >
                    <Send size={14} className="text-white" />
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs text-zinc-400 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  Chat closed after trip
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
