import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ClientHomeScreen from '../screens/client/ClientHomeScreen';
import WaitingForDriverScreen from '../screens/client/WaitingForDriverScreen';
import ActiveRideScreen from '../screens/client/ActiveRideScreen';
import RideHistoryScreen from '../screens/common/RideHistoryScreen';
import RideDetailScreen from '../screens/common/RideDetailScreen';
import EditProfileScreen from '../screens/common/EditProfileScreen';
import DashboardScreen from '../screens/common/DashboardScreen';

const Stack = createNativeStackNavigator();

export default function ClientNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ClientHome" component={ClientHomeScreen} options={{ title: 'Ride' }} />
      <Stack.Screen name="WaitingForDriver" component={WaitingForDriverScreen} options={{ title: 'Finding a driver', headerBackVisible: false }} />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} options={{ title: 'Your ride', headerBackVisible: false }} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'History' }} />
      <Stack.Screen name="RideDetail" component={RideDetailScreen} options={{ title: 'Ride details' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
    </Stack.Navigator>
  );
}
