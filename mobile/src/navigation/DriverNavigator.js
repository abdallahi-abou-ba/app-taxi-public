import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { DriverLocationProvider, useDriverLocationStatus } from '../context/DriverLocationContext';
import useDriverLocationTracking from '../hooks/useDriverLocationTracking';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverActiveRideScreen from '../screens/driver/ActiveRideScreen';
import RideHistoryScreen from '../screens/common/RideHistoryScreen';
import RideDetailScreen from '../screens/common/RideDetailScreen';
import EditProfileScreen from '../screens/common/EditProfileScreen';
import DashboardScreen from '../screens/common/DashboardScreen';
import ReferralScreen from '../screens/common/ReferralScreen';
import DriverDocumentsScreen from '../screens/driver/DriverDocumentsScreen';
import SettlementsScreen from '../screens/driver/SettlementsScreen';
import RechargeScreen from '../screens/driver/RechargeScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator();

// Mounted once, above all driver screens, so the GPS watch survives navigation
// between Home and ActiveRide (see DriverLocationContext / useDriverLocationTracking).
function DriverLocationTracker() {
  const { enabled } = useDriverLocationStatus();
  useDriverLocationTracking(enabled);
  return null;
}

export default function DriverNavigator() {
  const { t } = useTranslation();

  return (
    <DriverLocationProvider>
      <DriverLocationTracker />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.charcoal },
          headerTintColor: colors.textOnDark,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: t('nav.drive') }} />
        <Stack.Screen
          name="ActiveRide"
          component={DriverActiveRideScreen}
          options={{ title: t('nav.currentRide'), headerBackVisible: false }}
        />
        <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: t('nav.history') }} />
        <Stack.Screen name="RideDetail" component={RideDetailScreen} options={{ title: t('nav.rideDetails') }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t('nav.editProfile') }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('nav.dashboard') }} />
        <Stack.Screen name="Referral" component={ReferralScreen} options={{ title: t('nav.referral') }} />
        <Stack.Screen name="DriverDocuments" component={DriverDocumentsScreen} options={{ title: t('nav.documents') }} />
        <Stack.Screen name="Settlements" component={SettlementsScreen} options={{ title: t('nav.settlements') }} />
        <Stack.Screen name="Recharge" component={RechargeScreen} options={{ title: t('nav.recharge') }} />
      </Stack.Navigator>
    </DriverLocationProvider>
  );
}
