import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  X,
  Clock,
  ArrowRight,
  Locate,
  Building,
  Home,
} from "lucide-react";

const KEY = import.meta.env.VITE_MAPTILER_KEY || "";

async function geocode(query, signal) {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${KEY}&limit=6&country=ng&language=en`,
      { signal },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f) => ({
      id: f.id,
      name: f.text || f.place_name?.split(",")[0] || "Unknown",
      address: f.place_name || "",
      lat: f.center[1],
      lng: f.center[0],
      type: f.place_type?.[0] || "place",
    }));
  } catch (e) {
    if (e.name === "AbortError") return [];
    return [];
  }
}

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem("drivo_recent") || "[]");
  } catch {
    return [];
  }
}

function saveRecent(item) {
  const recents = [item, ...getRecent().filter((r) => r.id !== item.id)].slice(
    0,
    6,
  );
  localStorage.setItem("drivo_recent", JSON.stringify(recents));
}

function PlaceIcon({ type, selected, color = "brand" }) {
  const cls = selected
    ? "text-white"
    : color === "red"
      ? "text-zinc-400"
      : "text-zinc-400";
  if (type === "address" || type === "poi")
    return <Building size={13} className={cls} />;
  if (type === "neighborhood" || type === "locality")
    return <Home size={13} className={cls} />;
  if (color === "red") return <Navigation size={13} className={cls} />;
  return <MapPin size={13} className={cls} />;
}

export default function LocationSearch({
  onPickup,
  onDropoff,
  onRequest,
  stage,
  ride,
  fmt,
  cancelRide,
}) {
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropoffQuery, setDropoffQuery] = useState("");
  const [pickupResults, setPickupResults] = useState([]);
  const [dropoffResults, setDropoffResults] = useState([]);
  const [pickupSelected, setPickupSelected] = useState(null);
  const [dropoffSelected, setDropoffSelected] = useState(null);
  const [activeField, setActiveField] = useState("pickup");
  const [loadingPickup, setLoadingPickup] = useState(false);
  const [loadingDropoff, setLoadingDropoff] = useState(false);
  const [locating, setLocating] = useState(false);
  const [recent, setRecent] = useState(getRecent());

  const pickupAbort = useRef(null);
  const dropoffAbort = useRef(null);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setActiveField(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchPickup = useCallback(async (q) => {
    if (!q.trim()) {
      setPickupResults([]);
      return;
    }
    pickupAbort.current?.abort();
    pickupAbort.current = new AbortController();
    setLoadingPickup(true);
    const results = await geocode(q, pickupAbort.current.signal);
    setPickupResults(results);
    setLoadingPickup(false);
  }, []);

  const searchDropoff = useCallback(async (q) => {
    if (!q.trim()) {
      setDropoffResults([]);
      return;
    }
    dropoffAbort.current?.abort();
    dropoffAbort.current = new AbortController();
    setLoadingDropoff(true);
    const results = await geocode(q, dropoffAbort.current.signal);
    setDropoffResults(results);
    setLoadingDropoff(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchPickup(pickupQuery), 300);
    return () => clearTimeout(t);
  }, [pickupQuery]);
  useEffect(() => {
    const t = setTimeout(() => searchDropoff(dropoffQuery), 300);
    return () => clearTimeout(t);
  }, [dropoffQuery]);

  const selectPickup = (item) => {
    setPickupSelected(item);
    setPickupQuery(item.name);
    setPickupResults([]);
    setActiveField("dropoff");
    saveRecent(item);
    setRecent(getRecent());
    // ← KEY FIX: pass full address object, not just {lat,lng}
    onPickup({
      lat: item.lat,
      lng: item.lng,
      address: item.address || item.name,
    });
    setTimeout(() => dropoffRef.current?.focus(), 100);
  };

  const selectDropoff = (item) => {
    setDropoffSelected(item);
    setDropoffQuery(item.name);
    setDropoffResults([]);
    setActiveField(null);
    saveRecent(item);
    setRecent(getRecent());
    // ← KEY FIX: pass full address object
    onDropoff({
      lat: item.lat,
      lng: item.lng,
      address: item.address || item.name,
    });
  };

  const clearPickup = () => {
    setPickupSelected(null);
    setPickupQuery("");
    setPickupResults([]);
    setActiveField("pickup");
    onPickup(null);
    pickupRef.current?.focus();
  };

  const clearDropoff = () => {
    setDropoffSelected(null);
    setDropoffQuery("");
    setDropoffResults([]);
    setActiveField("dropoff");
    onDropoff(null);
    dropoffRef.current?.focus();
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${KEY}&language=en`,
          );
          const data = await res.json();
          const place = data.features?.[0];
          const name = place?.text || "My Location";
          const address =
            place?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const item = {
            id: "my-location",
            name,
            address,
            lat,
            lng,
            type: "place",
          };
          setPickupSelected(item);
          setPickupQuery(name);
          setActiveField("dropoff");
          onPickup({ lat, lng, address });
          setTimeout(() => dropoffRef.current?.focus(), 100);
        } catch {
          const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setPickupSelected({
            id: "my-location",
            name: "My Location",
            address,
            lat,
            lng,
          });
          setPickupQuery("My Location");
          setActiveField("dropoff");
          onPickup({ lat, lng, address });
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const canRequest = pickupSelected && dropoffSelected;
  const showPickupDropdown =
    activeField === "pickup" && (pickupQuery.length > 1 || recent.length > 0);
  const showDropoffDropdown =
    activeField === "dropoff" && (dropoffQuery.length > 1 || recent.length > 0);

  if (stage === "searching")
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-zinc-50 dark:bg-zinc-800/80 rounded-3xl p-7 text-center">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="w-16 h-16 border-4 border-brand/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-brand rounded-full animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">
              🔍
            </span>
          </div>
          <p className="font-display font-bold text-zinc-900 dark:text-white text-lg">
            Finding your driver
          </p>
          <p className="text-zinc-500 text-sm mt-1">
            Matching with nearby drivers...
          </p>
          {ride && (
            <p className="text-brand font-black text-3xl mt-4 font-display">
              {fmt(ride.estimated_fare)}
            </p>
          )}
          <div className="mt-5 pt-5 border-t border-zinc-200 dark:border-zinc-700 space-y-2 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-brand flex-shrink-0" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {pickupQuery || "Pickup"}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {dropoffQuery || "Dropoff"}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={cancelRide}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors active:scale-[0.98]"
        >
          Cancel Request
        </button>
      </motion.div>
    );

  return (
    <motion.div
      ref={containerRef}
      className="space-y-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-3">
        <p className="font-display font-bold text-base text-zinc-900 dark:text-white">
          Where to?
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">
          Search for your pickup and destination
        </p>
      </div>

      {/* ── Pickup ── */}
      <div className="relative">
        <div
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all bg-white dark:bg-zinc-800/90 ${activeField === "pickup" ? "border-brand shadow-lg shadow-brand/10" : "border-zinc-100 dark:border-zinc-700/60"}`}
        >
          <div className="relative flex-shrink-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${pickupSelected ? "bg-brand" : "bg-zinc-100 dark:bg-zinc-700"}`}
            >
              <PlaceIcon
                type={pickupSelected?.type}
                selected={!!pickupSelected}
              />
            </div>
            {pickupSelected && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-brand rounded-full border-2 border-white dark:border-zinc-900"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
              Pickup
            </p>
            <input
              ref={pickupRef}
              value={pickupQuery}
              onChange={(e) => {
                setPickupQuery(e.target.value);
                setPickupSelected(null);
              }}
              onFocus={() => setActiveField("pickup")}
              placeholder="Search pickup..."
              className="w-full text-sm font-medium text-zinc-900 dark:text-white bg-transparent outline-none placeholder-zinc-400 dark:placeholder-zinc-600"
            />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {loadingPickup && (
              <div className="w-4 h-4 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
            )}
            {pickupSelected && !loadingPickup && (
              <button
                onClick={clearPickup}
                className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center hover:bg-zinc-200 transition-colors"
              >
                <X size={11} className="text-zinc-500" />
              </button>
            )}
            {!pickupSelected && !loadingPickup && (
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center hover:bg-brand/20 transition-colors"
                title="Use my location"
              >
                <Locate
                  size={13}
                  className={`text-brand ${locating ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showPickupDropdown && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-float border border-zinc-100 dark:border-zinc-800 overflow-hidden z-50"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.14 }}
            >
              {!pickupQuery && recent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <Clock size={11} className="text-zinc-400" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Recent
                    </p>
                  </div>
                  {recent.map((item, i) => (
                    <ResultRow
                      key={i}
                      item={item}
                      onSelect={selectPickup}
                      isRecent
                    />
                  ))}
                  {pickupResults.length > 0 && (
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4 my-1" />
                  )}
                </div>
              )}
              {pickupQuery && pickupResults.length === 0 && !loadingPickup && (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-zinc-400">
                    No results for "{pickupQuery}"
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Try a different search term
                  </p>
                </div>
              )}
              {pickupResults.map((item, i) => (
                <ResultRow
                  key={item.id || i}
                  item={item}
                  onSelect={selectPickup}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* connector dots */}
      <div className="flex items-center gap-3 px-6 py-0.5">
        <div className="flex flex-col gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full"
            />
          ))}
        </div>
      </div>

      {/* ── Dropoff ── */}
      <div className="relative">
        <div
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all bg-white dark:bg-zinc-800/90 ${activeField === "dropoff" ? "border-red-400 shadow-lg shadow-red-400/10" : "border-zinc-100 dark:border-zinc-700/60"}`}
        >
          <div className="relative flex-shrink-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${dropoffSelected ? "bg-red-500" : "bg-zinc-100 dark:bg-zinc-700"}`}
            >
              <PlaceIcon
                type={dropoffSelected?.type}
                selected={!!dropoffSelected}
                color="red"
              />
            </div>
            {dropoffSelected && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
              Dropoff
            </p>
            <input
              ref={dropoffRef}
              value={dropoffQuery}
              onChange={(e) => {
                setDropoffQuery(e.target.value);
                setDropoffSelected(null);
              }}
              onFocus={() => setActiveField("dropoff")}
              placeholder="Search destination..."
              className="w-full text-sm font-medium text-zinc-900 dark:text-white bg-transparent outline-none placeholder-zinc-400 dark:placeholder-zinc-600"
            />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {loadingDropoff && (
              <div className="w-4 h-4 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
            )}
            {dropoffSelected && !loadingDropoff && (
              <button
                onClick={clearDropoff}
                className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center hover:bg-zinc-200 transition-colors"
              >
                <X size={11} className="text-zinc-500" />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showDropoffDropdown && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-float border border-zinc-100 dark:border-zinc-800 overflow-hidden z-50"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.14 }}
            >
              {!dropoffQuery && recent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <Clock size={11} className="text-zinc-400" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Recent
                    </p>
                  </div>
                  {recent.map((item, i) => (
                    <ResultRow
                      key={i}
                      item={item}
                      onSelect={selectDropoff}
                      isRecent
                    />
                  ))}
                  {dropoffResults.length > 0 && (
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4 my-1" />
                  )}
                </div>
              )}
              {dropoffQuery &&
                dropoffResults.length === 0 &&
                !loadingDropoff && (
                  <div className="px-4 py-5 text-center">
                    <p className="text-sm text-zinc-400">
                      No results for "{dropoffQuery}"
                    </p>
                  </div>
                )}
              {dropoffResults.map((item, i) => (
                <ResultRow
                  key={item.id || i}
                  item={item}
                  onSelect={selectDropoff}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* hint */}
      <AnimatePresence>
        {pickupSelected && !dropoffSelected && activeField !== "dropoff" && (
          <motion.div
            className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-base">👆</span>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Now search for your dropoff destination
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA strip — shown when both selected */}
      <AnimatePresence>
        {canRequest && (
          <motion.div
            className="space-y-2 pt-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-3 flex items-center gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                    {pickupQuery}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                    {dropoffQuery}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onRequest}
              className="w-full py-4 rounded-2xl bg-brand text-white font-display font-bold text-sm flex items-center justify-center gap-2.5 hover:bg-brand-dark active:scale-[0.98] transition-all shadow-lg shadow-brand/25"
            >
              <Navigation size={16} />
              Request Ride
              <ArrowRight size={16} className="ml-auto" />
            </button>
            <button
              onClick={() => {
                clearPickup();
                clearDropoff();
              }}
              className="w-full py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Clear & start over
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultRow({ item, onSelect, isRecent }) {
  return (
    <motion.button
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
      onClick={() => onSelect(item)}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
        {isRecent ? (
          <Clock size={13} className="text-zinc-400" />
        ) : (
          <MapPin size={13} className="text-brand" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
          {item.name}
        </p>
        <p className="text-xs text-zinc-400 truncate mt-0.5">{item.address}</p>
      </div>
      <ArrowRight size={13} className="text-zinc-300 flex-shrink-0" />
    </motion.button>
  );
}
