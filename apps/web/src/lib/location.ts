export interface DetectedLocation {
  latitude: number;
  longitude: number;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  displayName: string;
}

/**
 * Robust live location detector with reverse geocoding and intelligent fallbacks.
 * Uses HTML5 Geolocation with high accuracy, reverse geocodes with Nominatim,
 * and falls back gracefully if permissions are denied or GPS is unavailable.
 */
export async function detectLiveLocation(): Promise<DetectedLocation> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      // Return standard default
      resolve({
        latitude: 28.6139,
        longitude: 77.209,
        streetAddress: "Connaught Place, Central Delhi",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110001",
        displayName: "Connaught Place, New Delhi, Delhi 110001",
      });
      return;
    }

    const handleSuccess = async (position: GeolocationPosition) => {
      const lat = Number(position.coords.latitude.toFixed(6));
      const lon = Number(position.coords.longitude.toFixed(6));

      try {
        // Attempt reverse geocoding via OpenStreetMap Nominatim
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          const road = addr.road || addr.suburb || addr.neighbourhood || addr.residential || "";
          const area = addr.suburb || addr.neighbourhood || addr.city_district || "";
          const city = addr.city || addr.town || addr.village || addr.state_district || "New Delhi";
          const state = addr.state || "Delhi";
          const pincode = addr.postcode || "110001";

          const parts = [road, area].filter(Boolean);
          const streetAddress = parts.length > 0 ? parts.join(", ") : `${city} Sector`;

          resolve({
            latitude: lat,
            longitude: lon,
            streetAddress: streetAddress || `${lat}, ${lon}`,
            city,
            state,
            pincode,
            displayName: data.display_name || `${streetAddress}, ${city}, ${state} - ${pincode}`,
          });
          return;
        }
      } catch {
        // Geocoding failed/timed out, return coordinates with standard format
      }

      resolve({
        latitude: lat,
        longitude: lon,
        streetAddress: `Location at ${lat}° N, ${lon}° E`,
        city: "New Delhi",
        state: "Delhi",
        pincode: "110001",
        displayName: `GPS: ${lat}, ${lon}`,
      });
    };

    const handleError = async () => {
      // Try IP-based location fallback if GPS was blocked or unavailable
      try {
        const ipRes = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            resolve({
              latitude: Number(ipData.latitude.toFixed(6)),
              longitude: Number(ipData.longitude.toFixed(6)),
              streetAddress: `${ipData.city || "Central"}, ${ipData.region || "Delhi"}`,
              city: ipData.city || "New Delhi",
              state: ipData.region || "Delhi",
              pincode: ipData.postal || "110001",
              displayName: `${ipData.city || "New Delhi"}, ${ipData.region || "Delhi"}, India`,
            });
            return;
          }
        }
      } catch {
        // Fallback default
      }

      resolve({
        latitude: 28.6139,
        longitude: 77.209,
        streetAddress: "Connaught Place, Central Delhi",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110001",
        displayName: "Connaught Place, New Delhi, Delhi 110001",
      });
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    });
  });
}
