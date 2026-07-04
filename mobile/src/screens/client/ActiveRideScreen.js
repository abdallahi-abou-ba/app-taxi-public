import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useSocket } from '../../context/SocketContext';
import { getRide, cancelRide, rateRide, createCheckoutSession } from '../../api/rideApi';
import OsmMapView from '../../components/OsmMapView';
import RideStatusBadge from '../../components/RideStatusBadge';
import RideSummaryCard from '../../components/RideSummaryCard';
import RatingPrompt from '../../components/RatingPrompt';
import PaymentStatus from '../../components/PaymentStatus';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { RIDE_STATUS, RIDE_POLL_INTERVAL_MS, ROLE } from '../../config/constants';
import { colors, radius, shadow, spacing } from '../../theme/theme';

const TERMINAL_STATUSES = [RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED];

export default function ActiveRideScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { rideId } = route.params;
  const socket = useSocket();
  const [ride, setRide] = useState(route.params.ride);
  const [driverLocation, setDriverLocation] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  const handleStatus = useCallback((updated) => {
    if (!updated || updated.id !== rideId) return;
    setRide(updated);
  }, [rideId]);

  const handleDriverLocation = useCallback(
    (payload) => {
      if (!payload || payload.rideId !== rideId) return;
      setDriverLocation({ latitude: payload.lat, longitude: payload.lng });
    },
    [rideId]
  );

  useEffect(() => {
    if (!socket) return undefined;
    socket.on('ride:status', handleStatus);
    socket.on('driver:location', handleDriverLocation);
    return () => {
      socket.off('ride:status', handleStatus);
      socket.off('driver:location', handleDriverLocation);
    };
  }, [socket, handleStatus, handleDriverLocation]);

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(ride?.status)) return undefined;
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

  const handleCancel = async () => {
    setError(null);
    setCancelling(true);
    try {
      const updated = await cancelRide(rideId);
      setRide(updated);
    } catch (err) {
      setError(err.message || t('client.cancelError'));
    } finally {
      setCancelling(false);
    }
  };

  const handleRate = async (value, comment) => {
    const updated = await rateRide(rideId, value, comment);
    setRide(updated);
  };

  // The ride is COMPLETED by the time this can be called, so polling has
  // already stopped (see the useEffect above) - refetch once to pick up the
  // webhook's result, with one short retry in case it hasn't landed yet.
  const handlePay = async () => {
    const returnUrl = Linking.createURL('payment-result', { queryParams: { rideId } });
    const { url } = await createCheckoutSession(rideId, { successUrl: returnUrl, cancelUrl: returnUrl });
    await WebBrowser.openAuthSessionAsync(url, returnUrl);

    let updated = await getRide(rideId);
    if (!updated.isPaid) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      updated = await getRide(rideId);
    }
    setRide(updated);
  };

  if (!ride) return null;

  if (ride.status === RIDE_STATUS.COMPLETED || ride.status === RIDE_STATUS.CANCELLED) {
    return (
      <ScrollView contentContainerStyle={styles.endedContainer}>
        <RideStatusBadge status={ride.status} />
        {ride.status === RIDE_STATUS.CANCELLED && ride.cancellationReason ? (
          <Text style={styles.reason}>{t('rideDetail.reason', { reason: ride.cancellationReason })}</Text>
        ) : null}
        <RideSummaryCard ride={ride} viewerRole={ROLE.CLIENT} />
        {ride.status === RIDE_STATUS.COMPLETED ? (
          <>
            <PaymentStatus ride={ride} viewerRole={ROLE.CLIENT} onPay={handlePay} />
            <RatingPrompt ride={ride} viewerRole={ROLE.CLIENT} onSubmit={handleRate} />
          </>
        ) : null}
        <PrimaryButton title={t('common.backHome')} onPress={() => navigation.replace('ClientHome')} />
      </ScrollView>
    );
  }

  const markers = [
    { id: 'pickup', latitude: ride.pickupLat, longitude: ride.pickupLng, label: t('map.pickup') },
    { id: 'destination', latitude: ride.destinationLat, longitude: ride.destinationLng, label: t('map.destination') },
    ...(driverLocation ? [{ id: 'driver', latitude: driverLocation.latitude, longitude: driverLocation.longitude, label: t('map.driver') }] : []),
  ];

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
        <RideSummaryCard ride={ride} viewerRole={ROLE.CLIENT} />
        <PrimaryButton title={t('common.chat')} variant="secondary" onPress={() => navigation.navigate('Chat', { rideId })} />
        <PrimaryButton title={t('common.cancelRide')} variant="danger" onPress={handleCancel} loading={cancelling} />
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
  reason: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
