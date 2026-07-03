import { useCallback, useEffect, useState } from 'react';
import { getActiveRide } from '../api/rideApi';

// Fetches the current user's single active (non-terminal) ride, if any.
export default function useActiveRide() {
  const [activeRide, setActiveRide] = useState(undefined); // undefined = not loaded yet, null = none
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const ride = await getActiveRide();
      setActiveRide(ride);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not load your active ride');
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { activeRide, loading: activeRide === undefined && !error, error, refetch };
}
