const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const rideService = require('../services/ride.service');

const getTrackingData = asyncHandler(async (req, res) => {
  const view = await rideService.getPublicTrackingView(req.params.token);
  sendSuccess(res, { data: view });
});

// A single self-contained page (Leaflet via CDN, inline JS) so a share
// recipient with no account and no app install can watch the ride live -
// see ride.service.js#getPublicTrackingView for what data it's allowed to see.
// The token has already passed trackTokenParamSchema's [a-f0-9]{32} regex by
// the time it reaches here, so it's safe to inline directly into the script.
function buildTrackingPageHtml(token) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Suivi de trajet</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>
  html, body { height: 100%; margin: 0; font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
  #map { position: absolute; inset: 0; }
  #status { position: absolute; top: 0; left: 0; right: 0; z-index: 1000; background: #1c1c1e; color: #fff;
    padding: 14px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
  #status .title { font-size: 15px; font-weight: 700; margin: 0 0 2px; }
  #status .sub { font-size: 13px; color: #c9c9cc; margin: 0; }
  #overlay { position: absolute; inset: 0; z-index: 2000; background: #fff; display: none;
    align-items: center; justify-content: center; text-align: center; padding: 24px; font-size: 16px; color: #333; }
</style>
</head>
<body>
<div id="status"><p class="title" id="statusTitle">Chargement...</p><p class="sub" id="statusSub"></p></div>
<div id="map"></div>
<div id="overlay"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
(function () {
  var token = ${JSON.stringify(token)};
  var STATUS_LABELS = {
    REQUESTED: 'Recherche d\\'un capitaine...',
    ACCEPTED: 'Le capitaine arrive',
    ARRIVED: 'Le capitaine est arrivé',
    IN_PROGRESS: 'Course en cours'
  };

  var map = L.map('map');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  var pickupMarker, destinationMarker, vehicleMarker;
  var initialized = false;
  var timer = null;

  function showOverlay(message) {
    var overlay = document.getElementById('overlay');
    overlay.textContent = message;
    overlay.style.display = 'flex';
    document.getElementById('map').style.display = 'none';
    if (timer) { clearInterval(timer); timer = null; }
  }

  function render(view) {
    document.getElementById('statusTitle').textContent = STATUS_LABELS[view.status] || view.status;
    var sub = [];
    if (view.driverName) sub.push(view.driverName);
    if (view.vehicleModel || view.vehiclePlate) sub.push([view.vehicleModel, view.vehiclePlate].filter(Boolean).join(' - '));
    document.getElementById('statusSub').textContent = sub.join(' · ');

    if (!pickupMarker) {
      pickupMarker = L.marker([view.pickupLat, view.pickupLng]).addTo(map).bindPopup('Départ');
      destinationMarker = L.marker([view.destinationLat, view.destinationLng]).addTo(map).bindPopup('Destination');
    }

    if (view.driverLat != null && view.driverLng != null) {
      if (!vehicleMarker) {
        var icon = L.divIcon({ className: '', html: '🚗', iconSize: [28, 28] });
        vehicleMarker = L.marker([view.driverLat, view.driverLng], { icon: icon }).addTo(map);
      } else {
        vehicleMarker.setLatLng([view.driverLat, view.driverLng]);
      }
    }

    if (!initialized) {
      var points = [[view.pickupLat, view.pickupLng], [view.destinationLat, view.destinationLng]];
      if (view.driverLat != null && view.driverLng != null) points.push([view.driverLat, view.driverLng]);
      map.fitBounds(points, { padding: [40, 40] });
      initialized = true;
    }
  }

  function poll() {
    fetch('/api/track/' + token)
      .then(function (res) {
        if (res.status === 404) { showOverlay('Lien invalide.'); return null; }
        if (res.status === 410) { showOverlay('Cette course est terminée.'); return null; }
        return res.json();
      })
      .then(function (body) {
        if (body && body.success) render(body.data);
      })
      .catch(function () { /* transient network error - next tick retries */ });
  }

  poll();
  timer = setInterval(poll, 5000);
})();
</script>
</body>
</html>`;
}

const getTrackingPage = (req, res) => {
  res.type('html').send(buildTrackingPageHtml(req.params.token));
};

module.exports = { getTrackingData, getTrackingPage };
