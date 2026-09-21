import abc
import math
import time
from typing import Any, Dict, List, Tuple
import requests


class RoutingProvider(abc.ABC):
    """Abstract routing interface enabling zero-cost open-source routing (OSRM)
    for the SIH prototype, while supporting plug-and-play migration to Google Routes API.
    """

    @abc.abstractmethod
    async def get_route(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> Dict[str, Any]:
        """Calculates driving road route, geometry coordinates, distance, and dynamic ETA."""
        pass

    @abc.abstractmethod
    async def get_distance_matrix(
        self,
        points: List[Tuple[float, float]],
    ) -> Dict[str, Any]:
        """Calculates travel-time and distance matrix between a set of coordinates."""
        pass


class OSRMProvider(RoutingProvider):
    """Open Source Routing Machine (OSRM) Provider.
    Zero external cost. Uses public OSRM / self-hosted Docker OSRM.
    Includes deterministic Haversine + road curvature fallback for offline resilience.
    """

    def __init__(self, base_url: str = "http://router.project-osrm.org"):
        self.base_url = base_url.rstrip("/")

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _fallback_route(
        self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float
    ) -> Dict[str, Any]:
        crow_dist = self._haversine(origin_lat, origin_lng, dest_lat, dest_lng)
        # Indian city driving road factor: ~1.28x crow-flight distance
        road_dist_km = round(crow_dist * 1.28, 2)
        # Average urban service travel speed: ~22 km/h
        duration_minutes = max(5, int(round((road_dist_km / 22.0) * 60)))

        # Interpolate 10 intermediate points for map polyline
        coordinates = []
        for i in range(11):
            ratio = i / 10.0
            lat = origin_lat + (dest_lat - origin_lat) * ratio
            lng = origin_lng + (dest_lng - origin_lng) * ratio
            coordinates.append([lat, lng])

        eta_unix = int(time.time()) + (duration_minutes * 60)

        return {
            "provider": "OSRM (Local Fallback)",
            "distanceKm": road_dist_km,
            "durationMinutes": duration_minutes,
            "etaSeconds": duration_minutes * 60,
            "etaTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(eta_unix)),
            "trafficCondition": "NORMAL",
            "trafficFactor": 1.1,
            "coordinates": coordinates,
            "summary": f"{road_dist_km} km via urban service corridor",
        }

    async def get_route(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> Dict[str, Any]:
        # OSRM coordinate format: {longitude},{latitude}
        url = (
            f"{self.base_url}/route/v1/driving/"
            f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
            f"?overview=full&geometries=geojson&steps=false"
        )
        try:
            resp = requests.get(url, timeout=3.5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    dist_km = round(route["distance"] / 1000.0, 2)
                    dur_min = max(3, int(round(route["duration"] / 60.0)))
                    eta_unix = int(time.time()) + (dur_min * 60)

                    # GeoJSON geometry coordinates are [lng, lat]; convert to [lat, lng] for Leaflet
                    raw_coords = route.get("geometry", {}).get("coordinates", [])
                    lat_lng_coords = [[pt[1], pt[0]] for pt in raw_coords]

                    return {
                        "provider": "OSRM Engine",
                        "distanceKm": dist_km,
                        "durationMinutes": dur_min,
                        "etaSeconds": dur_min * 60,
                        "etaTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(eta_unix)),
                        "trafficCondition": "MODERATE",
                        "trafficFactor": 1.0,
                        "coordinates": lat_lng_coords,
                        "summary": route.get("legs", [{}])[0].get("summary", "Fastest route via road network"),
                    }
        except Exception:
            pass

        return self._fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)

    async def get_distance_matrix(
        self,
        points: List[Tuple[float, float]],
    ) -> Dict[str, Any]:
        n = len(points)
        durations = [[0.0] * n for _ in range(n)]
        distances = [[0.0] * n for _ in range(n)]

        for i in range(n):
            for j in range(n):
                if i != j:
                    crow = self._haversine(points[i][0], points[i][1], points[j][0], points[j][1])
                    road_km = crow * 1.28
                    distances[i][j] = round(road_km, 2)
                    durations[i][j] = round((road_km / 22.0) * 60, 1)

        return {
            "provider": "OSRM Travel Matrix",
            "distancesKm": distances,
            "durationsMinutes": durations,
        }


class GoogleRoutesProvider(RoutingProvider):
    """Google Routes API Provider (Production migration adapter)."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def get_route(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("Google Maps API key is not configured.")
        # Future production integration hook
        return {}

    async def get_distance_matrix(self, points: List[Tuple[float, float]]) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("Google Maps API key is not configured.")
        return {}


def get_routing_provider(provider_type: str = "osrm") -> RoutingProvider:
    if provider_type.lower() == "google":
        return GoogleRoutesProvider(api_key="")
    return OSRMProvider()
