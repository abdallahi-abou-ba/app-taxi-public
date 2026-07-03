import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ClientHomeScreen from '../screens/client/ClientHomeScreen';
import WaitingForDriverScreen from '../screens/client/WaitingForDriverScreen';
import ActiveRideScreen from '../screens/client/ActiveRideScreen';
import RideHistoryScreen from '../screens/common/RideHistoryScreen';
import RideDetailScreen from '../screens/common/RideDetailScreen';
import EditProfileScreen from '../screens/common/EditProfileScreen';
import DashboardScreen from '../screens/common/DashboardScreen';

const Stack = createNativeStackNavigator();

export default function ClientNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen name="ClientHome" component={ClientHomeScreen} options={{ title: t('nav.ride') }} />
      <Stack.Screen
        name="WaitingForDriver"
        component={WaitingForDriverScreen}
        options={{ title: t('nav.findingDriver'), headerBackVisible: false }}
      />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} options={{ title: t('nav.yourRide'), headerBackVisible: false }} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: t('nav.history') }} />
      <Stack.Screen name="RideDetail" component={RideDetailScreen} options={{ title: t('nav.rideDetails') }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t('nav.editProfile') }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('nav.dashboard') }} />
    </Stack.Navigator>
  );
}
