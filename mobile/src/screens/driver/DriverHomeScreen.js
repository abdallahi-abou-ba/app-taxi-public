import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDriverLocationStatus } from '../../context/DriverLocationContext';
import { updateAvailability } from '../../api/userApi';
import { acceptRide } from '../../api/rideApi';
import useActiveRide from '../../hooks/useActiveRide';
import useCurrentLocation from '../../hooks/useCurrentLocation';
import OsmMapView from '../../components/OsmMapView';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import IncomingRideModal from '../../components/IncomingRideModal';
import { MAP_DEFAULTS } from '../../config/constants';

export default function DriverHomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const socket = useSocket();
  const { isAvailable, setIsAvailable, setHasActiveRide } = useDriverLocationStatus();
  const { activeRide, loading: activeRideLoading } = useActiveRide();
  const { location } = useCurrentLocation();

  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState(null);
  const [incomingRide, setIncomingRide] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const mapRef = useRef(null);

  // The map's initial center is baked in at mount time (see OsmMapView), so if
  // the GPS fix arrives after that first render, the view stays wherever the
  // fallback default was - recenter explicitly once we have a real fix.
  useEffect(() => {
    if (location) mapRef.current?.centerOn(location.latitude, location.longitude, 14);
  }, [location]);

  // Seed local online/offline state from the server-known value once per user.
  useEffect(() => {
    if (user) setIsAvailable(!!user.isAvailable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Resume a mid-ride session (e.g. app was restarted while driving).
  useEffect(() => {
    if (!activeRide) return;
    setHasActiveRide(true);
    navigation.replace('ActiveRide', { rideId: activeRide.id, ride: activeRide });
  }, [activeRide, navigation, setHasActiveRide]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleNewRide = (ride) => {
      // The backend doesn't flip isAvailable off on accept, so a broadcast
      // could still reach a driver mid-ride - don't prompt in that case.
      if (activeRide) return;
      setIncomingRide(ride);
    };
    socket.on('ride:new', handleNewRide);
    return () => socket.off('ride:new', handleNewRide);
  }, [socket, activeRide]);

  const handleToggle = async () => {
    if (!location) {
      setError(t('driver.waitingForLocation'));
      return;
    }
    setError(null);
    setToggling(true);
    const next = !isAvailable;
    try {
      await updateAvailability({ isAvailable: next, currentLat: location.latitude, currentLng: location.longitude });
      setIsAvailable(next);
    } catch (err) {
      setError(err.message || t('driver.toggleError'));
    } finally {
      setToggling(false);
    }
  };

  const handleAccept = async () => {
    if (!incomingRide) return;
    setAccepting(true);
    try {
      const ride = await acceptRide(incomingRide.id);
      setIncomingRide(null);
      setHasActiveRide(true);
      navigation.replace('ActiveRide', { rideId: ride.id, ride });
    } catch (err) {
      setError(err.message || t('driver.acceptError'));
      setIncomingRide(null);
    } finally {
      setAccepting(false);
    }
  };

  if (activeRideLoading) {
    return <LoadingOverlay message={t('splash.loading')} />;
  }

  const initialRegion = location ? { ...location, zoom: 14 } : MAP_DEFAULTS;
  const markers = location ? [{ id: 'me', latitude: location.latitude, longitude: location.longitude, label: t('map.you') }] : [];

  return (
    <View style={styles.container}>
      <OsmMapView ref={mapRef} initialRegion={initialRegion} markers={markers} />

      <View style={styles.panel}>
        <ErrorBanner message={error} />
        <Text style={styles.status}>
          {isAvailable ? t('driver.online') : t('driver.offline')}
          {user.ratingCount > 0 ? `  ·  ★ ${user.ratingAverage.toFixed(1)} (${user.ratingCount})` : ''}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton title={t('common.logout')} variant="secondary" onPress={logout} style={styles.smallButton} />
          <PrimaryButton
            title={t('common.profile')}
            variant="secondary"
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.smallButton}
          />
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            title={t('common.history')}
            variant="secondary"
            onPress={() => navigation.navigate('RideHistory')}
            style={styles.smallButton}
          />
          <PrimaryButton
            title={t('common.stats')}
            variant="secondary"
            onPress={() => navigation.navigate('Dashboard')}
            style={styles.smallButton}
          />
          <PrimaryButton
            title={t('common.referral')}
            variant="secondary"
            onPress={() => navigation.navigate('Referral')}
            style={styles.smallButton}
          />
        </View>
        <PrimaryButton
          title={isAvailable ? t('driver.goOffline') : t('driver.goOnline')}
          variant={isAvailable ? 'danger' : 'primary'}
          onPress={handleToggle}
          loading={toggling}
        />
      </View>

      <IncomingRideModal ride={incomingRide} loading={accepting} onAccept={handleAccept} onDecline={() => setIncomingRide(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  panel: {
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallButton: {
    flex: 1,
  },
});
