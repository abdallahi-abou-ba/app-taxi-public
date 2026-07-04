import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../context/SocketContext';
import { useDriverLocationStatus } from '../../context/DriverLocationContext';
import { getRide, arriveRide, startRide, completeRide, cancelRide, rateRide, markRidePaid } from '../../api/rideApi';
import OsmMapView from '../../components/OsmMapView';
import RideStatusBadge from '../../components/RideStatusBadge';
import RideSummaryCard from '../../components/RideSummaryCard';
import RatingPrompt from '../../components/RatingPrompt';
import PaymentStatus from '../../components/PaymentStatus';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { RIDE_STATUS, RIDE_POLL_INTERVAL_MS, ROLE } from '../../config/constants';
import { colors, radius, shadow, spacing } from '../../theme/theme';

const NEXT_ACTION = {
  [RIDE_STATUS.ACCEPTED]: { labelKey: 'driver.arrived', action: arriveRide },
  [RIDE_STATUS.ARRIVED]: { labelKey: 'driver.startTrip', action: startRide },
  [RIDE_STATUS.IN_PROGRESS]: { labelKey: 'driver.completeTrip', action: completeRide },
};

export default function DriverActiveRideScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { rideId } = route.params;
  const socket = useSocket();
  const { setHasActiveRide } = useDriverLocationStatus();
  const [ride, setRide] = useState(route.params.ride);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setHasActiveRide(true);
    return () => setHasActiveRide(false);
  }, [setHasActiveRide]);

  const handleStatus = useCallback(
    (updated) => {
      if (!updated || updated.id !== rideId) return;
      setRide(updated);
    },
    [rideId]
  );

  useEffect(() => {
    if (!socket) return undefined;
    socket.on('ride:status', handleStatus);
    return () => socket.off('ride:status', handleStatus);
  }, [socket, handleStatus]);

  useEffect(() => {
    if (ride?.status === RIDE_STATUS.COMPLETED || ride?.status === RIDE_STATUS.CANCELLED) return undefined;
    const interval = setInterval(async () => {
      try {
        const updated = await getRide(rideId);
        handleStatus(updated);
      } catch (err) {
        // transient poll failure - a socket event or the next tick will catch up
      }
    }, RIDE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [rideId, ride?.status, handleStatus]);

  const handleAdvance = async () => {
    const step = NEXT_ACTION[ride.status];
    if (!step) return;
    setError(null);
    setBusy(true);
    try {
      const updated = await step.action(rideId);
      setRide(updated);
    } catch (err) {
      setError(err.message || t('driver.advanceError'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setError(null);
    setBusy(true);
    try {
      const updated = await cancelRide(rideId);
      setRide(updated);
    } catch (err) {
      setError(err.message || t('driver.cancelError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRate = async (value, comment) => {
    const updated = await rateRide(rideId, value, comment);
    setRide(updated);
  };

  const handleMarkPaid = async () => {
    const updated = await markRidePaid(rideId);
    setRide(updated);
  };

  if (!ride) return null;

  if (ride.status === RIDE_STATUS.COMPLETED || ride.status === RIDE_STATUS.CANCELLED) {
    return (
      <ScrollView contentContainerStyle={styles.endedContainer}>
        <RideStatusBadge status={ride.status} />
        <RideSummaryCard ride={ride} viewerRole={ROLE.DRIVER} />
        {ride.status === RIDE_STATUS.COMPLETED ? (
          <>
            <PaymentStatus ride={ride} viewerRole={ROLE.DRIVER} onMarkPaid={handleMarkPaid} />
            <RatingPrompt ride={ride} viewerRole={ROLE.DRIVER} onSubmit={handleRate} />
          </>
        ) : null}
        <PrimaryButton title={t('common.backHome')} onPress={() => navigation.replace('DriverHome')} />
      </ScrollView>
    );
  }

  const markers = [
    { id: 'pickup', latitude: ride.pickupLat, longitude: ride.pickupLng, label: t('map.pickup') },
    { id: 'destination', latitude: ride.destinationLat, longitude: ride.destinationLng, label: t('map.destination') },
  ];

  const step = NEXT_ACTION[ride.status];

  return (
    <View style={styles.container}>
      <OsmMapView
        initialRegion={{ latitude: ride.pickupLat, longitude: ride.pickupLng, zoom: 14 }}
        markers={markers}
        polyline={ride.routeGeometry}
      />

      <View style={styles.panel}>
        <View style={styles.handle} />
        <ErrorBanner message={error} />
        <RideStatusBadge status={ride.status} />
        <RideSummaryCard ride={ride} viewerRole={ROLE.DRIVER} />
        <PrimaryButton title={t('common.chat')} variant="secondary" onPress={() => navigation.navigate('Chat', { rideId })} />
        {step ? <PrimaryButton title={t(step.labelKey)} onPress={handleAdvance} loading={busy} /> : null}
        <PrimaryButton title={t('common.cancelRide')} variant="danger" onPress={handleCancel} loading={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  endedContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
});
