import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Modal, Btn } from "./ui/index";
import { rideAPI } from "../services/api";
import toast from "react-hot-toast";

const DAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];
const DAY_FULL = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export default function RecurringModal({ open, onClose, pickup, dropoff }) {
  const [tab, setTab] = useState("create");
  const [days, setDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [time, setTime] = useState("07:00");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const toggleDay = (d) =>
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  const loadList = async () => {
    setListLoading(true);
    try {
      const r = await rideAPI.listRecurring();
      setList(r.data.recurring_rides || []);
    } catch {
      toast.error("Failed to load");
    }
    setListLoading(false);
  };

  const switchTab = (t) => {
    setTab(t);
    if (t === "list") loadList();
  };

  const handleCreate = async () => {
    if (!pickup || !dropoff)
      return toast.error("Select pickup and dropoff first");
    if (days.length === 0) return toast.error("Select at least one day");
    setLoading(true);
    try {
      await rideAPI.createRecurring({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        pickup_address: pickup.address || "Pickup",
        dropoff_address: dropoff.address || "Dropoff",
        days_of_week: days.join(","),
        pickup_time: time,
        end_date: endDate || undefined,
      });
      toast.success("Recurring ride set up! 🔄");
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await rideAPI.deleteRecurring(id);
      setList((p) => p.filter((r) => r.id !== id));
      toast.success("Cancelled");
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Recurring Rides">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-1 gap-1">
          {[
            { k: "create", label: "✨ New" },
            { k: "list", label: "📋 My Rides" },
          ].map(({ k, label }) => (
            <button
              key={k}
              onClick={() => switchTab(k)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === k ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <div className="space-y-4">
            {/* Location preview */}
            {pickup && dropoff ? (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                  <span className="text-zinc-600 dark:text-zinc-300 truncate">
                    {pickup.address || "Pickup"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-zinc-600 dark:text-zinc-300 truncate">
                    {dropoff.address || "Dropoff"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-3 text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Select pickup and dropoff on the map first
              </div>
            )}

            {/* Days */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Repeat on
              </p>
              <div className="flex gap-1.5">
                {DAYS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleDay(key)}
                    className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all active:scale-95 ${days.includes(key) ? "bg-brand text-white shadow-brand" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {days.length > 0 && (
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  {days.map((d) => DAY_FULL[d]).join(", ")}
                </p>
              )}
            </div>

            {/* Time */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Pickup time
              </p>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-transparent focus:border-brand bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white outline-none transition-colors"
              />
            </div>

            {/* End date */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                End date{" "}
                <span className="normal-case font-normal text-zinc-400">
                  (optional)
                </span>
              </p>
              <input
                type="date"
                value={endDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-transparent focus:border-brand bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white outline-none transition-colors"
              />
            </div>

            <Btn
              loading={loading}
              onClick={handleCreate}
              disabled={!pickup || !dropoff || days.length === 0}
            >
              <RefreshCw size={14} /> Set Up Recurring Ride
            </Btn>
          </div>
        )}

        {tab === "list" && (
          <div className="min-h-[200px]">
            {listLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-4xl">🔄</span>
                <p className="text-sm font-medium text-zinc-500">
                  No recurring rides
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((r) => (
                  <div
                    key={r.id}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-3.5 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <RefreshCw size={14} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {r.pickup_address} → {r.dropoff_address}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {r.days_of_week
                          ?.split(",")
                          .map((d) => DAY_FULL[d])
                          .join(", ")}{" "}
                        · {r.pickup_time}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {r.total_booked} rides booked
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="w-7 h-7 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 active:scale-95"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
