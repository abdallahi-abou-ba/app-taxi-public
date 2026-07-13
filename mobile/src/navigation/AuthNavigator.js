import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

// Phone+OTP is the primary entry point as of the phone-auth rollout - Login/
// Register (email+password) stay registered and fully functional, reachable
// only via PhoneEntryScreen's low-visibility "use an existing account" link,
// as the bridge for accounts that predate phone being a login credential.
export default function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="PhoneEntry" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
