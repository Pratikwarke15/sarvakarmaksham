export interface DetectedLocation {
  latitude: number;
  longitude: number;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  displayName: string;
  isApproximate?: boolean;
}

/**
 * Robust live location detector with precise reverse geocoding.
 * Uses HTML5 Geolocation with maximum hardware accuracy and no cached readings.
 * Reverse-geocodes through OpenStreetMap Nominatim with BigDataCloud secondary fallback
 * to extract exact Colony / Society / Neighbourhood / Suburb and Street.
 */
export async function detectLiveLocation(): Promise<DetectedLocation> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve({
        latitude: 18.5204,
        longitude: 73.8567,
        streetAddress: "FC Road, Shivajinagar",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411005",
        displayName: "FC Road, Shivajinagar, Pune, Maharashtra 411005",
        isApproximate: true,
      });
      return;
    }

    const handleSuccess = async (position: GeolocationPosition) => {
      const lat = Number(position.coords.latitude.toFixed(6));
      const lon = Number(position.coords.longitude.toFixed(6));

      // 1. Primary reverse geocoding via OpenStreetMap Nominatim (High Precision zoom 18)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
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

          // Extract colony / housing society / neighborhood
          const colony =
            addr.residential ||
            addr.neighbourhood ||
            addr.suburb ||
            addr.colony ||
            addr.quarter ||
            addr.subdivision ||
            addr.locality ||
            "";

          // Extract road / street
          const road =
            addr.road ||
            addr.street ||
            addr.pedestrian ||
            addr.footway ||
            addr.path ||
            "";

          // Extract building / landmark / apartment
          const building =
            addr.building ||
            addr.housing_estate ||
            addr.apartment ||
            addr.amenity ||
            "";

          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.city_district ||
            addr.state_district ||
            "Pune";

          const state = addr.state || "Maharashtra";
          const pincode = addr.postcode || "";

          // Assemble precise colony & street address
          const components: string[] = [];
          if (building && building !== colony && building !== road) {
            components.push(building);
          }
          if (road) {
            components.push(road);
          }
          if (colony && colony !== road && colony !== city) {
            components.push(colony);
          }

          let streetAddress = components.filter(Boolean).join(", ");
          if (!streetAddress) {
            streetAddress = addr.county || `${city} Area`;
          }

          const fullDisplay = [streetAddress, city, state, pincode]
            .filter(Boolean)
            .join(", ");

          resolve({
            latitude: lat,
            longitude: lon,
            streetAddress,
            city,
            state,
            pincode,
            displayName: fullDisplay || data.display_name,
            isApproximate: false,
          });
          return;
        }
      } catch {
        // Nominatim query timed out or failed, proceed to secondary geocoder
      }

      // 2. Secondary reverse geocoding via BigDataCloud client API
      try {
        const bdcController = new AbortController();
        const bdcTimeout = setTimeout(() => bdcController.abort(), 6000);

        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
          { signal: bdcController.signal }
        );
        clearTimeout(bdcTimeout);

        if (bdcRes.ok) {
          const bdcData = await bdcRes.json();
          const city = bdcData.city || bdcData.locality || "Pune";
          const state = bdcData.principalSubdivision || "Maharashtra";
          const pincode = bdcData.postcode || "";

          // Check informative items for locality/suburb/colony
          const informative = Array.isArray(bdcData.localityInfo?.informative)
            ? bdcData.localityInfo.informative
            : [];
          const colonyInfo = informative.find(
            (i: any) =>
              i.description?.toLowerCase().includes("suburb") ||
              i.description?.toLowerCase().includes("neighbourhood") ||
              i.description?.toLowerCase().includes("residential")
          );

          const colony = colonyInfo?.name || bdcData.locality || "";
          const streetAddress = colony && colony !== city ? colony : `${city} Central`;

          resolve({
            latitude: lat,
            longitude: lon,
            streetAddress,
            city,
            state,
            pincode,
            displayName: `${streetAddress}, ${city}, ${state}${pincode ? ` - ${pincode}` : ""}`,
            isApproximate: false,
          });
          return;
        }
      } catch {
        // Secondary geocoder failed
      }

      // 3. Fallback coordinates representation
      resolve({
        latitude: lat,
        longitude: lon,
        streetAddress: `GPS Fix: ${lat}° N, ${lon}° E`,
        city: "Pune",
        state: "Maharashtra",
        pincode: "",
        displayName: `Live GPS: ${lat}, ${lon}`,
        isApproximate: false,
      });
    };

    const handleError = async (err: GeolocationPositionError) => {
      console.warn("Geolocation precision error/fallback:", err?.message);

      // Attempt IP location fallback for approximate City & PIN
      try {
        const ipRes = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            resolve({
              latitude: Number(ipData.latitude.toFixed(6)),
              longitude: Number(ipData.longitude.toFixed(6)),
              // DO NOT duplicate city into streetAddress! Keep streetAddress clear so user enters exact colony.
              streetAddress: "",
              city: ipData.city || "Pune",
              state: ipData.region || "Maharashtra",
              pincode: ipData.postal || "",
              displayName: `${ipData.city || "Pune"}, ${ipData.region || "Maharashtra"} (IP Approximate)`,
              isApproximate: true,
            });
            return;
          }
        }
      } catch {
        // IP lookup failed
      }

      // Graceful fallback default
      resolve({
        latitude: 18.5204,
        longitude: 73.8567,
        streetAddress: "",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411005",
        displayName: "Pune, Maharashtra 411005 (Please specify colony)",
        isApproximate: true,
      });
    };

    // 20-second timeout allows user ample time to tap "Allow" in browser location permissions dialog
    // maximumAge: 0 enforces fresh, high-accuracy GPS/Wi-Fi fix without stale cache
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}
