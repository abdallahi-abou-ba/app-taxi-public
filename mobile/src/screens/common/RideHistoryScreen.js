import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { listRides, hideRideFromHistory } from '../../api/rideApi';
import { useAuth } from '../../context/AuthContext';
import RideStatusBadge from '../../components/RideStatusBadge';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import { formatDateTime, formatFare } from '../../utils/formatters';
import { RIDE_STATUS, ACTIVE_RIDE_STATUSES, TERMINAL_RIDE_STATUSES, ROLE } from '../../config/constants';
import { colors, radius, shadow, spacing } from '../../theme/theme';

export default function RideHistoryScreen({ navigation }) {
  const { t, i18n } = useTranslation();
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
      .catch((err) => setError(err.message || t('history.loadError')));
  }, [t]);

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
    Alert.alert(t('history.removeTitle'), t('history.removeMessage'), [
      { text: t('history.removeCancel'), style: 'cancel' },
      {
        text: t('history.removeConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await hideRideFromHistory(ride.id);
            setRides((current) => current.filter((r) => r.id !== ride.id));
          } catch (err) {
            setError(err.message || t('history.removeError'));
          }
        },
      },
    ]);
  };

  if (!rides && !error) return <LoadingOverlay message={t('splash.loading')} />;

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <FlatList
        data={rides || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
            <Text style={styles.empty}>{t('history.empty')}</Text>
          </View>
        }
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
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              {user.role === ROLE.DRIVER && item.status === RIDE_STATUS.COMPLETED && !item.isPaid ? (
                <View style={styles.unpaidPill}>
                  <Text style={styles.unpaid}>{t('history.unpaid')}</Text>
                </View>
              ) : null}
              {counterpart ? <Text style={styles.counterpart}>{counterpart.fullName}</Text> : null}
              <Text style={styles.date}>{formatDateTime(item.requestedAt, i18n.language)}</Text>
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
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 6,
    ...shadow.card,
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
    fontWeight: '800',
    color: colors.textPrimary,
  },
  counterpart: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  unpaidPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  unpaid: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.danger,
  },
  date: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    marginTop: 60,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '500',
  },
});
