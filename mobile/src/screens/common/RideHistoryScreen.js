import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet, Alert } from 'react-native';
import { listRides, hideRideFromHistory } from '../../api/rideApi';
import { useAuth } from '../../context/AuthContext';
import RideStatusBadge from '../../components/RideStatusBadge';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import { formatDateTime, formatFare } from '../../utils/formatters';
import { RIDE_STATUS, ACTIVE_RIDE_STATUSES, TERMINAL_RIDE_STATUSES, ROLE } from '../../config/constants';

export default function RideHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [rides, setRides] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return listRides()
      .then((data) => {
        setRides(data);
        setError(null);
      })
      .catch((err) => setError(err.message || 'Could not load ride history'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handlePress = (ride) => {
    if (ACTIVE_RIDE_STATUSES.includes(ride.status)) {
      const screen = ride.status === RIDE_STATUS.REQUESTED ? 'WaitingForDriver' : 'ActiveRide';
      navigation.navigate(screen, { rideId: ride.id, ride });
    } else {
      navigation.navigate('RideDetail', { ride });
    }
  };

  const handleDelete = (ride) => {
    Alert.alert('Remove from history', 'This only removes it from your own history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await hideRideFromHistory(ride.id);
            setRides((current) => current.filter((r) => r.id !== ride.id));
          } catch (err) {
            setError(err.message || 'Could not remove this ride');
          }
        },
      },
    ]);
  };

  if (!rides && !error) return <LoadingOverlay message="Loading history..." />;

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <FlatList
        data={rides || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No rides yet</Text>}
        renderItem={({ item }) => {
          const counterpart = user.role === ROLE.DRIVER ? item.client : item.driver;
          return (
            <Pressable style={styles.row} onPress={() => handlePress(item)}>
              <View style={styles.rowHeader}>
                <RideStatusBadge status={item.status} />
                <View style={styles.rowHeaderRight}>
                  <Text style={styles.fare}>{formatFare(item.estimatedFare)}</Text>
                  {TERMINAL_RIDE_STATUSES.includes(item.status) ? (
                    <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              {user.role === ROLE.DRIVER && item.status === RIDE_STATUS.COMPLETED && !item.isPaid ? (
                <Text style={styles.unpaid}>Unpaid</Text>
              ) : null}
              {counterpart ? <Text style={styles.counterpart}>{counterpart.fullName}</Text> : null}
              <Text style={styles.date}>{formatDateTime(item.requestedAt)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fare: {
    fontWeight: '600',
    color: '#1a73e8',
  },
  deleteIcon: {
    fontSize: 16,
  },
  counterpart: {
    fontSize: 13,
    color: '#333',
  },
  unpaid: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a52714',
  },
  date: {
    fontSize: 13,
    color: '#777',
  },
  empty: {
    textAlign: 'center',
    color: '#777',
    marginTop: 40,
  },
});
