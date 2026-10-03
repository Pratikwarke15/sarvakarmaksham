"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import {
  Navigation,
  Clock,
  MapPin,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  WifiOff,
  Compass,
  CheckCircle,
  Truck,
  RotateCw,
  PhoneOff,
} from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { getStoredToken } from "@/lib/storage";
import { getWebSocketUrl } from "@/lib/websocket";
import { LiveTrackingData, OrderStatus } from "@/lib/types";

// Dynamically import LeafletMap with SSR disabled to prevent window undefined errors
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full rounded-3xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200 text-slate-400 gap-2">
      <RotateCw className="h-6 w-6 animate-spin text-[#800020]" />
      <span className="text-xs font-medium">Loading interactive OpenStreetMap...</span>
    </div>
  ),
});

export interface LiveOrderTrackingMapProps {
  orderId: string;
  userRole?: "CONSUMER" | "WORKER" | "ADMIN";
  initialData?: LiveTrackingData | null;
  onStatusChange?: (newStatus: OrderStatus) => void;
  className?: string;
}

export function LiveOrderTrackingMap({
  orderId,
  userRole = "CONSUMER",
  initialData,
  onStatusChange,
  className = "",
}: LiveOrderTrackingMapProps) {
  const [trackingData, setTrackingData] = useState<LiveTrackingData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isGpsBroadcasting, setIsGpsBroadcasting] = useState<boolean>(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // 1. Fetch initial live tracking snapshot from REST API
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: LiveTrackingData }>(
        `/orders/${orderId}/live-tracking`
      );
      if (res.success && res.data) {
        setTrackingData(res.data);
        setError(null);
      }
    } catch (err: any) {
      console.warn("Could not fetch live tracking snapshot:", err.message);
      setError(err?.response?.data?.message || err?.message || "Failed to load live tracking");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  // 2. Setup Real-time WebSocket (Socket.IO) Connection
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    const socketUrl = getWebSocketUrl();

    const socket = io(socketUrl, {
      path: "/ws",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join:order", orderId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("tracking:init", (data: LiveTrackingData) => {
      if (data && data.orderId === orderId) {
        setTrackingData(data);
      }
    });

    // Handle live location updates from technician in transit
    socket.on("location:update", (update: any) => {
      if (!update || update.orderId !== orderId) return;

      setTrackingData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: update.status || prev.status,
          currentLocation: {
            latitude: update.workerLat,
            longitude: update.workerLng,
            heading: update.heading,
            speed: update.speed,
            accuracy: update.accuracy,
            updatedAt: update.timestamp || new Date().toISOString(),
            isStale: update.isStale || false,
          },
          route: prev.route
            ? {
                ...prev.route,
                distanceKm: update.distanceRemainingKm ?? prev.route.distanceKm,
                etaMinutes: update.etaMinutes ?? prev.route.etaMinutes,
                etaTimestamp: `${update.etaMinutes ?? prev.route.etaMinutes} mins remaining`,
              }
            : null,
        };
      });
    });

    // Handle order status lifecycle changes
    socket.on("order:status_update", (data: any) => {
      if (data && data.orderId === orderId) {
        setTrackingData((prev) => (prev ? { ...prev, status: data.status } : prev));
        if (onStatusChangeRef.current) onStatusChangeRef.current(data.status);
      }
    });

    return () => {
      socket.emit("leave:order", orderId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId, fetchSnapshot]);

  // 3. Worker Geolocation Streamer (Sensible Throttle & Threshold Strategy)
  // "Do not send GPS coordinates every few milliseconds. Use reasonable distance/time thresholds."
  const startGpsBroadcaster = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser or device.");
      return;
    }

    if (watchIdRef.current !== null) return;

    setGpsPermissionDenied(false);

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, heading, speed, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));

        // Accuracy filtering: ignore inaccurate fixes > 150m
        if (accuracy > 150) {
          console.warn(`[GPS] Filtered inaccurate fix: ${accuracy}m`);
          return;
        }

        // Distance & Time threshold checks:
        // Minimum 5 meters movement OR minimum 5 seconds elapsed
        const now = Date.now();
        const last = lastPositionRef.current;

        if (last) {
          const timeElapsed = (now - last.time) / 1000;
          // Approximate distance moved in meters via equirectangular approximation
          const dLat = (latitude - last.lat) * 111320;
          const dLng = (longitude - last.lng) * 111320 * Math.cos((latitude * Math.PI) / 180);
          const distanceMovedMeters = Math.sqrt(dLat * dLat + dLng * dLng);

          if (distanceMovedMeters < 5 && timeElapsed < 5) {
            // Insignificant movement and under 5s: skip to conserve battery and bandwidth
            return;
          }
        }

        lastPositionRef.current = { lat: latitude, lng: longitude, time: now };

        const payload = {
          orderId,
          latitude,
          longitude,
          heading: heading != null && !isNaN(heading) ? heading : 0,
          speed: speed != null && !isNaN(speed) ? Math.round(speed * 3.6) : 0, // km/h
          accuracy: Math.round(accuracy),
          timestamp: now,
        };

        // Stream via WebSocket primary channel
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("worker:location", payload);
        } else {
          // Fallback to REST endpoint if socket is reconnecting
          apiPost(`/orders/${orderId}/location`, payload).catch(() => {});
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermissionDenied(true);
        }
        console.warn("[GPS] Location error:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;
    setIsGpsBroadcasting(true);
  }, [orderId]);

  const stopGpsBroadcaster = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsBroadcasting(false);
  }, []);

  // Auto-start GPS broadcaster for worker if travelling
  useEffect(() => {
    if (userRole === "WORKER" && trackingData?.status === "TRAVELLING") {
      startGpsBroadcaster();
    } else {
      stopGpsBroadcaster();
    }
    return () => {
      stopGpsBroadcaster();
    };
  }, [userRole, trackingData?.status, startGpsBroadcaster, stopGpsBroadcaster]);

  // Operational State Advancement Trigger (Worker Cockpit)
  const handleAdvanceState = async (nextState: "TRAVELLING" | "ARRIVED" | "WORKING" | "COMPLETED") => {
    try {
      setIsUpdatingStatus(true);
      const res = await apiPatch<{ success: boolean; orderStatus: OrderStatus }>(
        `/orders/${orderId}/operational-state`,
        { operationalState: nextState }
      );
      if (res.success && res.orderStatus) {
        setTrackingData((prev) => (prev ? { ...prev, status: res.orderStatus } : prev));
        if (onStatusChangeRef.current) onStatusChangeRef.current(res.orderStatus);

        if (nextState === "TRAVELLING") {
          startGpsBroadcaster();
        } else if (nextState === "COMPLETED") {
          stopGpsBroadcaster();
        }
      }
    } catch (err: any) {
      alert(`Could not advance operational status: ${err?.response?.data?.message || err?.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className={`rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm ${className}`}>
        <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-[#800020]">
          <RotateCw className="h-6 w-6 animate-spin text-[#800020]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Initializing Live Navigation</h3>
          <p className="text-xs text-slate-500 mt-1">Connecting to OpenStreetMap routing engine...</p>
        </div>
      </div>
    );
  }

  // 4. Handle Scheduled Order Early Check
  // "For scheduled orders: DO NOT activate live tracking before the scheduled service time."
  const isScheduledForLater =
    trackingData?.bookingMode === "SCHEDULED" &&
    trackingData.scheduledAt &&
    new Date(trackingData.scheduledAt).getTime() - Date.now() > 15 * 60 * 1000;

  if (isScheduledForLater) {
    return (
      <div className={`rounded-3xl border border-blue-200 bg-gradient-to-b from-blue-50/60 to-white p-6 sm:p-8 text-center space-y-4 shadow-sm ${className}`}>
        <div className="h-14 w-14 rounded-3xl bg-blue-100 border border-blue-200 flex items-center justify-center mx-auto text-blue-700 shadow-sm">
          <Clock className="h-7 w-7 text-blue-700" />
        </div>
        <div>
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold uppercase tracking-wider">
            Scheduled Appointment
          </span>
          <h3 className="text-xl font-black text-slate-900 font-heading mt-2">
            Scheduled for {new Date(trackingData.scheduledAt!).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
            Live GPS tracking and real-time map navigation will automatically activate at the scheduled service time when your technician departs for your location.
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-blue-200/80 inline-flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Privacy Protection: Your exact GPS destination remains confidential until transit.</span>
        </div>
      </div>
    );
  }

  const workerPos = trackingData?.currentLocation;
  const destPos = trackingData?.destination;
  const route = trackingData?.route;
  const isTravelling = trackingData?.status === "TRAVELLING";
  const isArrived = trackingData?.status === "ARRIVED";
  const isWorking = trackingData?.status === "IN_PROGRESS";
  const isCompleted = trackingData?.status === "COMPLETED";

  // Status Badge Label
  let statusText = "Technician Assigned";
  let statusBg = "bg-amber-50 text-amber-800 border-amber-200";
  if (isTravelling) {
    statusText = "Technician is on the way";
    statusBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (isArrived) {
    statusText = "Technician has arrived at your location";
    statusBg = "bg-blue-50 text-blue-800 border-blue-200";
  } else if (isWorking) {
    statusText = "Service in progress";
    statusBg = "bg-indigo-50 text-indigo-800 border-indigo-200";
  } else if (isCompleted) {
    statusText = "Service completed";
    statusBg = "bg-slate-100 text-slate-700 border-slate-300";
  }

  return (
    <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md flex flex-col ${className}`}>
      {/* Top Floating HUD: ETA, Distance & Status Badge (Swiggy / Blinkit style) */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-amber-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#800020] text-white shadow-sm">
            <Truck className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBg}`}>
                {statusText}
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold" title="Live WebSocket connected">
                  <Wifi className="h-3 w-3 text-emerald-600" /> Live GPS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium" title="Reconnecting socket">
                  <WifiOff className="h-3 w-3" /> Reconnecting
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading mt-0.5">
              {route?.etaMinutes ? `Arriving in ~${route.etaMinutes} min` : isArrived ? "Arrived at Gate" : "En Route"}
            </h2>
          </div>
        </div>

        {/* Remaining Distance & Routing Engine Badge */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-right">
          <div className="bg-slate-100/80 px-3.5 py-1.5 rounded-2xl border border-slate-200/80 text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Remaining</span>
            <span className="text-sm font-extrabold text-slate-800 font-mono">
              {route?.distanceKm ? `${route.distanceKm} km` : "Approaching"}
            </span>
          </div>

          <div className="bg-slate-100/80 px-3.5 py-1.5 rounded-2xl border border-slate-200/80 text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Routing</span>
            <span className="text-xs font-semibold text-slate-700">OpenStreetMap OSRM</span>
          </div>
        </div>
      </div>

      {/* GPS Permission Warning Banner if Denied */}
      {gpsPermissionDenied && userRole === "WORKER" && (
        <div className="bg-red-50 border-b border-red-200 p-3 px-4 flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>GPS access was denied. Please allow location permissions in your browser to broadcast navigation.</span>
          </div>
          <button
            type="button"
            onClick={startGpsBroadcaster}
            className="px-2.5 py-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
          >
            Retry Permission
          </button>
        </div>
      )}

      {/* Interactive Leaflet OpenStreetMap View */}
      <div className="relative h-[380px] sm:h-[440px] w-full bg-slate-100">
        <LeafletMap
          workerLat={workerPos?.latitude}
          workerLng={workerPos?.longitude}
          destLat={destPos?.latitude}
          destLng={destPos?.longitude}
          heading={workerPos?.heading || 0}
          routeCoordinates={route?.coordinates || []}
          workerName={trackingData?.worker?.name || "Technician"}
          destAddress={destPos?.address || "Service Location"}
          trackingActive={trackingData?.trackingActive ?? true}
          className="h-full w-full"
        />

        {/* Stale Location Alert Overlay (if no update for > 60s) */}
        {workerPos?.isStale && (
          <div className="absolute top-3 left-3 z-[400] bg-amber-500/90 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow backdrop-blur-md flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Weak GPS Signal (Last updated &gt; 1m ago)</span>
          </div>
        )}
      </div>

      {/* Bottom Info & Navigation Control Panel */}
      <div className="p-4 sm:p-5 bg-white border-t border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Technician Mini-Card */}
          {trackingData?.worker && (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-base shadow-sm">
                {trackingData.worker.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{trackingData.worker.name}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                    ★ {trackingData.worker.rating || "4.9"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-slate-400" /> Two-Wheeler
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <PhoneOff className="h-3 w-3" /> Direct Phone Protected
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Destination Address Snippet */}
          <div className="text-xs text-slate-600 bg-slate-50 rounded-2xl p-3 px-4 border border-slate-200/80 flex items-start gap-2 max-w-md">
            <MapPin className="h-4 w-4 text-[#800020] shrink-0 mt-0.5" />
            <div className="truncate">
              <strong className="text-slate-800 block">Service Destination:</strong>
              <span className="text-slate-600 truncate">
                {destPos?.address || (destPos?.approxArea ? `Approx: ${destPos.approxArea}` : "Confidential Location")}
              </span>
            </div>
          </div>
        </div>

        {/* Worker Navigation Action Buttons (Visible only in Worker Mode) */}
        {userRole === "WORKER" && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isGpsBroadcasting ? stopGpsBroadcaster : startGpsBroadcaster}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  isGpsBroadcasting
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                <Compass className={`h-3.5 w-3.5 ${isGpsBroadcasting ? "text-emerald-600 animate-spin" : ""}`} />
                <span>{isGpsBroadcasting ? "Live GPS Active" : "Enable Device GPS"}</span>
              </button>
              {gpsAccuracy && (
                <span className="text-[11px] text-slate-400 font-mono">Accuracy: ±{gpsAccuracy}m</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {trackingData?.status === "ACCEPTED" && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleAdvanceState("TRAVELLING")}
                  className="px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold shadow hover:bg-[#600018] active:scale-95 transition"
                >
                  Start Travelling to Destination
                </button>
              )}

              {trackingData?.status === "TRAVELLING" && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleAdvanceState("ARRIVED")}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow hover:bg-blue-700 active:scale-95 transition"
                >
                  I Have Arrived
                </button>
              )}

              {trackingData?.status === "ARRIVED" && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleAdvanceState("WORKING")}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow hover:bg-indigo-700 active:scale-95 transition"
                >
                  Start Work (In Progress)
                </button>
              )}

              {trackingData?.status === "IN_PROGRESS" && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleAdvanceState("COMPLETED")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 active:scale-95 transition"
                >
                  Mark Service Completed
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default LiveOrderTrackingMap;
