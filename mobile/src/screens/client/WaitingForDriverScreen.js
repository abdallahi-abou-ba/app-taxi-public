import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSocket } from '../../context/SocketContext';
import { getRide, cancelRide } from '../../api/rideApi';
import RideSummaryCard from '../../components/RideSummaryCard';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { RIDE_STATUS, RIDE_POLL_INTERVAL_MS, ROLE } from '../../config/constants';

export default function WaitingForDriverScreen({ route, navigation }) {
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
      setError(err.message || 'Could not cancel the ride');
      setCancelling(false);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.title}>Looking for a nearby driver...</Text>
      <ErrorBanner message={error} />
      {ride ? <RideSummaryCard ride={ride} viewerRole={ROLE.CLIENT} /> : null}
      <PrimaryButton title="Cancel ride" variant="danger" onPress={handleCancel} loading={cancelling} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
