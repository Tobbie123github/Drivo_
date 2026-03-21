import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Btn, Badge, Modal, EmptyState, Card } from "../components/ui";
import {
  BarChart3,
  Car,
  Users,
  Map,
  LogOut,
  CheckCircle,
  XCircle,
  Shield,
  AlertTriangle,
  TrendingUp,
  Eye,
  RefreshCw,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Admin() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [riders, setRiders] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === "drivers") loadDrivers();
    if (tab === "riders") loadRiders();
    if (tab === "rides") loadRides();
  }, [tab, filter]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const r = await adminAPI.getStats();
      setStats(r.data.stats);
    } catch (e) {
      toast.error("Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  };

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getDrivers(filter);
      setDrivers(r.data.drivers || []);
    } catch (e) {
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const loadRiders = async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getRiders();
      setRiders(r.data.riders || []);
    } catch (e) {
      toast.error("Failed to load riders");
    } finally {
      setLoading(false);
    }
  };

  const loadRides = async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getRides(filter);
      setRides(r.data.rides || []);
    } catch (e) {
      toast.error("Failed to load rides");
    } finally {
      setLoading(false);
    }
  };

  const act = async (fn, msg, id) => {
    try {
      await fn(id);
      toast.success(msg);
      loadDrivers();
      loadStats();
      setModalOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.error || "Action failed");
    }
  };

  const TABS = [
    { k: "stats", label: "Overview", icon: BarChart3 },
    { k: "drivers", label: "Drivers", icon: Car },
    { k: "riders", label: "Riders", icon: Users },
    { k: "rides", label: "Rides", icon: Map },
  ];

  const fmt = (f) => (f ? `₦${Number(f).toLocaleString()}` : "₦0");

  // Filter by search
  const filteredDrivers = drivers.filter(
    (d) =>
      !search ||
      d.User?.Name?.toLowerCase().includes(search.toLowerCase()) ||
      d.User?.Email?.toLowerCase().includes(search.toLowerCase()) ||
      d.User?.Phone?.includes(search),
  );

  const filteredRiders = riders.filter(
    (r) =>
      !search ||
      r.Name?.toLowerCase().includes(search.toLowerCase()) ||
      r.Email?.toLowerCase().includes(search.toLowerCase()) ||
      r.Phone?.includes(search),
  );

  const filteredRides = rides.filter(
    (r) =>
      !search ||
      r.Rider?.Name?.toLowerCase().includes(search.toLowerCase()) ||
      r.PickupAddress?.toLowerCase().includes(search.toLowerCase()) ||
      r.DropoffAddress?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${isDark ? "bg-zinc-950" : "bg-zinc-50"} font-sans`}
    >
      {/* TOP NAV */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-zinc-900 dark:text-white font-display">
            Driv<span className="text-brand">o</span>
          </h1>
          <span className="bg-brand/10 text-brand text-xs font-bold px-2.5 py-1 rounded-full border border-brand/20">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 hidden sm:block">
            {user?.Name}
          </span>
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={loadStats}
            className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-brand transition-colors"
          >
            <RefreshCw
              size={15}
              className={statsLoading ? "animate-spin" : ""}
            />
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut size={15} />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-4 flex overflow-x-auto scrollbar-hide flex-shrink-0">
        {TABS.map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              setFilter("");
              setSearch("");
            }}
            className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${tab === k ? "border-brand text-brand" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
          >
            <Icon size={15} />
            {label}
            {/* Pending drivers badge */}
            {k === "drivers" && stats?.pending_drivers > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {stats.pending_drivers}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
          {/* ── STATS ── */}
          {tab === "stats" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-white">
                  Platform Overview
                </h2>
                <p className="text-xs text-zinc-400">Last updated just now</p>
              </div>

              {statsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                </div>
              ) : stats ? (
                <>
                  {/* Main stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        l: "Total Drivers",
                        v: stats.total_drivers,
                        icon: "🚗",
                        color: "text-zinc-900 dark:text-white",
                        sub: `${stats.active_drivers} active`,
                      },
                      {
                        l: "Online Now",
                        v: stats.online_drivers,
                        icon: "🟢",
                        color: "text-brand",
                        sub: "Currently driving",
                      },
                      {
                        l: "Pending Review",
                        v: stats.pending_drivers,
                        icon: "⏳",
                        color: "text-amber-500",
                        sub: "Need approval",
                      },
                      {
                        l: "Total Riders",
                        v: stats.total_riders,
                        icon: "🧑",
                        color: "text-zinc-900 dark:text-white",
                        sub: "Registered users",
                      },
                      {
                        l: "Total Rides",
                        v: stats.total_rides,
                        icon: "🗺️",
                        color: "text-zinc-900 dark:text-white",
                        sub: "All time",
                      },
                      {
                        l: "Completed",
                        v: stats.completed_rides,
                        icon: "✅",
                        color: "text-brand",
                        sub: `${stats.total_rides > 0 ? Math.round((stats.completed_rides / stats.total_rides) * 100) : 0}% success rate`,
                      },
                      {
                        l: "Cancelled",
                        v: stats.cancelled_rides,
                        icon: "❌",
                        color: "text-red-500",
                        sub: "By rider or driver",
                      },
                      {
                        l: "Suspended",
                        v: stats.suspended_drivers,
                        icon: "🚫",
                        color: "text-orange-500",
                        sub: "Restricted accounts",
                      },
                    ].map(({ l, v, icon, color, sub }) => (
                      <motion.div
                        key={l}
                        className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 hover:border-brand/30 transition-colors"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{icon}</span>
                        </div>
                        <p
                          className={`text-2xl font-black font-display ${color}`}
                        >
                          {v?.toLocaleString()}
                        </p>
                        <p className="text-xs font-semibold text-zinc-500 mt-1">
                          {l}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Revenue card */}
                  <motion.div
                    className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp size={16} className="text-brand" />
                          <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                            Total Platform Revenue
                          </p>
                        </div>
                        <p className="text-5xl font-black text-brand font-display">
                          {fmt(stats.total_earnings)}
                        </p>
                        <p className="text-zinc-400 text-sm mt-2">
                          From {stats.completed_rides?.toLocaleString()}{" "}
                          completed rides
                        </p>
                      </div>
                      <div className="bg-brand/10 rounded-2xl p-4 text-center">
                        <p className="text-brand font-black text-xl font-display">
                          {stats.completed_rides > 0
                            ? fmt(
                                Math.round(
                                  stats.total_earnings / stats.completed_rides,
                                ),
                              )
                            : "₦0"}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Avg per ride
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Quick actions */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4">
                    <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">
                      Quick Actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTab("drivers");
                          setFilter("pending");
                        }}
                      >
                        ⏳ Review Pending ({stats.pending_drivers})
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTab("rides");
                          setFilter("ongoing");
                        }}
                      >
                        🚗 Active Rides
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTab("drivers");
                          setFilter("suspended");
                        }}
                      >
                        🚫 Suspended Drivers
                      </Btn>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon="📊"
                  title="No stats available"
                  subtitle="Could not load platform data"
                />
              )}
            </div>
          )}

          {/* ── DRIVERS ── */}
          {tab === "drivers" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display font-bold text-xl text-zinc-900 dark:text-white">
                  Drivers
                  <span className="ml-2 text-sm font-normal text-zinc-400">
                    ({filteredDrivers.length})
                  </span>
                </h2>
                <button
                  onClick={loadDrivers}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-brand transition-colors ml-auto sm:ml-0"
                >
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-brand focus:outline-none transition-colors"
                  placeholder="Search by name, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 flex-wrap">
                {["", "pending", "active", "suspended", "banned"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === s ? "bg-brand text-white shadow-brand" : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-brand hover:text-brand"}`}
                  >
                    {s || "All"}{" "}
                    {s === "pending" &&
                      stats?.pending_drivers > 0 &&
                      `(${stats.pending_drivers})`}
                  </button>
                ))}
              </div>

              {loading ? (
                <LoadingGrid />
              ) : filteredDrivers.length === 0 ? (
                <EmptyState
                  icon="🚗"
                  title="No drivers found"
                  subtitle="Try a different filter or search"
                />
              ) : (
                <div className="space-y-2">
                  {filteredDrivers.map((d) => (
                    <motion.div
                      key={d.ID}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center font-black text-lg text-brand font-display flex-shrink-0">
                            {d.User?.Name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-semibold text-zinc-900 dark:text-white">
                                {d.User?.Name || "Unknown"}
                              </p>
                              <Badge
                                color={
                                  d.Status === "active"
                                    ? "green"
                                    : d.Status === "pending"
                                      ? "yellow"
                                      : d.Status === "suspended"
                                        ? "blue"
                                        : "red"
                                }
                              >
                                {d.Status}
                              </Badge>
                              {d.IsOnline && (
                                <Badge color="green">Online</Badge>
                              )}
                            </div>
                            <p className="text-zinc-400 text-xs">
                              {d.User?.Email} · {d.User?.Phone}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs">
                              <span
                                className={`font-medium ${d.IsIdentityVerified ? "text-brand" : "text-zinc-400"}`}
                              >
                                {d.IsIdentityVerified ? "✓" : "✗"} ID
                              </span>
                              <span
                                className={`font-medium ${d.IsVehicleVerified ? "text-brand" : "text-zinc-400"}`}
                              >
                                {d.IsVehicleVerified ? "✓" : "✗"} Vehicle
                              </span>
                              <span
                                className={`font-medium ${d.LicenseVerified ? "text-brand" : "text-zinc-400"}`}
                              >
                                {d.LicenseVerified ? "✓" : "✗"} License
                              </span>
                              <span className="text-zinc-400">
                                ⭐ {Number(d.Rating || 5).toFixed(1)}
                              </span>
                              <span className="text-zinc-400">
                                🚗 {d.TotalTrips || 0} trips
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelected(d);
                              setModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark transition-colors whitespace-nowrap flex-shrink-0 px-3 py-1.5 rounded-xl hover:bg-brand/10"
                          >
                            <Eye size={13} /> Manage
                          </button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── RIDERS ── */}
          {tab === "riders" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-bold text-xl text-zinc-900 dark:text-white">
                  Riders
                  <span className="ml-2 text-sm font-normal text-zinc-400">
                    ({filteredRiders.length})
                  </span>
                </h2>
                <button
                  onClick={loadRiders}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-brand transition-colors ml-auto"
                >
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-brand focus:outline-none transition-colors"
                  placeholder="Search by name, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <LoadingGrid />
              ) : filteredRiders.length === 0 ? (
                <EmptyState icon="🧑" title="No riders found" />
              ) : (
                <div className="space-y-2">
                  {filteredRiders.map((r) => (
                    <motion.div
                      key={r.ID}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center font-bold text-zinc-500 flex-shrink-0">
                            {r.Name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-white">
                              {r.Name}
                            </p>
                            <p className="text-zinc-400 text-xs mt-0.5">
                              {r.Email}
                            </p>
                            <p className="text-zinc-400 text-xs">{r.Phone}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge color={r.IsActive ? "green" : "red"}>
                              {r.IsActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge color={r.IsVerified ? "green" : "yellow"}>
                              {r.IsVerified ? "Verified" : "Unverified"}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── RIDES ── */}
          {tab === "rides" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-bold text-xl text-zinc-900 dark:text-white">
                  Rides
                  <span className="ml-2 text-sm font-normal text-zinc-400">
                    ({filteredRides.length})
                  </span>
                </h2>
                <button
                  onClick={loadRides}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-brand transition-colors ml-auto"
                >
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-brand focus:outline-none transition-colors"
                  placeholder="Search by rider name or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {[
                  "",
                  "pending",
                  "accepted",
                  "ongoing",
                  "completed",
                  "cancelled",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${filter === s ? "bg-brand text-white shadow-brand" : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-brand hover:text-brand"}`}
                  >
                    {s || "All"}
                  </button>
                ))}
              </div>

              {loading ? (
                <LoadingGrid />
              ) : filteredRides.length === 0 ? (
                <EmptyState icon="🗺️" title="No rides found" />
              ) : (
                <div className="space-y-2">
                  {filteredRides.map((r) => (
                    <motion.div
                      key={r.ID}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge
                                color={
                                  r.Status === "completed"
                                    ? "green"
                                    : r.Status === "cancelled"
                                      ? "red"
                                      : r.Status === "ongoing"
                                        ? "blue"
                                        : "yellow"
                                }
                              >
                                {r.Status}
                              </Badge>
                              <span className="text-xs text-zinc-400">
                                {new Date(r.CreatedAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                  {r.PickupAddress ||
                                    `${r.PickupLat?.toFixed(4)}, ${r.PickupLng?.toFixed(4)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                  {r.DropoffAddress ||
                                    `${r.DropoffLat?.toFixed(4)}, ${r.DropoffLng?.toFixed(4)}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                              <span>👤 {r.Rider?.Name || "—"}</span>
                              <span>📍 {r.DistanceKm?.toFixed(1)}km</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-display font-bold text-brand text-lg">
                              ₦
                              {(
                                r.ActualFare ||
                                r.EstimatedFare ||
                                0
                              ).toLocaleString()}
                            </p>
                            {r.ActualFare &&
                              r.EstimatedFare &&
                              r.ActualFare !== r.EstimatedFare && (
                                <p className="text-xs text-zinc-400 line-through">
                                  ₦{r.EstimatedFare?.toLocaleString()}
                                </p>
                              )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DRIVER MANAGE MODAL ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Manage: ${selected?.User?.Name}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-5 max-h-[80vh] overflow-y-auto scrollbar-hide">
            {/* Driver info */}
            <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
              <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-2xl font-black text-brand font-display flex-shrink-0">
                {selected.User?.Name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-zinc-900 dark:text-white">
                  {selected.User?.Name}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {selected.User?.Email}
                </p>
                <p className="text-zinc-500 text-xs">{selected.User?.Phone}</p>
                <div className="flex gap-2 mt-2">
                  <Badge
                    color={
                      selected.Status === "active"
                        ? "green"
                        : selected.Status === "pending"
                          ? "yellow"
                          : "red"
                    }
                  >
                    {selected.Status}
                  </Badge>
                  {selected.IsOnline && <Badge color="green">Online</Badge>}
                </div>
              </div>
            </div>

            {/* Profile Photo */}
            {selected.User?.AvatarURL && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Profile Photo
                </p>
                <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <img
                    src={selected.User.AvatarURL}
                    alt="Profile"
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            )}

            {/* License Details */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Driver's License
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">License Number</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {selected.LicenseNumber || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Expiry Date</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {selected.LicenseExpiry || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Verified</span>
                  <Badge color={selected.LicenseVerified ? "green" : "yellow"}>
                    {selected.LicenseVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
              {selected.LicenseImage && (
                <div className="mt-2 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <img
                    src={selected.LicenseImage}
                    alt="License"
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(selected.LicenseImage, "_blank")}
                  />
                </div>
              )}
              {!selected.LicenseVerified && selected.LicenseImage && (
                <Btn
                  size="sm"
                  className="w-full mt-2"
                  onClick={() =>
                    act(
                      adminAPI.verifyLicense,
                      "✓ License verified",
                      selected.ID,
                    )
                  }
                >
                  <CheckCircle size={14} /> Verify License
                </Btn>
              )}
            </div>

            {/* Vehicle */}
            {selected.Vehicles?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Vehicle
                </p>
                {selected.Vehicles.map((vehicle, i) => (
                  <div
                    key={i}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 space-y-2 text-sm"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-zinc-400 text-xs">Make</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {vehicle.Make}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">Model</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {vehicle.Model}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">Year</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {vehicle.Year}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">Color</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {vehicle.Color}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">Plate</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {vehicle.PlateNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">Category</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {vehicle.Category}
                        </p>
                      </div>
                    </div>
                    {vehicle.VehicleImage && (
                      <div className="mt-2 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <img
                          src={vehicle.VehicleImage}
                          alt="Vehicle"
                          className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            window.open(vehicle.VehicleImage, "_blank")
                          }
                        />
                      </div>
                    )}
                    {!selected.IsVehicleVerified && (
                      <Btn
                        size="sm"
                        className="w-full mt-2"
                        onClick={() =>
                          act(
                            adminAPI.verifyVehicle,
                            "✓ Vehicle verified",
                            selected.ID,
                          )
                        }
                      >
                        <CheckCircle size={14} /> Verify Vehicle
                      </Btn>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Identity Documents */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Identity Documents
              </p>
              <div className="space-y-3">
                {/* National ID */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      National ID
                    </p>
                    <Badge
                      color={selected.IsIdentityVerified ? "green" : "yellow"}
                    >
                      {selected.IsIdentityVerified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  {selected.NationalIdImage ? (
                    <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                      <img
                        src={selected.NationalIdImage}
                        alt="National ID"
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() =>
                          window.open(selected.NationalIdImage, "_blank")
                        }
                      />
                    </div>
                  ) : (
                    <div className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">
                      Not uploaded
                    </div>
                  )}
                </div>

                {/* Selfie */}
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Selfie / Photo
                  </p>
                  {selected.SelfieImage ? (
                    <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                      <img
                        src={selected.SelfieImage}
                        alt="Selfie"
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() =>
                          window.open(selected.SelfieImage, "_blank")
                        }
                      />
                    </div>
                  ) : (
                    <div className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">
                      Not uploaded
                    </div>
                  )}
                </div>

                {/* Proof of Address */}
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Proof of Address
                  </p>
                  {selected.ProofOfAddress ? (
                    <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                      <img
                        src={selected.ProofOfAddress}
                        alt="Proof of Address"
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() =>
                          window.open(selected.ProofOfAddress, "_blank")
                        }
                      />
                    </div>
                  ) : (
                    <div className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">
                      Not uploaded
                    </div>
                  )}
                </div>

                {!selected.IsIdentityVerified && selected.NationalIdImage && (
                  <Btn
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      act(
                        adminAPI.verifyIdentity,
                        "✓ Identity verified",
                        selected.ID,
                      )
                    }
                  >
                    <CheckCircle size={14} /> Verify Identity
                  </Btn>
                )}
              </div>
            </div>

            {/* Verification status summary */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 space-y-2 text-sm">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Verification Summary
              </p>
              {[
                {
                  label: "Identity / NIN",
                  verified: selected.IsIdentityVerified,
                },
                { label: "Vehicle", verified: selected.IsVehicleVerified },
                {
                  label: "Driver's License",
                  verified: selected.LicenseVerified,
                },
              ].map(({ label, verified }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${verified ? "bg-brand/10 text-brand" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"}`}
                    >
                      {verified ? "✓" : "✗"}
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {label}
                    </span>
                  </div>
                  <Badge color={verified ? "green" : "yellow"}>
                    {verified ? "Verified" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Account actions */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Account Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Btn
                  size="sm"
                  onClick={() =>
                    act(
                      adminAPI.approveDriver,
                      "✅ Driver approved",
                      selected.ID,
                    )
                  }
                  disabled={selected.Status === "active"}
                >
                  <CheckCircle size={14} /> Approve
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    act(adminAPI.rejectDriver, "Driver rejected", selected.ID)
                  }
                  disabled={selected.Status === "banned"}
                >
                  <XCircle size={14} /> Reject
                </Btn>
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    act(adminAPI.suspendDriver, "Driver suspended", selected.ID)
                  }
                  disabled={selected.Status === "suspended"}
                >
                  <AlertTriangle size={14} /> Suspend
                </Btn>
                <Btn
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    act(adminAPI.banDriver, "Driver banned", selected.ID)
                  }
                  disabled={selected.Status === "banned"}
                >
                  <Shield size={14} /> Ban
                </Btn>
              </div>
            </div>

            {selected.Status === "pending" && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3 text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Review all documents carefully before approving. Once
                approved the driver can go online and accept rides.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full w-1/3" />
              <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-1/2" />
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
