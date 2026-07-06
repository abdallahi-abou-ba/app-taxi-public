import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { navigationRef } from '../navigation/navigationRef';
import { ROLE } from '../config/constants';

// 'ride:new' is a driver's incoming-request push - they aren't a ride
// participant until they accept, so jumping straight to ActiveRide would
// 403 on the fetch. Land on their home screen instead; everything else
// (accepted/arrived/completed/cancelled) is pushed only to existing
// participants, so ActiveRide can fetch it directly.
function navigate(data, role) {
  if (!data || !navigationRef.isReady()) return;

  if (data.type === 'ride:new') {
    navigationRef.navigate(role === ROLE.DRIVER ? 'DriverHome' : 'ClientHome');
  } else if (data.type === 'ride:search-reminder') {
    // Still REQUESTED, not yet a participant-visible "active" ride in the
    // ActiveRide sense - same waiting screen the client landed on originally.
    navigationRef.navigate('WaitingForDriver', { rideId: data.rideId });
  } else if (data.rideId) {
    navigationRef.navigate('ActiveRide', { rideId: data.rideId });
  }
}

// Routes a tapped push notification to the relevant ride screen, covering
// both a tap that resumes/foregrounds the app (the listener) and one that
// cold-starts it from killed (getLastNotificationResponseAsync).
export default function useNotificationTapNavigation(enabled, role) {
  useEffect(() => {
    if (!enabled) return undefined;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      navigate(response.notification.request.content.data, role);
      Notifications.clearLastNotificationResponseAsync();
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response.notification.request.content.data, role);
    });

    return () => subscription.remove();
  }, [enabled, role]);
}
