import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import PhoneRegisterScreen from '../screens/auth/PhoneRegisterScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

// Phone+password is the primary entry point as of the phone-auth rollout -
// Login/Register (email+password) stay registered and fully functional,
// reachable only via PhoneEntryScreen's low-visibility "use an existing
// account" link, as the bridge for accounts that predate phone being a
// login credential.
export default function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="PhoneEntry" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="PhoneRegister" component={PhoneRegisterScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
