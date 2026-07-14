import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDriverLocationStatus } from '../../context/DriverLocationContext';
import { getMe, updateAvailability } from '../../api/userApi';
import { acceptRide, declineRide } from '../../api/rideApi';
import useActiveRide from '../../hooks/useActiveRide';
import useCurrentLocation from '../../hooks/useCurrentLocation';
import useRideAlertSound from '../../hooks/useRideAlertSound';
import OsmMapView from '../../components/OsmMapView';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import IncomingRideModal from '../../components/IncomingRideModal';
import QuickActionsGrid from '../../components/QuickActionsGrid';
import { MAP_DEFAULTS } from '../../config/constants';
import { colors, radius, shadow, spacing } from '../../theme/theme';

export default function DriverHomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const socket = useSocket();
  const { isAvailable, setIsAvailable, setHasActiveRide } = useDriverLocationStatus();
  const { activeRide, loading: activeRideLoading } = useActiveRide();
  const { location } = useCurrentLocation();

  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState(null);
  const [incomingRide, setIncomingRide] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const mapRef = useRef(null);

  useRideAlertSound(!!incomingRide);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={logout} hitSlop={10} style={styles.headerButton}>
          <Ionicons name="log-out-outline" size={22} color={colors.textOnDark} />
        </Pressable>
      ),
    });
  }, [navigation, logout]);

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

  // approvalStatus otherwise only refreshes on login or the proactive token
  // refresh (up to ~14min stale) - re-read it whenever this screen regains
  // focus (e.g. a driver tapping the "your account was approved/suspended"
  // push) so the banner below reflects the real-time value.
  useFocusEffect(
    useCallback(() => {
      getMe()
        .then(updateUser)
        .catch(() => {});
    }, [updateUser])
  );

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

  const handleDecline = () => {
    if (!incomingRide) return;
    // Best-effort: the ride stays visible to whichever other nearby drivers
    // it was also broadcast to either way, so a failed decline call here
    // isn't worth blocking or alerting on - it just means this driver might
    // see the same request again.
    declineRide(incomingRide.id).catch(() => {});
    setIncomingRide(null);
  };

  if (activeRideLoading) {
    return <LoadingOverlay message={t('splash.loading')} />;
  }

  const isApproved = user.approvalStatus === 'APPROVED';

  const initialRegion = location ? { ...location, zoom: 14 } : MAP_DEFAULTS;
  const markers = location ? [{ id: 'me', latitude: location.latitude, longitude: location.longitude, label: t('map.you') }] : [];

  const quickActions = [
    { key: 'profile', icon: 'person-outline', label: t('common.profile'), onPress: () => navigation.navigate('EditProfile') },
    { key: 'history', icon: 'time-outline', label: t('common.history'), onPress: () => navigation.navigate('RideHistory') },
    { key: 'stats', icon: 'stats-chart-outline', label: t('common.stats'), onPress: () => navigation.navigate('Dashboard') },
    { key: 'referral', icon: 'gift-outline', label: t('common.referral'), onPress: () => navigation.navigate('Referral') },
    { key: 'documents', icon: 'document-attach-outline', label: t('common.documents'), onPress: () => navigation.navigate('DriverDocuments') },
    { key: 'settlements', icon: 'wallet-outline', label: t('common.settlements'), onPress: () => navigation.navigate('Settlements') },
  ];

  return (
    <View style={styles.container}>
      <OsmMapView ref={mapRef} initialRegion={initialRegion} markers={markers} />

      <View style={styles.panel}>
        <View style={styles.handle} />
        <ErrorBanner message={error} />
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isAvailable ? colors.success : colors.textMuted }]} />
          <Text style={styles.status}>{isAvailable ? t('driver.online') : t('driver.offline')}</Text>
          {user.ratingCount > 0 ? (
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={12} color={colors.primaryDark} />
              <Text style={styles.ratingText}>
                {user.ratingAverage.toFixed(1)} ({user.ratingCount})
              </Text>
            </View>
          ) : null}
        </View>

        {!isApproved ? (
          <>
            <Text style={styles.hint}>
              {user.approvalStatus === 'REJECTED'
                ? t('driver.rejectedApproval')
                : user.approvalStatus === 'SUSPENDED'
                  ? t('driver.suspendedApproval')
                  : t('driver.pendingApproval')}
            </Text>
            {user.approvalStatus !== 'SUSPENDED' ? (
              <PrimaryButton
                title={t('driver.uploadDocumentsCta')}
                variant="secondary"
                onPress={() => navigation.navigate('DriverDocuments')}
              />
            ) : null}
          </>
        ) : null}

        <QuickActionsGrid items={quickActions} />

        <PrimaryButton
          title={isAvailable ? t('driver.goOffline') : t('driver.goOnline')}
          variant={isAvailable ? 'danger' : 'primary'}
          onPress={handleToggle}
          loading={toggling}
          disabled={!isApproved}
        />
      </View>

      <IncomingRideModal ride={incomingRide} loading={accepting} onAccept={handleAccept} onDecline={handleDecline} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    paddingHorizontal: 4,
  },
  panel: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  status: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
