import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDistance, formatDuration, formatFare, formatPaymentMethod } from '../utils/formatters';
import { ROLE } from '../config/constants';

export default function RideSummaryCard({ ride, viewerRole }) {
  const { t } = useTranslation();
  const counterpart = viewerRole === ROLE.DRIVER ? ride.client : ride.driver;
  const counterpartLabel = t(viewerRole === ROLE.DRIVER ? 'common.client' : 'common.driver');

  return (
    <View style={styles.card}>
      {counterpart ? (
        <Text style={styles.counterpart}>
          {counterpartLabel}: {counterpart.fullName}
          {counterpart.phone ? ` · ${counterpart.phone}` : ''}
          {counterpart.ratingCount > 0 ? ` · ★ ${counterpart.ratingAverage.toFixed(1)}` : ''}
        </Text>
      ) : null}
      <Text style={styles.address} numberOfLines={1}>
        {t('rideSummary.from', { address: ride.pickupAddress || `${ride.pickupLat.toFixed(4)}, ${ride.pickupLng.toFixed(4)}` })}
      </Text>
      <Text style={styles.address} numberOfLines={1}>
        {t('rideSummary.to', {
          address: ride.destinationAddress || `${ride.destinationLat.toFixed(4)}, ${ride.destinationLng.toFixed(4)}`,
        })}
      </Text>
      <View style={styles.row}>
        <Text style={styles.metric}>{formatDistance(ride.distanceKm)}</Text>
        <Text style={styles.metric}>{formatDuration(ride.durationMin)}</Text>
        <Text style={styles.metric}>{formatFare(ride.estimatedFare)}</Text>
      </View>
      <Text style={styles.address}>{t('payment.label', { method: formatPaymentMethod(ride.paymentMethod, t) })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  counterpart: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metric: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a73e8',
  },
});
