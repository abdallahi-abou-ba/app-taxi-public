import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useSocket } from '../context/SocketContext';
import { LOCATION_TRACKING_OPTIONS } from '../config/constants';

// Watches the driver's position continuously and emits it over the socket
// while `enabled`. The backend persists it to the DB and relays it to the
// rider of the driver's active ride on every ping (see backend/src/sockets/index.js).
export default function useDriverLocationTracking(enabled) {
  const socket = useSocket();
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!enabled || !socket) return undefined;

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, ...LOCATION_TRACKING_OPTIONS },
        (position) => {
          socket.emit('location:update', { lat: position.coords.latitude, lng: position.coords.longitude });
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
  }, [enabled, socket]);
}
