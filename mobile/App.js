import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import usePushRegistration from './src/hooks/usePushRegistration';
import useNotificationTapNavigation from './src/hooks/useNotificationTapNavigation';
import { navigationRef } from './src/navigation/navigationRef';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/screens/common/SplashScreen';
import { loadStoredLanguage } from './src/i18n/languageManager';

// Foreground behavior for incoming pushes - shown as a banner/sound like a
// backgrounded notification would, rather than being silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registers the device's push token once signed in, and routes a tapped push
// to the relevant ride screen. Role-agnostic (unlike DriverLocationTracker),
// so it's mounted at the app root rather than inside a per-role navigator.
function PushNotificationRegistrar() {
  const { status, user } = useAuth();
  const enabled = status === 'signedIn';
  usePushRegistration(enabled);
  useNotificationTapNavigation(enabled, user?.role);
  return null;
}

export default function App() {
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    loadStoredLanguage().finally(() => setLanguageReady(true));
  }, []);

  if (!languageReady) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PushNotificationRegistrar />
        <SocketProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </SocketProvider>
      </AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
