import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriverLocationProvider, useDriverLocationStatus } from '../context/DriverLocationContext';
import useDriverLocationTracking from '../hooks/useDriverLocationTracking';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverActiveRideScreen from '../screens/driver/ActiveRideScreen';
import RideHistoryScreen from '../screens/common/RideHistoryScreen';
import RideDetailScreen from '../screens/common/RideDetailScreen';
import EditProfileScreen from '../screens/common/EditProfileScreen';
import DashboardScreen from '../screens/common/DashboardScreen';

const Stack = createNativeStackNavigator();

// Mounted once, above all driver screens, so the GPS watch survives navigation
// between Home and ActiveRide (see DriverLocationContext / useDriverLocationTracking).
function DriverLocationTracker() {
  const { enabled } = useDriverLocationStatus();
  useDriverLocationTracking(enabled);
  return null;
}

export default function DriverNavigator() {
  return (
    <DriverLocationProvider>
      <DriverLocationTracker />
      <Stack.Navigator>
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'Drive' }} />
        <Stack.Screen name="ActiveRide" component={DriverActiveRideScreen} options={{ title: 'Current ride', headerBackVisible: false }} />
        <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="RideDetail" component={RideDetailScreen} options={{ title: 'Ride details' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      </Stack.Navigator>
    </DriverLocationProvider>
  );
}
