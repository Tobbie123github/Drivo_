import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  CheckCircle,
  XCircle,
  LogOut,
  Menu,
  Wifi,
  WifiOff,
  Crosshair,
} from "lucide-react";
import { rideAPI, driverAPI } from "../services/api";
import { driverWS } from "../services/websocket";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Btn, Badge, EmptyState, Card } from "../components/ui";
import DrivoMap from "../components/map/DrivoMap";
import toast from "react-hot-toast";

const S = {
  idle: "idle",
  requested: "requested",
  accepted: "accepted",
  arrived: "arrived",
  ongoing: "ongoing",
  completed: "completed",
};

export default function Driver() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [stage, setStage] = useState(S.idle);
  const [isOnline, setIsOnline] = useState(false);
  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [speed, setSpeed] = useState(null); // km/h from GPS
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [panel, setPanel] = useState("ride");
  const [wsOk, setWsOk] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const watchId = useRef(null); // GPS watchPosition ID
  const countdown = useRef(null);
  const firstFix = useRef(false);

  // Restore state
  useEffect(() => {
    const savedStage = localStorage.getItem("drivo_driver_stage");
    const savedRide = localStorage.getItem("drivo_driver_ride");
    if (savedStage && savedStage !== "idle") setStage(savedStage);
    if (savedRide) {
      try {
        setRide(JSON.parse(savedRide));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (stage === "idle") {
      localStorage.removeItem("drivo_driver_stage");
      localStorage.removeItem("drivo_driver_ride");
    } else {
      localStorage.setItem("drivo_driver_stage", stage);
      if (ride) localStorage.setItem("drivo_driver_ride", JSON.stringify(ride));
    }
  }, [stage, ride]);

  useEffect(() => {
    loadProfile();
    driverWS.connect("/ws/driver");
    const u = [
      driverWS.on("connected", () => {
        setWsOk(true);
        setIsOnline(true);
        startLocation();
        toast.success("You are now online 🟢");
      }),
      driverWS.on("disconnected", () => {
        setWsOk(false);
        setIsOnline(false);
        stopLocation();
        toast("Connection lost — you are offline", { icon: "🔴" });
      }),
      driverWS.on("ride_request", (p) => {
        setRide(p);
        setStage(S.requested);
        setTimeLeft(20);
        startCountdown();
        toast.success("🔔 New ride request!", { duration: 5000 });
      }),
      driverWS.on("ride_cancelled_by_rider", (p) => {
        toast.error(p?.message || "Rider cancelled");
        setStage(S.idle);
        setRide(null);
        clearInterval(countdown.current);
      }),
    ];
    return () => {
      u.forEach((f) => f());
      driverWS.disconnect();
      stopLocation();
      clearInterval(countdown.current);
    };
  }, []);

  const startCountdown = () => {
    clearInterval(countdown.current);
    setTimeLeft(20);
    countdown.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(countdown.current);
          setStage(S.idle);
          setRide(null);
          toast("⏱ Request timed out", { icon: "⏰" });
          return 20;
        }
        return t - 1;
      });
    }, 1000);
  };

  const loadProfile = async () => {
    try {
      const r = await driverAPI.getProfile();
      setProfile(r.data.driver);
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const r = await rideAPI.driverHistory();
      const rides = r.data.rides || r.data.data || r.rides || [];
      const list = Array.isArray(rides) ? rides : [];
      setHistory(list);
      // Calculate today's earnings
      const today = new Date().toDateString();
      const earned = list
        .filter(
          (r) =>
            r.Status === "completed" &&
            new Date(r.CreatedAt).toDateString() === today,
        )
        .reduce((sum, r) => sum + (r.ActualFare || r.EstimatedFare || 0), 0);
      setTodayEarnings(earned);
    } catch {}
  };

  useEffect(() => {
    if (panel === "history") loadHistory();
  }, [panel]);

  // Load history on mount to get today's earnings
  useEffect(() => {
    loadHistory();
  }, []);

  // GPS using watchPosition — more precise and continuous
  const startLocation = () => {
    if (!navigator.geolocation) {
      toast.error("GPS not available on this device");
      return;
    }

    // Stop any existing watch
    stopLocation();
    firstFix.current = false;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const kmh =
          pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null;

        setDriverPos(loc);
        setSpeed(kmh);

        // Fly to position on first fix only
        if (!firstFix.current) {
          firstFix.current = true;
          window._drivoMapFlyTo?.(loc);
        }

        // Send to backend
        if (driverWS.isConnected()) {
          driverWS.send("location_update", {
            latitude: loc.lat,
            longitude: loc.lng,
          });
        }
      },
      (err) => {
        console.error("GPS error:", err.code, err.message);
        if (err.code === 1) toast.error("Please enable GPS / location access");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000, // accept cached position up to 2s old
      },
    );
  };

  const stopLocation = () => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSpeed(null);
  };

  const recenterMap = () => {
    if (driverPos) {
      window._drivoMapFlyTo?.(driverPos);
    } else {
      toast("Waiting for GPS fix...", { icon: "📡" });
    }
  };

  const accept = () => {
    if (!ride) return;
    clearInterval(countdown.current);
    driverWS.send("ride_response", { ride_id: ride.ride_id, action: "accept" });
    setStage(S.accepted);
    toast.success("Ride accepted!");
  };

  const reject = () => {
    if (!ride) return;
    clearInterval(countdown.current);
    driverWS.send("ride_response", { ride_id: ride.ride_id, action: "reject" });
    setStage(S.idle);
    setRide(null);
    toast("Rejected", { icon: "❌" });
  };

  const markArrived = () => {
    if (!ride) return;
    driverWS.send("driver_arrived", { ride_id: ride.ride_id });
    setStage(S.arrived);
    toast.success("Marked as arrived!");
  };

  const startTrip = () => {
    if (!ride) return;
    driverWS.send("start_trip", { ride_id: ride.ride_id });
    setStage(S.ongoing);
    toast.success("Trip started!");
  };

  const endTrip = () => {
    if (!ride) return;
    driverWS.send("end_trip", { ride_id: ride.ride_id });
    setStage(S.completed);
  };

  const cancelRide = async () => {
    if (!ride) return;
    try {
      await rideAPI.driverCancel({ ride_id: ride.ride_id });
      setStage(S.idle);
      setRide(null);
      clearInterval(countdown.current);
      toast("Cancelled", { icon: "❌" });
    } catch {
      toast.error("Cancel failed");
    }
  };

  const onDone = () => {
    setStage(S.idle);
    setRide(null);
    localStorage.removeItem("drivo_driver_stage");
    localStorage.removeItem("drivo_driver_ride");
    loadProfile();
    loadHistory(); // refresh earnings
  };

  const fmt = (f) => (f ? `₦${Number(f).toLocaleString()}` : "—");

  const sideProps = {
    user,
    panel,
    setPanel,
    isDark,
    toggle,
    wsOk,
    logout,
    stage,
    ride,
    profile,
    history,
    isOnline,
    speed,
    todayEarnings,
    accept,
    reject,
    markArrived,
    startTrip,
    endTrip,
    cancelRide,
    fmt,
    timeLeft,
    onDone,
  };

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${isDark ? "bg-zinc-950" : "bg-zinc-50"} font-sans`}
    >
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-30 lg:hidden"
              onClick={() => setSideOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 w-[320px] bg-white dark:bg-zinc-900 z-40 lg:hidden shadow-float flex flex-col"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <SideContent {...sideProps} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-[380px] flex-shrink-0 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 z-10">
        <SideContent {...sideProps} />
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <DrivoMap
          driverLoc={driverPos}
          pickupLoc={
            ride && [S.requested, S.accepted, S.arrived].includes(stage)
              ? { lat: ride.pickup_lat, lng: ride.pickup_lng }
              : null
          }
          dropoffLoc={
            ride && stage === S.ongoing
              ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng }
              : null
          }
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pointer-events-none">
          <button
            onClick={() => setSideOpen(true)}
            className="lg:hidden pointer-events-auto w-11 h-11 glass-light dark:glass-dark rounded-2xl flex items-center justify-center shadow-card text-zinc-700 dark:text-zinc-200"
          >
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-2 pointer-events-auto">
            {/* Speed badge — only when moving */}
            {speed != null && speed > 2 && (
              <motion.div
                className="px-3 py-1.5 rounded-full text-xs font-bold glass-light dark:glass-dark shadow-sm text-zinc-700 dark:text-zinc-200 font-display"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {speed} km/h
              </motion.div>
            )}
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold glass-light dark:glass-dark shadow-sm flex items-center gap-1.5 ${isOnline ? "text-brand" : "text-zinc-500"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? "bg-brand animate-pulse" : "bg-zinc-400"}`}
              />
              {isOnline ? "Online" : "Offline"}
            </div>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center glass-light dark:glass-dark ${wsOk ? "text-brand" : "text-red-500"}`}
            >
              {wsOk ? <Wifi size={14} /> : <WifiOff size={14} />}
            </div>
          </div>
        </div>

        {/* Recenter button */}
        <div className="absolute bottom-6 right-4 pointer-events-auto">
          <button
            onClick={recenterMap}
            className="w-12 h-12 glass-light dark:glass-dark rounded-2xl flex items-center justify-center shadow-float border border-zinc-200/50 dark:border-zinc-700/50 text-brand hover:bg-brand hover:text-white transition-all active:scale-95"
          >
            <Crosshair size={20} />
          </button>
        </div>

        {/* GPS status indicator — no fix yet */}
        <AnimatePresence>
          {isOnline && !driverPos && (
            <motion.div
              className="absolute top-20 left-1/2 -translate-x-1/2 glass-light dark:glass-dark rounded-2xl px-4 py-2.5 shadow-float flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 pointer-events-none"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              Acquiring GPS location...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile ride request sheet */}
        <AnimatePresence>
          {stage === S.requested && ride && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 lg:hidden glass-light dark:glass-dark rounded-t-3xl p-5 safe-bottom shadow-panel z-10"
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display font-bold text-lg text-zinc-900 dark:text-white">
                    New Ride!
                  </p>
                  <p className="text-brand font-black text-2xl font-display">
                    {fmt(ride.estimated_fare)}
                  </p>
                </div>
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black font-display ${timeLeft <= 5 ? "bg-red-500 text-white animate-pulse" : "bg-brand/10 text-brand"}`}
                >
                  {timeLeft}s
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                  <span className="text-zinc-600 dark:text-zinc-300 truncate">
                    {ride.pickup_address ||
                      `${ride.pickup_lat?.toFixed(4)}, ${ride.pickup_lng?.toFixed(4)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-zinc-600 dark:text-zinc-300 truncate">
                    {ride.dropoff_address ||
                      `${ride.dropoff_lat?.toFixed(4)}, ${ride.dropoff_lng?.toFixed(4)}`}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 pl-4">
                  {ride.distance_km?.toFixed(1)}km · ⭐{" "}
                  {ride.rider_rating?.toFixed(1) || "New rider"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Btn variant="danger" onClick={reject}>
                  <XCircle size={16} /> Reject
                </Btn>
                <Btn onClick={accept}>
                  <CheckCircle size={16} /> Accept
                </Btn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile active trip sheet */}
        <AnimatePresence>
          {[S.accepted, S.arrived, S.ongoing, S.completed].includes(stage) && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 lg:hidden glass-light dark:glass-dark rounded-t-3xl p-5 safe-bottom shadow-panel z-10"
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mb-4" />
              <MobileTripStatus
                stage={stage}
                ride={ride}
                fmt={fmt}
                markArrived={markArrived}
                startTrip={startTrip}
                endTrip={endTrip}
                cancelRide={cancelRide}
                onDone={onDone}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MobileTripStatus({
  stage,
  ride,
  fmt,
  markArrived,
  startTrip,
  endTrip,
  cancelRide,
  onDone,
}) {
  if (stage === S.accepted)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Badge color="blue">Heading to pickup</Badge>
            <p className="text-sm text-zinc-500 mt-1.5 truncate max-w-[220px]">
              {ride?.pickup_address || "Pickup location"}
            </p>
          </div>
          <p className="text-brand font-black text-xl font-display">
            {fmt(ride?.estimated_fare)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="danger" size="sm" onClick={cancelRide}>
            Cancel
          </Btn>
          <Btn size="sm" onClick={markArrived}>
            <MapPin size={14} /> Arrived
          </Btn>
        </div>
      </div>
    );
  if (stage === S.arrived)
    return (
      <div className="space-y-3">
        <div className="text-center">
          <p className="font-display font-bold text-lg text-zinc-900 dark:text-white">
            🎯 You've arrived!
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Waiting for rider to board
          </p>
        </div>
        <Btn onClick={startTrip}>
          <Navigation size={15} /> Start Trip
        </Btn>
      </div>
    );
  if (stage === S.ongoing)
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-zinc-900 dark:text-white">
            🚗 Trip in progress
          </p>
          <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[200px]">
            {ride?.dropoff_address || "Heading to dropoff"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-brand font-black text-xl font-display">
            {fmt(ride?.estimated_fare)}
          </p>
          <button
            onClick={endTrip}
            className="text-xs font-semibold text-red-500 mt-1 hover:underline"
          >
            End Trip
          </button>
        </div>
      </div>
    );
  if (stage === S.completed)
    return (
      <div className="text-center space-y-3">
        <p className="font-display font-black text-xl text-zinc-900 dark:text-white">
          🏁 Trip Complete!
        </p>
        <p className="text-brand font-black text-3xl font-display">
          {fmt(ride?.estimated_fare)}
        </p>
        <Btn variant="ghost" className="w-full" onClick={onDone}>
          Done
        </Btn>
      </div>
    );
  return null;
}

function SideContent({
  user,
  panel,
  setPanel,
  isDark,
  toggle,
  wsOk,
  logout,
  stage,
  ride,
  profile,
  history,
  isOnline,
  speed,
  todayEarnings,
  accept,
  reject,
  markArrived,
  startTrip,
  endTrip,
  cancelRide,
  fmt,
  timeLeft,
  onDone,
}) {
  return (
    <>
      {/* Header */}
      <div className="p-5 flex items-center justify-between flex-shrink-0 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white font-display">
            Driv<span className="text-brand">o</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Driver</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <div
            className={`w-2 h-2 rounded-full ${wsOk ? "bg-brand" : "bg-red-400"}`}
          />
        </div>
      </div>

      {/* Online status */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        <div
          className={`w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2.5 ${
            isOnline
              ? "bg-brand/10 text-brand border-2 border-brand/20"
              : "bg-red-50 dark:bg-red-500/10 text-red-500 border-2 border-red-200 dark:border-red-500/30"
          }`}
        >
          <span
            className={`w-3 h-3 rounded-full ${isOnline ? "bg-brand animate-pulse" : "bg-red-500 animate-pulse"}`}
          />
          {isOnline ? "Online — Receiving Rides" : "Offline — Reconnecting..."}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 p-3 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        {[
          {
            label: "Rating",
            val: `${Number(profile?.Rating || 5).toFixed(1)}⭐`,
          },
          { label: "Trips", val: profile?.TotalTrips || 0 },
          {
            label: "Today",
            val:
              todayEarnings > 0
                ? `₦${(todayEarnings / 1000).toFixed(1)}k`
                : "₦0",
          },
          {
            label: "Speed",
            val: speed != null && isOnline ? `${speed}km/h` : "—",
          },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-2 text-center"
          >
            <p className="font-display font-bold text-xs text-zinc-900 dark:text-white leading-tight">
              {val}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-1 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        {[
          { k: "ride", icon: "🚗", label: "Ride" },
          { k: "history", icon: "📋", label: "History" },
          { k: "profile", icon: "👤", label: "Profile" },
        ].map(({ k, icon, label }) => (
          <button
            key={k}
            onClick={() => setPanel(k)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${panel === k ? "bg-brand text-white shadow-brand" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"}`}
          >
            <span>{icon}</span>
            {label}
            {/* Pulse badge on ride tab when request comes in */}
            {k === "ride" && stage === S.requested && panel !== "ride" && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
        {panel === "ride" && (
          <DriverRidePanel
            stage={stage}
            ride={ride}
            isOnline={isOnline}
            accept={accept}
            reject={reject}
            markArrived={markArrived}
            startTrip={startTrip}
            endTrip={endTrip}
            cancelRide={cancelRide}
            fmt={fmt}
            timeLeft={timeLeft}
            onDone={onDone}
          />
        )}

        {panel === "history" &&
          (history.length === 0 ? (
            <EmptyState
              icon="🚗"
              title="No trips yet"
              subtitle="Completed trips appear here"
            />
          ) : (
            <div className="space-y-2">
              {/* Today's earnings summary */}
              {todayEarnings > 0 && (
                <div className="bg-brand/5 border border-brand/20 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Today's Earnings
                    </p>
                    <p className="font-display font-black text-brand text-xl mt-0.5">
                      {fmt(todayEarnings)}
                    </p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              )}
              {history.map((r, i) => (
                <Card key={r.ID || i} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Badge
                        color={
                          r.Status === "completed"
                            ? "green"
                            : r.Status === "cancelled"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {r.Status}
                      </Badge>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white mt-2 truncate">
                        {r.PickupAddress || "Pickup"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">
                        → {r.DropoffAddress || "Dropoff"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(r.CreatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display font-bold text-brand">
                        {fmt(r.ActualFare || r.EstimatedFare)}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {r.DistanceKm?.toFixed(1)}km
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}

        {panel === "profile" && profile && (
          <div className="space-y-3">
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-3xl p-6 text-center">
              <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center text-3xl font-black text-brand font-display mx-auto mb-3">
                {user?.Name?.[0]}
              </div>
              <p className="font-display font-bold text-xl text-zinc-900 dark:text-white">
                {user?.Name}
              </p>
              <p className="text-zinc-500 text-sm">{user?.Email}</p>
              <div className="mt-3 flex justify-center">
                <Badge
                  color={
                    profile.Status === "active"
                      ? "green"
                      : profile.Status === "pending"
                        ? "yellow"
                        : "red"
                  }
                >
                  {profile.Status}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  l: "Rating",
                  v: `${Number(profile.Rating || 5).toFixed(2)} ⭐`,
                },
                { l: "Total Trips", v: profile.TotalTrips || 0 },
                { l: "Acceptance", v: `${profile.AcceptanceRate || 100}%` },
                { l: "Cancellation", v: `${profile.CancellationRate || 0}%` },
              ].map(({ l, v }) => (
                <div
                  key={l}
                  className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3"
                >
                  <p className="font-display font-bold text-sm text-zinc-900 dark:text-white">
                    {v}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            {!profile.IsOnboardingCompleted && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3 text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Complete onboarding to start accepting rides
              </div>
            )}
            <Btn variant="danger" onClick={logout}>
              <LogOut size={16} /> Sign Out
            </Btn>
          </div>
        )}
      </div>
    </>
  );
}

function DriverRidePanel({
  stage,
  ride,
  isOnline,
  accept,
  reject,
  markArrived,
  startTrip,
  endTrip,
  cancelRide,
  fmt,
  timeLeft,
  onDone,
}) {
  if (stage === S.idle)
    return (
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-8 text-center">
        <motion.div
          className="text-6xl mb-3"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        >
          {isOnline ? "🟢" : "🔴"}
        </motion.div>
        <p className="font-display font-bold text-zinc-900 dark:text-white text-lg">
          {isOnline ? "Waiting for rides..." : "Reconnecting..."}
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          {isOnline
            ? "Ride requests will appear here"
            : "Check your internet connection"}
        </p>
      </div>
    );

  if (stage === S.requested && ride)
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="relative overflow-hidden bg-zinc-50 dark:bg-zinc-800 rounded-3xl p-5">
          <div className="absolute top-4 right-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black font-display ${timeLeft <= 5 ? "bg-red-500 text-white animate-pulse" : "bg-brand/10 text-brand"}`}
            >
              {timeLeft}s
            </div>
          </div>
          <p className="font-display font-bold text-lg text-zinc-900 dark:text-white mb-1">
            New Ride Request!
          </p>
          <p className="text-brand font-black text-3xl font-display mb-4">
            {fmt(ride.estimated_fare)}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
              <span className="text-zinc-600 dark:text-zinc-300 truncate">
                {ride.pickup_address ||
                  `${ride.pickup_lat?.toFixed(4)}, ${ride.pickup_lng?.toFixed(4)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-zinc-600 dark:text-zinc-300 truncate">
                {ride.dropoff_address ||
                  `${ride.dropoff_lat?.toFixed(4)}, ${ride.dropoff_lng?.toFixed(4)}`}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 text-xs">
            <div>
              <p className="text-zinc-400">Distance</p>
              <p className="font-bold text-zinc-900 dark:text-white">
                {ride.distance_km?.toFixed(1)} km
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Rider</p>
              <p className="font-bold text-zinc-900 dark:text-white">
                ⭐ {ride.rider_rating?.toFixed(1) || "New"}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Fare</p>
              <p className="font-bold text-brand">{fmt(ride.estimated_fare)}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="danger" onClick={reject}>
            <XCircle size={16} /> Reject
          </Btn>
          <Btn onClick={accept}>
            <CheckCircle size={16} /> Accept
          </Btn>
        </div>
      </motion.div>
    );

  if (stage === S.accepted)
    return (
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-3xl p-5">
          <Badge color="blue">Heading to pickup</Badge>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-brand" />
              <span className="text-zinc-600 dark:text-zinc-300 truncate">
                {ride?.pickup_address || "Pickup location"}
              </span>
            </div>
          </div>
          <p className="text-brand font-black text-2xl mt-3 font-display">
            {fmt(ride?.estimated_fare)}
          </p>
        </div>
        <Btn onClick={markArrived}>
          <MapPin size={16} /> I've Arrived
        </Btn>
        <Btn variant="danger" onClick={cancelRide}>
          Cancel Ride
        </Btn>
      </motion.div>
    );

  if (stage === S.arrived)
    return (
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-brand/5 border-2 border-brand/20 rounded-3xl p-6 text-center">
          <motion.div
            className="text-5xl mb-3"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: 3, duration: 0.5 }}
          >
            🎯
          </motion.div>
          <p className="font-display font-bold text-xl text-zinc-900 dark:text-white">
            You've arrived!
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Waiting for rider to board
          </p>
        </div>
        <Btn onClick={startTrip}>
          <Navigation size={16} /> Start Trip
        </Btn>
        <Btn variant="danger" onClick={cancelRide}>
          Cancel
        </Btn>
      </motion.div>
    );

  if (stage === S.ongoing)
    return (
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-3xl p-6 text-center">
          <motion.div
            className="text-5xl mb-3"
            animate={{ x: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          >
            🚗
          </motion.div>
          <p className="font-display font-bold text-xl text-zinc-900 dark:text-white">
            Trip in progress
          </p>
          <p className="text-brand font-black text-3xl mt-2 font-display">
            {fmt(ride?.estimated_fare)}
          </p>
          {ride?.dropoff_address && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="truncate max-w-[220px]">
                {ride.dropoff_address}
              </span>
            </div>
          )}
        </div>
        <Btn variant="outline" onClick={endTrip}>
          <CheckCircle size={16} /> End Trip
        </Btn>
      </motion.div>
    );

  if (stage === S.completed)
    return (
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="bg-brand/5 border-2 border-brand/20 rounded-3xl p-6 text-center">
          <motion.div
            className="text-5xl mb-3"
            initial={{ rotate: -15 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring" }}
          >
            🏁
          </motion.div>
          <p className="font-display font-black text-2xl text-zinc-900 dark:text-white">
            Trip Complete!
          </p>
          <p className="text-brand font-black text-3xl mt-2 font-display">
            {fmt(ride?.estimated_fare)}
          </p>
          <p className="text-zinc-400 text-xs mt-1">
            Great work! Keep it up 💪
          </p>
        </div>
        <Btn variant="ghost" onClick={onDone}>
          Done
        </Btn>
      </motion.div>
    );

  return null;
}
