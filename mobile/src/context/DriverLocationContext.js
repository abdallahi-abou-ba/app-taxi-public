import { createContext, useContext, useMemo, useState } from 'react';

const DriverLocationContext = createContext(null);

// Tracks whether the driver should be pinging their location: while online
// (isAvailable) or while they have an assigned active ride (covers toggling
// off mid-ride). Lives above the driver navigator's screens so the GPS watch
// (see useDriverLocationTracking) survives navigation between Home and ActiveRide.
export function DriverLocationProvider({ children }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasActiveRide, setHasActiveRide] = useState(false);

  const value = useMemo(
    () => ({
      isAvailable,
      setIsAvailable,
      hasActiveRide,
      setHasActiveRide,
      enabled: isAvailable || hasActiveRide,
    }),
    [isAvailable, hasActiveRide]
  );

  return <DriverLocationContext.Provider value={value}>{children}</DriverLocationContext.Provider>;
}

export function useDriverLocationStatus() {
  const ctx = useContext(DriverLocationContext);
  if (!ctx) throw new Error('useDriverLocationStatus must be used within a DriverLocationProvider');
  return ctx;
}
