import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Menu, Wifi, WifiOff, LogOut } from "lucide-react";
import { rideAPI, ratingAPI } from "../services/api";
import { riderWS } from "../services/websocket";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Btn,
  Badge,
  Modal,
  StarRating,
  EmptyState,
  Card,
} from "../components/ui";
import DrivoMap from "../components/map/DrivoMap";
import LocationSearch from "../components/LocationSearch";
import toast from "react-hot-toast";

const S = {
  idle: "idle",
  searching: "searching",
  accepted: "accepted",
  arrived: "arrived",
  ongoing: "ongoing",
  completed: "completed",
};

export default function Rider() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [stage, setStage] = useState(S.idle);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [ride, setRide] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [panel, setPanel] = useState("ride");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sideOpen, setSideOpen] = useState(false);
  const [wsOk, setWsOk] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const stageRef = useRef(stage);
  const rideRef = useRef(ride);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    rideRef.current = ride;
  }, [ride]);

  // Restore on mount
  useEffect(() => {
    const savedStage = localStorage.getItem("drivo_rider_stage");
    const savedRide = localStorage.getItem("drivo_rider_ride");
    const savedPickup = localStorage.getItem("drivo_rider_pickup");
    const savedDropoff = localStorage.getItem("drivo_rider_dropoff");
    const savedDriverInfo = localStorage.getItem("drivo_rider_driverinfo");
    if (savedStage && savedStage !== "idle") setStage(savedStage);
    if (savedRide) {
      try {
        setRide(JSON.parse(savedRide));
      } catch {}
    }
    if (savedPickup) {
      try {
        setPickup(JSON.parse(savedPickup));
      } catch {}
    }
    if (savedDropoff) {
      try {
        setDropoff(JSON.parse(savedDropoff));
      } catch {}
    }
    if (savedDriverInfo) {
      try {
        setDriverInfo(JSON.parse(savedDriverInfo));
      } catch {}
    }
  }, []);

  // Save on change
  useEffect(() => {
    if (stage === "idle") {
      [
        "drivo_rider_stage",
        "drivo_rider_ride",
        "drivo_rider_pickup",
        "drivo_rider_dropoff",
        "drivo_rider_driverinfo",
      ].forEach((k) => localStorage.removeItem(k));
    } else {
      localStorage.setItem("drivo_rider_stage", stage);
      if (ride) localStorage.setItem("drivo_rider_ride", JSON.stringify(ride));
      if (pickup)
        localStorage.setItem("drivo_rider_pickup", JSON.stringify(pickup));
      if (dropoff)
        localStorage.setItem("drivo_rider_dropoff", JSON.stringify(dropoff));
      if (driverInfo)
        localStorage.setItem(
          "drivo_rider_driverinfo",
          JSON.stringify(driverInfo),
        );
    }
  }, [stage, ride, pickup, dropoff, driverInfo]);

  useEffect(() => {
    riderWS.connect("/ws/rider");
    const u = [
      riderWS.on("connected", () => setWsOk(true)),
      riderWS.on("disconnected", () => setWsOk(false)),
      riderWS.on("ride_accepted", (p) => {
        setDriverInfo(p);
        setStage(S.accepted);
        toast.success(`🚗 ${p.driver_name} is on the way!`);
      }),
      riderWS.on("driver_is_here", () => {
        setStage(S.arrived);
        toast.success("🎯 Your driver has arrived!");
      }),
      riderWS.on("ride_started", () => {
        setStage(S.ongoing);
        toast.success("🚀 Trip started!");
      }),
      riderWS.on("driver_location", (p) => {
        setDriverLoc({ lat: p.latitude, lng: p.longitude });
      }),
      riderWS.on("ride_completed", (p) => {
        setRide((r) => ({ ...r, ...p }));
        setStage(S.completed);
      }),
      riderWS.on("rate_driver", () => {
        setTimeout(() => setRatingOpen(true), 1200);
      }),
      riderWS.on("ride_cancelled_by_driver", (p) => {
        toast.error(p?.message || "Driver cancelled");
        reset();
      }),
      riderWS.on("ride_cancelled_by_rider", () => reset()),
      riderWS.on("no_candidates", (p) => {
        toast.error(
          p?.message || "No drivers available nearby. Please try again.",
        );
        reset();
      }),
    ];
    return () => {
      u.forEach((f) => f());
      riderWS.disconnect();
    };
  }, []);

  const reset = () => {
    setStage(S.idle);
    setPickup(null);
    setDropoff(null);
    setRide(null);
    setDriverInfo(null);
    setDriverLoc(null);
    setCancelling(false);
    [
      "drivo_rider_stage",
      "drivo_rider_ride",
      "drivo_rider_pickup",
      "drivo_rider_dropoff",
      "drivo_rider_driverinfo",
    ].forEach((k) => localStorage.removeItem(k));
  };

  const loadHistory = async () => {
    try {
      const r = await rideAPI.riderHistory();
      setHistory(r.data.rides || []);
    } catch {}
  };
  useEffect(() => {
    if (panel === "history") loadHistory();
  }, [panel]);

  const requestRide = async () => {
    if (!pickup || !dropoff) return;
    setStage(S.searching);
    try {
      const res = await rideAPI.request({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        pickup_address: pickup.address || "Selected location",
        dropoff_address: dropoff.address || "Selected location",
      });
      if (stageRef.current === S.searching) setRide(res.data);
    } catch (e) {
      if (stageRef.current === S.searching) {
        toast.error(e.response?.data?.error || "Request failed");
        setStage(S.idle);
      }
    }
  };

  const cancelRide = async () => {
    if (cancelling) return;
    const currentRide = ride || rideRef.current;
    const rideId = currentRide?.ride_id || currentRide?.ID || currentRide?.id;
    if (!rideId) {
      reset();
      toast("Search cancelled");
      return;
    }
    setCancelling(true);
    try {
      await rideAPI.cancel({ ride_id: rideId });
      reset();
      toast("Ride cancelled");
    } catch (e) {
      const msg = e.response?.data?.error || "";
      if (
        msg.includes("cancelled") ||
        msg.includes("status") ||
        msg.includes("cannot cancel")
      ) {
        reset();
        return;
      }
      toast.error(msg || "Cancel failed");
      setCancelling(false);
    }
  };

  const submitRating = async () => {
    if (!rating || !ride) return;
    try {
      await ratingAPI.rateDriver({
        ride_id: ride.ride_id,
        score: rating,
        comment,
      });
      toast.success("Thanks for rating! ⭐");
      setRatingOpen(false);
      reset();
      setRating(0);
      setComment("");
    } catch {
      toast.error("Rating failed");
    }
  };

  const fmt = (f) => (f ? `₦${Number(f).toLocaleString()}` : "—");

  const sidebarProps = {
    user,
    panel,
    setPanel,
    isDark,
    toggle,
    wsOk,
    logout,
    stage,
    ride,
    driverInfo,
    history,
    pickup,
    dropoff,
    setPickup,
    setDropoff,
    reset,
    requestRide,
    cancelRide,
    fmt,
    setRatingOpen,
  };

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${isDark ? "bg-zinc-950" : "bg-zinc-50"} font-sans`}
    >
      {/* Mobile sidebar overlay */}
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
              <SidebarContent {...sidebarProps} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-[380px] flex-shrink-0 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 z-10">
        <SidebarContent {...sidebarProps} />
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <DrivoMap
          pickupLoc={pickup}
          dropoffLoc={dropoff}
          driverLoc={driverLoc}
        />

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pointer-events-none">
          <button
            onClick={() => setSideOpen(true)}
            className="lg:hidden pointer-events-auto w-11 h-11 glass-light dark:glass-dark rounded-2xl flex items-center justify-center shadow-card text-zinc-700 dark:text-zinc-200"
          >
            <Menu size={20} />
          </button>
          <div className="ml-auto pointer-events-auto">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold glass-light dark:glass-dark shadow-sm ${wsOk ? "text-brand" : "text-red-500"}`}
            >
              {wsOk ? <Wifi size={12} /> : <WifiOff size={12} />}
              {wsOk ? "Live" : "Offline"}
            </div>
          </div>
        </div>

        {/* Mobile bottom sheet — active ride states only */}
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
              <MobileStatus
                stage={stage}
                ride={ride}
                driverInfo={driverInfo}
                cancelRide={cancelRide}
                fmt={fmt}
                setRatingOpen={setRatingOpen}
                reset={reset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rating Modal */}
      <Modal
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        title="Rate your driver"
      >
        <div className="flex flex-col gap-5">
          {driverInfo && (
            <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
              <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center text-2xl font-black text-brand font-display">
                {driverInfo.driver_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {driverInfo.driver_name}
                </p>
                <p className="text-sm text-zinc-500">
                  {driverInfo.vehicle_make} {driverInfo.vehicle_model}
                </p>
              </div>
            </div>
          )}
          <div className="text-center">
            <p className="text-zinc-500 text-sm mb-4">
              How was your experience?
            </p>
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>
          <textarea
            className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand resize-none border-2 border-transparent focus:border-brand transition-all"
            rows={3}
            placeholder="Leave a comment (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-3">
            <Btn
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setRatingOpen(false);
                reset();
              }}
            >
              Skip
            </Btn>
            <Btn className="flex-1" onClick={submitRating} disabled={!rating}>
              Submit ⭐
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SidebarContent({
  user,
  panel,
  setPanel,
  isDark,
  toggle,
  wsOk,
  logout,
  stage,
  ride,
  driverInfo,
  history,
  pickup,
  dropoff,
  setPickup,
  setDropoff,
  reset,
  requestRide,
  cancelRide,
  fmt,
  setRatingOpen,
}) {
  return (
    <>
      <div className="p-5 flex items-center justify-between flex-shrink-0 border-b border-zinc-100 dark:border-zinc-800">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white font-display">
          Driv<span className="text-brand">o</span>
        </h1>
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

      <div className="flex p-2 gap-1 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        {[
          { k: "ride", label: "Ride", icon: "🚗" },
          { k: "history", label: "History", icon: "📋" },
          { k: "profile", label: "Profile", icon: "👤" },
        ].map(({ k, label, icon }) => (
          <button
            key={k}
            onClick={() => setPanel(k)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${panel === k ? "bg-brand text-white shadow-brand" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"}`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
        {panel === "ride" &&
          ([S.idle, S.searching].includes(stage) ? (
            <LocationSearch
              onPickup={setPickup}
              onDropoff={setDropoff}
              onRequest={requestRide}
              stage={stage}
              ride={ride}
              fmt={fmt}
              cancelRide={cancelRide}
            />
          ) : (
            <ActiveRidePanel
              stage={stage}
              ride={ride}
              driverInfo={driverInfo}
              cancelRide={cancelRide}
              fmt={fmt}
              setRatingOpen={setRatingOpen}
              reset={reset}
            />
          ))}
        {panel === "history" && <HistoryPanel history={history} fmt={fmt} />}
        {panel === "profile" && <ProfilePanel user={user} logout={logout} />}
      </div>
    </>
  );
}

function ActiveRidePanel({
  stage,
  ride,
  driverInfo,
  cancelRide,
  fmt,
  setRatingOpen,
  reset,
}) {
  if (stage === S.accepted && driverInfo)
    return (
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-2xl font-black text-brand font-display flex-shrink-0">
              {driverInfo.driver_name?.[0]}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-zinc-900 dark:text-white">
                {driverInfo.driver_name}
              </p>
              <p className="text-sm text-zinc-500">{driverInfo.driver_phone}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {driverInfo.rating?.toFixed(1)}
                </span>
              </div>
            </div>
            <Badge color="green">ETA {driverInfo.eta_minutes}m</Badge>
          </div>
          <div className="bg-white dark:bg-zinc-700/50 rounded-2xl p-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-zinc-400">Make</p>
              <p className="font-semibold text-zinc-900 dark:text-white">
                {driverInfo.vehicle_make || "—"}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Model</p>
              <p className="font-semibold text-zinc-900 dark:text-white">
                {driverInfo.vehicle_model || "—"}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Plate</p>
              <p className="font-semibold text-zinc-900 dark:text-white">
                {driverInfo.plate_number || "—"}
              </p>
            </div>
          </div>
          <p className="text-center text-xs text-zinc-400">
            🚗 Driver is heading to your pickup
          </p>
        </div>
        <Btn variant="danger" onClick={cancelRide}>
          Cancel Ride
        </Btn>
      </motion.div>
    );

  if (stage === S.arrived)
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-brand/5 border-2 border-brand/20 rounded-3xl p-6 text-center">
          <motion.div
            className="text-5xl mb-3"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: 3, duration: 0.5 }}
          >
            🎯
          </motion.div>
          <p className="font-display font-bold text-xl text-zinc-900 dark:text-white">
            Driver has arrived!
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Head to your pickup location
          </p>
          {driverInfo && (
            <div className="mt-4 pt-4 border-t border-brand/20 text-xs text-zinc-500">
              Look for{" "}
              <span className="font-semibold text-zinc-900 dark:text-white">
                {driverInfo.vehicle_color} {driverInfo.vehicle_make}
              </span>{" "}
              ·{" "}
              <span className="font-semibold text-zinc-900 dark:text-white">
                {driverInfo.plate_number}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );

  if (stage === S.ongoing)
    return (
      <motion.div
        className="space-y-4"
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
          <p className="text-sm text-zinc-500 mt-1">
            Sit back and enjoy the ride
          </p>
          {ride && (
            <p className="text-brand text-3xl font-black mt-3 font-display">
              {fmt(ride.estimated_fare)}
            </p>
          )}
        </div>
      </motion.div>
    );

  if (stage === S.completed)
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="bg-brand/5 border-2 border-brand/20 rounded-3xl p-6 text-center">
          <motion.div
            className="text-5xl mb-3"
            initial={{ rotate: -10 }}
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.6 }}
          >
            🏁
          </motion.div>
          <p className="font-display font-black text-2xl text-zinc-900 dark:text-white">
            Trip Complete!
          </p>
          {ride?.actual_fare && (
            <p className="text-brand text-4xl font-black mt-2 font-display">
              {fmt(ride.actual_fare)}
            </p>
          )}
          <p className="text-zinc-500 text-sm mt-1">
            {ride?.distance_km?.toFixed(2)} km
          </p>
        </div>
        <Btn onClick={() => setRatingOpen(true)}>⭐ Rate your driver</Btn>
        <Btn variant="ghost" onClick={reset}>
          Done
        </Btn>
      </motion.div>
    );

  return null;
}

