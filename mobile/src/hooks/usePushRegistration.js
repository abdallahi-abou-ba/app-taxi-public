import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { updatePushToken } from '../api/userApi';

// Requests notification permission and registers the device's Expo push
// token with the backend. Fails silently on denial or any error - push is
// supplementary, not core to using the app (mirrors the silent-fail
// convention in useDriverLocationTracking.js).
export default function usePushRegistration(enabled) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return undefined;

    let cancelled = false;

    (async () => {
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
