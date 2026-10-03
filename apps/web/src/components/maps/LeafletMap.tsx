"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export interface LeafletMapProps {
  workerLat?: number | null;
  workerLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  heading?: number;
  routeCoordinates?: [number, number][]; // [lat, lng] array
  workerName?: string;
  destAddress?: string;
  zoom?: number;
  className?: string;
  trackingActive?: boolean;
  onRecenter?: () => void;
}

export default function LeafletMap({
  workerLat,
  workerLng,
  destLat,
  destLng,
  heading = 0,
  routeCoordinates = [],
  workerName = "Technician",
  destAddress = "Destination",
  zoom = 14,
  className = "h-[400px] w-full",
  trackingActive = true,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const workerMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const routeCasingRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [L, setL] = useState<any>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const tileLayerRef = useRef<any>(null);

  // 1. Dynamically import Leaflet on client side
  useEffect(() => {
    let mounted = true;
    import("leaflet").then((leaflet) => {
      if (mounted) {
        setL(leaflet.default || leaflet);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = workerLat ?? destLat ?? 28.6139;
    const initialLng = workerLng ?? destLng ?? 77.2090;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom,
      zoomControl: false, // We provide clean custom controls
      attributionControl: true,
    });

    const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    });
    streetLayer.addTo(map);
    tileLayerRef.current = streetLayer;

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [L]);

  // Switch between Standard and Satellite map layers
  const toggleSatelliteView = () => {
    if (!mapInstanceRef.current || !L) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (!isSatellite) {
      // Switch to Esri World Imagery (Satellite)
      const satLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        }
      );
      satLayer.addTo(map);
      tileLayerRef.current = satLayer;
      setIsSatellite(true);
    } else {
      // Switch back to OpenStreetMap (Street)
      const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      });
      streetLayer.addTo(map);
      tileLayerRef.current = streetLayer;
      setIsSatellite(false);
    }
  };

  // Helper to create custom HTML markers
  const createWorkerIcon = (iconHeading: number) => {
    if (!L) return null;
    return L.divIcon({
      className: "custom-worker-marker",
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(128, 0, 32, 0.2); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #800020; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transform: rotate(${iconHeading}deg); transition: transform 0.3s ease;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  };

  const createDestIcon = () => {
    if (!L) return null;
    return L.divIcon({
      className: "custom-dest-marker",
      html: `
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
          <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #16a34a; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  };

  // 3. Update Markers & Polyline when coordinates change
  useEffect(() => {
    if (!mapReady || !L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // A. Worker Marker
    if (workerLat != null && workerLng != null && trackingActive) {
      const workerIcon = createWorkerIcon(heading);
      if (workerMarkerRef.current) {
        workerMarkerRef.current.setLatLng([workerLat, workerLng]);
        if (workerIcon) workerMarkerRef.current.setIcon(workerIcon);
      } else if (workerIcon) {
        workerMarkerRef.current = L.marker([workerLat, workerLng], { icon: workerIcon })
          .addTo(map)
          .bindPopup(`<strong>${workerName}</strong><br/>Live Location`);
      }
    } else if (workerMarkerRef.current) {
      workerMarkerRef.current.remove();
      workerMarkerRef.current = null;
    }

    // B. Destination Marker
    if (destLat != null && destLng != null) {
      const destIcon = createDestIcon();
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destLat, destLng]);
      } else if (destIcon) {
        destMarkerRef.current = L.marker([destLat, destLng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<strong>Service Destination</strong><br/>${destAddress}`);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // C. Route Polyline
    if (routeCoordinates && routeCoordinates.length > 1 && trackingActive) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(routeCoordinates);
        if (routeCasingRef.current) routeCasingRef.current.setLatLngs(routeCoordinates);
      } else {
        // High-contrast casing behind the route line
        routeCasingRef.current = L.polyline(routeCoordinates, {
          color: "#ffffff",
          weight: 7,
          opacity: 0.9,
          lineJoin: "round",
        }).addTo(map);

        // Core styled route polyline
        routePolylineRef.current = L.polyline(routeCoordinates, {
          color: "#800020",
          weight: 4.5,
          opacity: 0.95,
          dashArray: "8, 4",
          lineJoin: "round",
        }).addTo(map);
      }
    } else {
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
      if (routeCasingRef.current) {
        routeCasingRef.current.remove();
        routeCasingRef.current = null;
      }
    }
  }, [mapReady, L, workerLat, workerLng, destLat, destLng, heading, routeCoordinates, trackingActive]);

  // Recenter handler
  const handleRecenter = () => {
    if (!mapReady || !L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const points: [number, number][] = [];
    if (workerLat != null && workerLng != null && trackingActive) {
      points.push([workerLat, workerLng]);
    }
    if (destLat != null && destLng != null) {
      points.push([destLat, destLng]);
    }

    if (points.length === 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200/90 shadow-inner bg-slate-100 ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Floating Map Controls (Top-Right) */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Route & Worker"
          className="h-9 w-9 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-[#800020] hover:bg-slate-50 transition active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
        </button>

        {/* Satellite View Layer Toggle */}
        <button
          type="button"
          onClick={toggleSatelliteView}
          title={isSatellite ? "Switch to Default Map" : "Switch to Satellite Imagery"}
          className={`h-9 px-2.5 rounded-xl shadow-md border transition active:scale-95 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md ${
            isSatellite
              ? "bg-[#800020] text-white border-[#800020] hover:bg-[#66001a]"
              : "bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-[#800020]"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span>{isSatellite ? "Satellite" : "Map"}</span>
        </button>

        <div className="flex flex-col rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 overflow-hidden divide-y divide-slate-100">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="h-8 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 text-base font-bold"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="h-8 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 text-base font-bold"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}
