import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X } from "lucide-react";
import { Modal, Btn } from "./ui/index";

const QUICK = [
  { label: "In 30 min", mins: 30 },
  { label: "In 1 hour", mins: 60 },
  { label: "In 2 hours", mins: 120 },
  {
    label: "Tomorrow 7am",
    custom: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(7, 0, 0, 0);
      return d;
    },
  },
];

function isoLocal(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function ScheduleModal({ open, onClose, onConfirm }) {
  const [selectedQuick, setSelectedQuick] = useState(null);
  const [customDT, setCustomDT] = useState("");

  const minDT = isoLocal(new Date(Date.now() + 5 * 60000));
  const maxDT = isoLocal(new Date(Date.now() + 7 * 24 * 60 * 60000));

  const handleQuick = (opt) => {
    setSelectedQuick(opt.label);
    const d = opt.custom
      ? opt.custom()
      : new Date(Date.now() + opt.mins * 60000);
    setCustomDT(isoLocal(d));
  };

  const handleConfirm = () => {
    if (!customDT) return;
    onConfirm(new Date(customDT).toISOString());
    onClose();
  };

  const preview = customDT
    ? new Date(customDT).toLocaleString("en-NG", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Modal open={open} onClose={onClose} title="Schedule Ride">
      <div className="space-y-4">
        {/* Quick picks */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Quick pick
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleQuick(opt)}
                className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${selectedQuick === opt.label ? "border-brand bg-brand/5" : "border-zinc-100 dark:border-zinc-700 hover:border-brand/40"}`}
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {opt.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom datetime */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Or pick a time
          </p>
          <input
            type="datetime-local"
            value={customDT}
            min={minDT}
            max={maxDT}
            onChange={(e) => {
              setCustomDT(e.target.value);
              setSelectedQuick(null);
            }}
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-transparent focus:border-brand bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white outline-none transition-colors"
          />
          <p className="text-[11px] text-zinc-400 mt-1.5">
            Up to 7 days in advance
          </p>
        </div>

        {/* Preview */}
        <AnimatePresence>
          {preview && (
            <motion.div
              className="flex items-center gap-3 p-3.5 bg-brand/5 border border-brand/20 rounded-2xl"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-8 h-8 bg-brand/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock size={14} className="text-brand" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400">Scheduled for</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {preview}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 pt-1">
          <Btn variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Btn>
          <Btn className="flex-1" onClick={handleConfirm} disabled={!customDT}>
            <Clock size={14} /> Schedule
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
