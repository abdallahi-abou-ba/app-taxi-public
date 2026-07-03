import { useAuth } from '../context/AuthContext';
import { ROLE } from '../config/constants';
import SplashScreen from '../screens/common/SplashScreen';
import AuthNavigator from './AuthNavigator';
import ClientNavigator from './ClientNavigator';
import DriverNavigator from './DriverNavigator';

export default function RootNavigator() {
  const { status, user } = useAuth();

  if (status === 'booting') {
    return <SplashScreen />;
  }

  if (status === 'signedOut' || !user) {
    return <AuthNavigator />;
  }

  return user.role === ROLE.DRIVER ? <DriverNavigator /> : <ClientNavigator />;
}
