import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getActiveRide } from '../api/rideApi';

// Fetches the current user's single active (non-terminal) ride, if any.
export default function useActiveRide() {
  const { t } = useTranslation();
  const [activeRide, setActiveRide] = useState(undefined); // undefined = not loaded yet, null = none
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const ride = await getActiveRide();
      setActiveRide(ride);
      setError(null);
    } catch (err) {
      setError(err.message || t('client.activeRideLoadError'));
    }
  }, [t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { activeRide, loading: activeRide === undefined && !error, error, refetch };
}
