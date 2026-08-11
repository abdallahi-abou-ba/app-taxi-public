import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { updateLocation } from '../api/locationApi';
import { LOCATION_TRACKING_OPTIONS } from '../config/constants';

// Watches the driver's position continuously and POSTs it to the backend
// while `enabled`. The backend persists it to the DB and relays it to the
// rider of the driver's active ride via Ably (see backend/src/lib/realtime.js).
// A plain REST call rather than a socket emit - this ping stream doesn't
// need to be tied to the realtime connection's own liveness.
export default function useDriverLocationTracking(enabled) {
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, ...LOCATION_TRACKING_OPTIONS },
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude).catch(() => {});
        }
      );

      if (cancelled) {
        subscription.remove();
      } else {
        subscriptionRef.current = subscription;
      }
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [enabled]);
}
