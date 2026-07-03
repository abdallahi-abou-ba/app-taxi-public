import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

// One-shot current position, with a foreground permission prompt. Returns
// { location, error, loading } where location is { latitude, longitude } or null.
export default function useCurrentLocation() {
  const { t } = useTranslation();
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) {
          setError(t('client.locationPermissionDenied'));
          setLoading(false);
        }
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t('client.locationFetchError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, error, loading };
}
