import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../context/SocketContext';
import { getRide, cancelRide } from '../../api/rideApi';
import RideSummaryCard from '../../components/RideSummaryCard';
import ErrorBanner from '../../components/ErrorBanner';
import { RIDE_STATUS, RIDE_POLL_INTERVAL_MS, ROLE } from '../../config/constants';
import { colors, spacing, shadow } from '../../theme/theme';

const STEP_INTERVAL_MS = 3200;

export default function WaitingForDriverScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { rideId } = route.params;
  const socket = useSocket();
  const [ride, setRide] = useState(route.params.ride);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const handledRef = useRef(false);

  const steps = t('client.searchingSteps', { returnObjects: true });
  const [stepIndex, setStepIndex] = useState(0);
  const textOpacity = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (!Array.isArray(steps) || steps.length < 2) return undefined;
    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setStepIndex((i) => (i + 1) % steps.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  useEffect(() => {
    const makeLoop = (value, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const loop1 = makeLoop(ring1, 0);
    const loop2 = makeLoop(ring2, 900);
    loop1.start();
    loop2.start();
    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [ring1, ring2]);

  const ringStyle = (value) => ({
    opacity: value.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.5, 0.15, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  });

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
        <Animated.View style={[styles.pulseRing, ringStyle(ring1)]} />
        <Animated.View style={[styles.pulseRing, ringStyle(ring2)]} />
        <View style={styles.pulseCore}>
          <Ionicons name="car-sport" size={30} color={colors.onPrimary} />
        </View>
      </View>
      <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
        {Array.isArray(steps) ? steps[stepIndex] : steps}
      </Animated.Text>
      <ActivityIndicator size="small" color={colors.primary} />
      <ErrorBanner message={error} />
      {ride ? <RideSummaryCard ride={ride} viewerRole={ROLE.CLIENT} /> : null}
      <Pressable onPress={handleCancel} disabled={cancelling} hitSlop={10} style={styles.cancelLink}>
        {cancelling ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Text style={styles.cancelText}>{t('common.cancelRide')}</Text>
        )}
      </Pressable>
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
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
  },
  pulseCore: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cancelLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cancelText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
});
