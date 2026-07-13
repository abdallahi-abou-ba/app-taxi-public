const env = require('../config/env');
const logger = require('../config/logger');

const REQUEST_TIMEOUT_MS = 5000;

// Nominatim's public demo server enforces ~1 request/second - a ride request
// needs two lookups back-to-back (pickup + destination), so track the last
// call time and pace requests instead of firing them together and getting
// the second one 429'd.
const MIN_GAP_MS = 1100;
let nextAllowedAt = 0;

function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextAllowedAt - now);
  nextAllowedAt = now + wait + MIN_GAP_MS;
  return wait > 0 ? new Promise((resolve) => setTimeout(resolve, wait)) : Promise.resolve();
}

/**
 * Human-readable place name for a coordinate via Nominatim reverse geocoding.
 * Returns null (never throws) on any failure, mirroring osrm.util.js's
 * fallback contract - the public demo server has no uptime guarantee.
 */
async function reverseGeocode(lat, lng, lang = 'fr') {
  await throttle();

  const url = `${env.NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${lang}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      // Required by Nominatim's usage policy to identify the calling app.
      headers: { 'User-Agent': 'app-taxi-mvp/1.0' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    return formatAddress(data);
  } catch (err) {
    logger.warn(`Reverse geocoding failed, falling back to raw coordinates: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Nominatim's `display_name` is a long comma-separated full address (house
// number through country) - too verbose for a ride summary card. Build a
// shorter label instead: a named place (if any) plus street/area/city.
function formatAddress(data) {
  const addr = data.address || {};
  const parts = [
    data.name,
    addr.road,
    addr.suburb || addr.neighbourhood || addr.city_district,
    addr.city || addr.town || addr.village,
  ].filter(Boolean);

  const unique = [...new Set(parts)];
  if (unique.length > 0) return unique.slice(0, 3).join(', ');
  return data.display_name || null;
}

module.exports = { reverseGeocode };
