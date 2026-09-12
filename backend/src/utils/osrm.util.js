const env = require('../config/env');
const logger = require('../config/logger');

const REQUEST_TIMEOUT_MS = 5000;

/**
 * Real road-network route via OSRM. `points` is [{lat,lng}, ...] in visit
 * order (pickup, then any stops, then destination) - OSRM accepts any number
 * of waypoints in one request and returns trip-wide totals, so a multi-stop
 * ride costs the same single call as a direct one. Returns null (never
 * throws) on any failure so callers can fall back to a simpler estimate -
 * the public demo server has no uptime guarantee (see OSRM_BASE_URL in env.js).
 */
async function getRoute(points) {
  // overview=simplified (not "full"): a Douglas-Peucker-simplified geometry,
  // still visually accurate but orders of magnitude fewer points - "full" can
  // return tens of thousands of coordinates for a long/winding route, which
  // is overkill for drawing a line on a map and can choke the mobile WebView
  // bridge (huge injectJavaScript payload).
  const coordinates = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${env.OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=simplified&geometries=geojson`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      // OSRM returns GeoJSON [lng, lat] pairs; the rest of the app (OsmMapView's
      // Leaflet polyline) expects [lat, lng].
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    };
  } catch (err) {
    logger.warn(`OSRM route lookup failed, falling back to haversine estimate: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getRoute };
