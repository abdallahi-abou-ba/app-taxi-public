import { createContext, useContext, useMemo, useState } from 'react';

const ClientLocationContext = createContext(null);

// Mirrors DriverLocationContext.js, minus the "online/offline" concept a
// client doesn't have - hasActiveRide (searching or in a ride) is the only
// signal needed to gate useClientLocationTracking.
export function ClientLocationProvider({ children }) {
  const [hasActiveRide, setHasActiveRide] = useState(false);

  const value = useMemo(() => ({ hasActiveRide, setHasActiveRide }), [hasActiveRide]);

  return <ClientLocationContext.Provider value={value}>{children}</ClientLocationContext.Provider>;
}

export function useClientLocationStatus() {
  const ctx = useContext(ClientLocationContext);
  if (!ctx) throw new Error('useClientLocationStatus must be used within a ClientLocationProvider');
  return ctx;
}
