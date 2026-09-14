import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { updateLocation } from '../api/locationApi';
import { LOCATION_TRACKING_OPTIONS } from '../config/constants';

// Mirrors useDriverLocationTracking.js exactly - watches the client's position
// while `enabled` (has an active/searching ride) and POSTs it to the backend,
// which relays it to the assigned driver via Ably (see
// ride.service.js#updateClientLocation).
export default function useClientLocationTracking(enabled) {
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
