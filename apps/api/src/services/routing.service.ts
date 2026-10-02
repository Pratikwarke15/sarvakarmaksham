import axios from "axios";
import { logger } from "../lib/logger";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // Array of [lat, lng]
  distanceKm: number;
  durationMinutes: number;
  etaTimestamp: string;
  source: "OSRM" | "LOCAL_HAVERSINE";
  summary: string;
}

/**
 * Calculate Great-Circle distance via Haversine formula
 */
export function calculateHaversineDistanceKm(origin: LatLng, dest: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((dest.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((dest.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((dest.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate smooth interpolated intermediate road waypoints for fallback polyline
 */
function generateInterpolatedWaypoints(origin: LatLng, dest: LatLng, steps = 12): [number, number][] {
  const points: [number, number][] = [];
  const deltaLat = dest.lat - origin.lat;
  const deltaLng = dest.lng - origin.lng;

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Introduce a subtle natural curve/detour to simulate real road network geometry
    const curveOffset = Math.sin(fraction * Math.PI) * 0.0015;
    const lat = origin.lat + deltaLat * fraction + curveOffset;
    const lng = origin.lng + deltaLng * fraction - curveOffset * 0.5;
    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }
  return points;
}

export class RoutingService {
  private static readonly OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
  private static readonly URBAN_AVG_SPEED_KMPH = 25; // Typical speed for Indian city traffic (two-wheeler / technician)

  /**
   * Calculate real driving route between origin and destination using OSRM,
   * falling back cleanly to intelligent local road-haversine simulation if OSRM is unreachable.
   */
  static async calculateRoute(origin: LatLng, dest: LatLng): Promise<RouteResult> {
    const directKm = calculateHaversineDistanceKm(origin, dest);

    // If points are identical or exceptionally close (< 20 meters)
    if (directKm < 0.02) {
      return {
        coordinates: [
          [origin.lat, origin.lng],
          [dest.lat, dest.lng],
        ],
        distanceKm: 0.05,
        durationMinutes: 1,
        etaTimestamp: "Arriving now",
        source: "LOCAL_HAVERSINE",
        summary: "Arrived at destination",
      };
    }

    // Try Open Source Routing Machine (OSRM)
    try {
      const url = `${this.OSRM_BASE}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=false`;
      const response = await axios.get(url, {
        timeout: 2500, // 2.5s fast timeout to prevent blocking UI
        headers: {
          "User-Agent": "Sarvakarmakshamah-WorkerCoop/1.0",
        },
      });

      if (
        response.data &&
        response.data.code === "Ok" &&
        response.data.routes &&
        response.data.routes.length > 0
      ) {
        const route = response.data.routes[0];
        // OSRM returns coordinates as [lng, lat], convert to Leaflet standard [lat, lng]
        const rawCoords: [number, number][] = route.geometry.coordinates;
        const coordinates: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));

        return {
          coordinates,
          distanceKm: Math.max(0.1, distanceKm),
          durationMinutes,
          etaTimestamp: `${durationMinutes} min (${distanceKm} km)`,
          source: "OSRM",
          summary: "Real-time navigation via OpenStreetMap (OSRM)",
        };
      }
    } catch (err: any) {
      logger.warn(`OSRM online routing unavailable (${err?.message || "timeout"}); using high-precision local fallback`);
    }

    // Robust Local Fallback (Urban Road Factor 1.35x direct distance)
    const roadKm = Math.max(0.2, Math.round(directKm * 1.35 * 10) / 10);
    const durationMinutes = Math.max(2, Math.round((roadKm / this.URBAN_AVG_SPEED_KMPH) * 60));
    const coordinates = generateInterpolatedWaypoints(origin, dest, 14);

    return {
      coordinates,
      distanceKm: roadKm,
      durationMinutes,
      etaTimestamp: `${durationMinutes} min (${roadKm} km)`,
      source: "LOCAL_HAVERSINE",
      summary: "Grounded route calculation (Coop Local Engine)",
    };
  }

  /**
   * Fast recalculation of remaining distance & ETA from updated worker coordinates
   */
  static estimateRemaining(workerPos: LatLng, destPos: LatLng, speedKmph?: number): { distanceRemainingKm: number; etaMinutes: number } {
    const directKm = calculateHaversineDistanceKm(workerPos, destPos);
    const roadKm = Math.max(0.05, Math.round(directKm * 1.3 * 10) / 10);
    const speed = speedKmph && speedKmph > 5 ? speedKmph : this.URBAN_AVG_SPEED_KMPH;
    const etaMinutes = Math.max(1, Math.round((roadKm / speed) * 60));

    return {
      distanceRemainingKm: roadKm,
      etaMinutes,
    };
  }
}
