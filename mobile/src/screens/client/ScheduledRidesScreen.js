import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getScheduledRides, cancelRide } from '../../api/rideApi';
import { useAuth } from '../../context/AuthContext';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import RideSummaryCard from '../../components/RideSummaryCard';
import PrimaryButton from '../../components/PrimaryButton';
import { formatDateTime } from '../../utils/formatters';
import { ROLE } from '../../config/constants';

export default function ScheduledRidesScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [rides, setRides] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(() => {
    return getScheduledRides()
      .then((data) => {
        setRides(data);
        setError(null);
      })
      .catch((err) => setError(err.message || t('scheduledRides.loadError')));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCancel = (ride) => {
    Alert.alert(t('scheduledRides.cancelTitle'), t('scheduledRides.cancelMessage'), [
      { text: t('scheduledRides.cancelKeep'), style: 'cancel' },
      {
        text: t('scheduledRides.cancelConfirm'),
        style: 'destructive',
        onPress: async () => {
          setCancellingId(ride.id);
          try {
            await cancelRide(ride.id);
            setRides((current) => current.filter((r) => r.id !== ride.id));
          } catch (err) {
            setError(err.message || t('scheduledRides.cancelError'));
          } finally {
            setCancellingId(null);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>{t('scheduledRides.empty')}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row}>
            <Text style={styles.scheduledFor}>{t('scheduledRides.for', { date: formatDateTime(item.scheduledFor, i18n.language) })}</Text>
            <RideSummaryCard ride={item} viewerRole={user.role === ROLE.DRIVER ? ROLE.DRIVER : ROLE.CLIENT} />
            <PrimaryButton
              title={t('common.cancelRide')}
              variant="danger"
              onPress={() => handleCancel(item)}
              loading={cancellingId === item.id}
            />
          </Pressable>
        )}
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
    gap: 14,
    flexGrow: 1,
  },
  row: {
    gap: 10,
  },
  scheduledFor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  empty: {
    textAlign: 'center',
    color: '#777',
    marginTop: 40,
  },
});
