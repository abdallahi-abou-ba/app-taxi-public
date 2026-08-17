import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { updatePushToken } from '../api/userApi';

// Dedicated high-importance channel for ride-request pushes (ride:new) -
// separate from the default channel so a driver's phone gives a heads-up
// alert + sound + long vibration even screen-off/backgrounded, closer to a
// "ringing" experience than the default channel's quiet notification.
// Android only - iOS has no channel concept, see the interruptionLevel
// field sent from the backend instead (push.util.js).
async function ensureRideAlertsChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('ride-alerts', {
    name: 'Nouvelles courses',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    lightColor: '#FFC107',
  });
}

// Requests notification permission and registers the device's Expo push
// token with the backend. Fails silently on denial or any error - push is
// supplementary, not core to using the app (mirrors the silent-fail
// convention in useDriverLocationTracking.js).
export default function usePushRegistration(enabled) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return undefined;

    let cancelled = false;

    (async () => {
      await ensureRideAlertsChannel();
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!cancelled) await updatePushToken(token);
      } catch {
        // Network hiccup, missing projectId, etc. - nothing to surface here.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
