import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../context/SocketContext';
import { getRide, cancelRide } from '../../api/rideApi';
import RideSummaryCard from '../../components/RideSummaryCard';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { RIDE_STATUS, RIDE_POLL_INTERVAL_MS, ROLE } from '../../config/constants';
import { colors, spacing } from '../../theme/theme';

export default function WaitingForDriverScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { rideId } = route.params;
  const socket = useSocket();
  const [ride, setRide] = useState(route.params.ride);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const handledRef = useRef(false);

  const handleUpdate = useCallback(
    (updated) => {
      if (!updated || updated.id !== rideId || handledRef.current) return;

      if (updated.status === RIDE_STATUS.ACCEPTED) {
        handledRef.current = true;
        navigation.replace('ActiveRide', { rideId, ride: updated });
      } else if (updated.status === RIDE_STATUS.CANCELLED) {
        handledRef.current = true;
        navigation.replace('ClientHome');
      } else {
        setRide(updated);
      }
    },
    [navigation, rideId]
  );

  useEffect(() => {
    if (!socket) return undefined;
    socket.on('ride:accepted', handleUpdate);
    socket.on('ride:status', handleUpdate);
    return () => {
      socket.off('ride:accepted', handleUpdate);
      socket.off('ride:status', handleUpdate);
    };
  }, [socket, handleUpdate]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updated = await getRide(rideId);
        handleUpdate(updated);
      } catch (err) {
        // transient poll failure - the next tick or a socket event will catch up
      }
    }, RIDE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [rideId, handleUpdate]);

  const handleCancel = async () => {
    setError(null);
    setCancelling(true);
    try {
      await cancelRide(rideId);
      navigation.replace('ClientHome');
    } catch (err) {
      setError(err.message || t('client.cancelError'));
      setCancelling(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.pulseWrap}>
        <View style={styles.pulseRing} />
        <View style={styles.pulseCore}>
          <Ionicons name="car-sport" size={30} color={colors.charcoal} />
        </View>
      </View>
      <Text style={styles.title}>{t('client.searchingNearby')}</Text>
      <ActivityIndicator size="small" color={colors.primary} />
      <ErrorBanner message={error} />
      {ride ? <RideSummaryCard ride={ride} viewerRole={ROLE.CLIENT} /> : null}
      <PrimaryButton title={t('common.cancelRide')} variant="danger" onPress={handleCancel} loading={cancelling} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  pulseWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
  },
  pulseCore: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