function MobileStatus({
  stage,
  ride,
  driverInfo,
  cancelRide,
  fmt,
  setRatingOpen,
  reset,
}) {
  if (stage === S.accepted && driverInfo)
    return (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-xl font-black text-brand font-display flex-shrink-0">
          {driverInfo.driver_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-white truncate">
            {driverInfo.driver_name}
          </p>
          <p className="text-xs text-zinc-500">
            {driverInfo.vehicle_make} · ETA {driverInfo.eta_minutes}min
          </p>
        </div>
        <p className="text-brand font-bold font-display flex-shrink-0">
          {fmt(ride?.estimated_fare)}
        </p>
      </div>
    );
  if (stage === S.arrived)
    return (
      <div className="text-center">
        <p className="text-lg font-bold text-zinc-900 dark:text-white">
          🎯 Driver has arrived!
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          Look for{" "}
          <span className="font-semibold">
            {driverInfo?.vehicle_color} {driverInfo?.vehicle_make}
          </span>
        </p>
      </div>
    );
  if (stage === S.ongoing)
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-zinc-900 dark:text-white">
            🚗 Trip in progress
          </p>
          <p className="text-sm text-zinc-500">Heading to destination</p>
        </div>
        <p className="text-brand font-black text-xl font-display">
          {fmt(ride?.estimated_fare)}
        </p>
      </div>
    );
  if (stage === S.completed)
    return (
      <div className="text-center space-y-3">
        <p className="font-display font-black text-xl text-zinc-900 dark:text-white">
          🏁 Trip Complete!
        </p>
        {ride?.actual_fare && (
          <p className="text-brand text-3xl font-black font-display">
            {fmt(ride.actual_fare)}
          </p>
        )}
        <div className="flex gap-2">
          <Btn variant="ghost" className="flex-1" onClick={reset}>
            Done
          </Btn>
          <Btn className="flex-1" onClick={() => setRatingOpen(true)}>
            Rate ⭐
          </Btn>
        </div>
      </div>
    );
  return null;
}

function HistoryPanel({ history, fmt }) {
  if (history.length === 0)
    return (
      <EmptyState
        icon="🗺️"
        title="No rides yet"
        subtitle="Your ride history will appear here"
      />
    );
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
        Your Rides
      </p>
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
              <p className="text-xs text-zinc-400 mt-1">
                {new Date(r.CreatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-display font-bold text-brand">
                {fmt(r.ActualFare || r.EstimatedFare)}
              </p>
              <p className="text-xs text-zinc-400">
                {r.DistanceKm?.toFixed(1)}km
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ProfilePanel({ user, logout }) {
  return (
    <div className="space-y-3">
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-3xl p-6 text-center">
        <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center text-3xl font-black text-brand font-display mx-auto mb-3">
          {user?.Name?.[0]}
        </div>
        <p className="font-display font-bold text-xl text-zinc-900 dark:text-white">
          {user?.Name}
        </p>
        <p className="text-zinc-500 text-sm">{user?.Email}</p>
        <p className="text-zinc-400 text-xs mt-0.5">{user?.Phone}</p>
      </div>
      <Btn variant="danger" onClick={logout}>
        <LogOut size={16} /> Sign Out
      </Btn>
    </div>
  );
}
