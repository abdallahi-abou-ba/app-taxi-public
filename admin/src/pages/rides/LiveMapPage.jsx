import { Fragment, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getLiveRides } from '../../api/rides';
import StatusBadge from '../../components/StatusBadge';

// Nouakchott center (see backend/src/config/demandZones.js) - default view
// before any active ride has a driver position to fit bounds around.
const DEFAULT_CENTER = [18.0858, -15.9785];
const POLL_INTERVAL_MS = 6000;

function emojiIcon(emoji, size) {
  return L.divIcon({
    className: 'live-map-marker',
    html: emoji,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const DRIVER_ICON = emojiIcon('🚖', 26);
const CLIENT_ICON = emojiIcon('🧍', 22);
const PICKUP_ICON = emojiIcon('📍', 20);
const DESTINATION_ICON = emojiIcon('🏁', 20);

function formatDistance(km) {
  if (km == null) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function formatAgo(iso) {
  if (!iso) return null;
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `il y a ${seconds}s`;
  return `il y a ${Math.round(seconds / 60)} min`;
}

export default function LiveMapPage() {
  const [rides, setRides] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);
  const hasFitBounds = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await getLiveRides();
        if (!cancelled) setRides(data);
      } catch (err) {
        if (!cancelled) setError(err);
      }
    }
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Frame every driver on screen once, the first time positions come in -
  // never again, so polling doesn't yank the map away from an admin who panned.
  useEffect(() => {
    if (hasFitBounds.current || !rides || !mapRef.current) return;
    const points = rides.filter((r) => r.driverLat != null).map((r) => [r.driverLat, r.driverLng]);
    if (points.length > 0) {
      mapRef.current.fitBounds(points, { padding: [60, 60], maxZoom: 14 });
      hasFitBounds.current = true;
    }
  }, [rides]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const ride = rides?.find((r) => r.id === selectedId);
    if (ride?.driverLat != null) {
      mapRef.current.flyTo([ride.driverLat, ride.driverLng], 15, { duration: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div>
      <div className="page-header">
        <h2>Suivi live</h2>
        {rides && (
          <span className="hint">
            {rides.length} course{rides.length === 1 ? '' : 's'} en cours
          </span>
        )}
      </div>

      {error && <p className="error">{error.message}</p>}

      <div className="live-map-layout">
        <div className="panel live-map-panel">
          <MapContainer ref={mapRef} center={DEFAULT_CENTER} zoom={12} scrollWheelZoom>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {rides?.map((ride) => (
              <Fragment key={ride.id}>
                <Marker position={[ride.pickupLat, ride.pickupLng]} icon={PICKUP_ICON}>
                  <Popup>Départ{ride.pickupAddress ? ` — ${ride.pickupAddress}` : ''}</Popup>
                </Marker>
                <Marker position={[ride.destinationLat, ride.destinationLng]} icon={DESTINATION_ICON}>
                  <Popup>Destination{ride.destinationAddress ? ` — ${ride.destinationAddress}` : ''}</Popup>
                </Marker>
                {ride.driverLat != null && (
                  <Marker position={[ride.driverLat, ride.driverLng]} icon={DRIVER_ICON}>
                    <Popup>
                      <strong>{ride.driverName}</strong>
                      <br />
                      {[ride.vehicleModel, ride.vehiclePlate].filter(Boolean).join(' · ') || '—'}
                    </Popup>
                  </Marker>
                )}
                {ride.clientLat != null && (
                  <Marker position={[ride.clientLat, ride.clientLng]} icon={CLIENT_ICON}>
                    <Popup>{ride.clientName}</Popup>
                  </Marker>
                )}
                {ride.driverLat != null && ride.clientLat != null && (
                  <Polyline
                    positions={[
                      [ride.driverLat, ride.driverLng],
                      [ride.clientLat, ride.clientLng],
                    ]}
                    pathOptions={{ color: '#ff6a2c', weight: 2, dashArray: '6 6' }}
                  />
                )}
              </Fragment>
            ))}
          </MapContainer>
        </div>

        <div className="panel live-map-list">
          <h3>Courses actives</h3>
          {rides && rides.length === 0 && <p className="hint">Aucune course en cours.</p>}
          {rides?.map((ride) => (
            <button
              key={ride.id}
              type="button"
              className={`live-ride-item${ride.id === selectedId ? ' selected' : ''}`}
              onClick={() => setSelectedId(ride.id)}
            >
              <div className="live-ride-item-head">
                <span>{ride.driverName || 'Capitaine ?'}</span>
                <StatusBadge status={ride.status} />
              </div>
              <div className="hint">Client : {ride.clientName || '—'}</div>
              <div className="live-ride-item-foot">
                <span>
                  Distance capitaine ↔ client : <strong>{formatDistance(ride.distanceToClientKm)}</strong>
                </span>
                {ride.driverLocationUpdatedAt && <span className="hint">{formatAgo(ride.driverLocationUpdatedAt)}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
