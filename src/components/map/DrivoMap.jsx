import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

const KEY = import.meta.env.VITE_MAPTILER_KEY || "";
const LAGOS = [3.3792, 6.5244];

// Use precise streets style for both themes — best for navigation
function getStyle(dark) {
  return dark
    ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${KEY}`
    : `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;
}

// Load MapLibre once globally — prevent reloading on component remount
let maplibreReady = false;
let maplibreCallbacks = [];

function loadMapLibre() {
  return new Promise((resolve) => {
    if (window.maplibregl) {
      resolve();
      return;
    }
    if (maplibreReady) {
      maplibreCallbacks.push(resolve);
      return;
    }
    maplibreReady = true;
    maplibreCallbacks.push(resolve);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
    script.async = true;
    script.onload = () => {
      maplibreCallbacks.forEach((cb) => cb());
      maplibreCallbacks = [];
    };
    script.onerror = () => console.error("[DrivoMap] Failed to load MapLibre");
    document.head.appendChild(script);
  });
}

export default function DrivoMap({
  onMapClick,
  pickupLoc,
  dropoffLoc,
  driverLoc,
  interactive = true,
}) {
  const { isDark } = useTheme();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pickupMarker = useRef(null);
  const dropoffMarker = useRef(null);
  const driverMarker = useRef(null);
  const routeAdded = useRef(false);
  const onClickRef = useRef(onMapClick);
  const firstDriverPos = useRef(false); // track first GPS fix
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onClickRef.current = onMapClick;
  }, [onMapClick]);

  // Init map — only once, stable across re-renders
  useEffect(() => {
    let destroyed = false;

    loadMapLibre().then(() => {
      if (destroyed || !containerRef.current || mapRef.current) return;

      try {
        const map = new window.maplibregl.Map({
          container: containerRef.current,
          style: getStyle(isDark),
          center: LAGOS,
          zoom: 13,
          attributionControl: false,
          pitchWithRotate: false,
        });

        map.addControl(
          new window.maplibregl.NavigationControl({ showCompass: false }),
          "bottom-right",
        );

        map.on("load", () => {
          if (destroyed) return;
          mapRef.current = map;
          setMapReady(true);
        });

        if (interactive) {
          map.on("click", (e) => {
            onClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          });
        }
      } catch (e) {
        console.error("[DrivoMap] Init error:", e);
      }
    });

    return () => {
      destroyed = true;
      // Clean up markers
      pickupMarker.current?.remove();
      dropoffMarker.current?.remove();
      driverMarker.current?.remove();
      pickupMarker.current = null;
      dropoffMarker.current = null;
      driverMarker.current = null;
      firstDriverPos.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
      window._drivoMapFlyTo = null;
    };
  }, []); // ← empty deps — never re-runs, map is stable

  // Theme switch — re-add route after style reloads
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.setStyle(getStyle(isDark));
    routeAdded.current = false;
    mapRef.current.once("styledata", () => {
      if (
        pickupLoc?.lat &&
        pickupLoc?.lng &&
        dropoffLoc?.lat &&
        dropoffLoc?.lng
      ) {
        drawRoute(pickupLoc, dropoffLoc);
      }
    });
  }, [isDark]);

  // Pickup marker
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    pickupMarker.current?.remove();
    pickupMarker.current = null;

    if (!pickupLoc?.lat || !pickupLoc?.lng) return;

    const el = document.createElement("div");
    el.style.cssText = "position:relative; width:22px; height:22px;";

    // Pulse ring
    const ring = document.createElement("div");
    ring.style.cssText = `
      position:absolute; inset:-7px; border-radius:50%;
      border:2px solid rgba(0,200,83,0.35);
      animation:drivoPulse 1.8s ease-out infinite;
    `;

    // Core dot
    const dot = document.createElement("div");
    dot.style.cssText = `
      width:18px; height:18px; background:#00C853;
      border-radius:50%; border:2.5px solid #fff;
      box-shadow:0 2px 10px rgba(0,200,83,0.55);
      position:absolute; top:2px; left:2px;
    `;

    // Label
    const label = document.createElement("div");
    label.style.cssText = `
      position:absolute; top:-26px; left:50%; transform:translateX(-50%);
      background:#00C853; color:#fff; font-size:9px; font-weight:800;
      padding:2px 6px; border-radius:5px; white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,200,83,0.4); letter-spacing:0.06em;
      font-family: system-ui, sans-serif;
    `;
    label.textContent = "PICKUP";

    el.appendChild(ring);
    el.appendChild(dot);
    el.appendChild(label);

    pickupMarker.current = new window.maplibregl.Marker({
      element: el,
      anchor: "center",
    })
      .setLngLat([pickupLoc.lng, pickupLoc.lat])
      .addTo(mapRef.current);

    mapRef.current.flyTo({
      center: [pickupLoc.lng, pickupLoc.lat],
      zoom: 15,
      duration: 800,
    });
  }, [pickupLoc, mapReady]);

  // Dropoff marker + curved route
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    dropoffMarker.current?.remove();
    dropoffMarker.current = null;
    removeRoute();

    if (!dropoffLoc?.lat || !dropoffLoc?.lng) return;

    // SVG pin
    const el = document.createElement("div");
    el.style.cssText =
      "position:relative; width:30px; height:38px; cursor:default;";

    const pin = document.createElement("div");
    pin.innerHTML = `<svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.716 0 0 6.716 0 15C0 26.25 15 38 15 38C15 38 30 26.25 30 15C30 6.716 23.284 0 15 0Z" fill="#FF3B30"/>
      <circle cx="15" cy="15" r="6.5" fill="white"/>
    </svg>`;
    pin.style.cssText = "position:absolute; top:0; left:0;";

    const label = document.createElement("div");
    label.style.cssText = `
      position:absolute; top:-26px; left:50%; transform:translateX(-50%);
      background:#FF3B30; color:#fff; font-size:9px; font-weight:800;
      padding:2px 6px; border-radius:5px; white-space:nowrap;
      box-shadow:0 2px 6px rgba(255,59,48,0.4); letter-spacing:0.06em;
      font-family: system-ui, sans-serif;
    `;
    label.textContent = "DROPOFF";

    el.appendChild(pin);
    el.appendChild(label);

    dropoffMarker.current = new window.maplibregl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat([dropoffLoc.lng, dropoffLoc.lat])
      .addTo(mapRef.current);

    // Draw route + fitBounds only if pickup is also valid
    if (
      pickupLoc &&
      pickupLoc.lat != null &&
      !isNaN(pickupLoc.lat) &&
      pickupLoc.lng != null &&
      !isNaN(pickupLoc.lng) &&
      dropoffLoc.lat != null &&
      !isNaN(dropoffLoc.lat) &&
      dropoffLoc.lng != null &&
      !isNaN(dropoffLoc.lng)
    ) {
      drawRoute(pickupLoc, dropoffLoc);

      try {
        const bounds = new window.maplibregl.LngLatBounds();
        bounds.extend([pickupLoc.lng, pickupLoc.lat]);
        bounds.extend([dropoffLoc.lng, dropoffLoc.lat]);

        if (!bounds.isEmpty()) {
          mapRef.current.fitBounds(bounds, {
            padding: { top: 90, bottom: 230, left: 60, right: 60 },
            duration: 900,
            maxZoom: 15,
          });
        }
      } catch (e) {
        console.warn("[DrivoMap] fitBounds error:", e);
      }
    }
  }, [dropoffLoc, mapReady]);

  // Driver / self marker — flies to first GPS fix, then just moves marker
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (!driverLoc?.lat || !driverLoc?.lng) {
      driverMarker.current?.remove();
      driverMarker.current = null;
      firstDriverPos.current = false;
      return;
    }

    if (driverMarker.current) {
      // Smooth marker move
      driverMarker.current.setLngLat([driverLoc.lng, driverLoc.lat]);
    } else {
      // First GPS fix — fly to driver location
      if (!firstDriverPos.current) {
        firstDriverPos.current = true;
        mapRef.current.flyTo({
          center: [driverLoc.lng, driverLoc.lat],
          zoom: 15,
          duration: 1200,
        });
      }

      const el = document.createElement("div");
      el.style.cssText = `
        position: relative;
        width: 46px; height: 46px;
      `;

      // Outer pulse ring for driver
      const ring = document.createElement("div");
      ring.style.cssText = `
        position: absolute; inset: -6px; border-radius: 50%;
        border: 2px solid rgba(0,200,83,0.3);
        animation: drivoPulse 2s ease-out infinite;
      `;

      const inner = document.createElement("div");
      inner.style.cssText = `
        width: 46px; height: 46px; background: #00C853;
        border-radius: 50%; border: 3px solid #fff;
        box-shadow: 0 4px 18px rgba(0,200,83,0.55);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; position: relative;
      `;
      inner.textContent = "🚗";

      el.appendChild(ring);
      el.appendChild(inner);

      driverMarker.current = new window.maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([driverLoc.lng, driverLoc.lat])
        .addTo(mapRef.current);

      // Expose flyTo for Driver page to recenter
      window._drivoMapFlyTo = (loc) => {
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [loc.lng, loc.lat],
            zoom: 15,
            duration: 800,
          });
        }
      };
    }
  }, [driverLoc, mapReady]);

  // Bezier curved route
  const drawRoute = (from, to) => {
    const map = mapRef.current;
    if (!map) return;
    removeRoute();

    // Cubic bezier — perpendicular offset simulates road curves
    const dx = to.lng - from.lng;
    const dy = to.lat - from.lat;
    const perpX = -dy * 0.28;
    const perpY = dx * 0.28;

    const c1lng = from.lng + dx * 0.25 + perpX;
    const c1lat = from.lat + dy * 0.25 + perpY;
    const c2lng = from.lng + dx * 0.75 - perpX;
    const c2lat = from.lat + dy * 0.75 - perpY;

    const steps = 80;
    const coords = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      coords.push([
        mt * mt * mt * from.lng +
          3 * mt * mt * t * c1lng +
          3 * mt * t * t * c2lng +
          t * t * t * to.lng,
        mt * mt * mt * from.lat +
          3 * mt * mt * t * c1lat +
          3 * mt * t * t * c2lat +
          t * t * t * to.lat,
      ]);
    }

    try {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
        },
      });

      // Soft glow
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#00C853",
          "line-width": 16,
          "line-opacity": 0.08,
          "line-blur": 6,
        },
      });

      // White casing (road border look)
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": isDark ? 0.12 : 0.75,
        },
      });

      // Main green line
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#00C853",
          "line-width": 5,
          "line-opacity": 0.95,
        },
      });

      // White dashes on top
      map.addLayer({
        id: "route-dash",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 2.5,
          "line-opacity": 0.55,
          "line-dasharray": [0, 4, 4],
        },
      });

      routeAdded.current = true;
    } catch (e) {
      console.warn("[DrivoMap] drawRoute error:", e);
    }
  };

  const removeRoute = () => {
    const map = mapRef.current;
    if (!map || !routeAdded.current) return;
    try {
      ["route-dash", "route-line", "route-casing", "route-glow"].forEach(
        (id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        },
      );
      if (map.getSource("route")) map.removeSource("route");
    } catch {}
    routeAdded.current = false;
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {!mapReady && (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">Loading map...</p>
        </div>
      )}

      <style>{`
        @keyframes drivoPulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .maplibregl-ctrl-bottom-right {
          bottom: 90px !important;
          right: 14px !important;
        }
        .maplibregl-ctrl-group {
          background: rgba(255,255,255,0.94) !important;
          backdrop-filter: blur(16px);
          border-radius: 16px !important;
          border: none !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.10) !important;
          overflow: hidden;
        }
        .dark .maplibregl-ctrl-group {
          background: rgba(24,24,27,0.94) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
        }
        .maplibregl-ctrl button {
          width: 44px !important;
          height: 44px !important;
        }
        .maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon,
        .maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon {
          filter: brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(400%) hue-rotate(100deg);
        }
        .dark .maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon,
        .dark .maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon {
          filter: brightness(0) invert(1) opacity(0.6);
        }
      `}</style>
    </div>
  );
}
