import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { formatDistance, formatDuration, formatFare, formatPaymentMethod, getAmountDue } from '../utils/formatters';
import { ROLE } from '../config/constants';
import { colors, radius, shadow, spacing } from '../theme/theme';

export default function RideSummaryCard({ ride, viewerRole }) {
  const { t, i18n } = useTranslation();
  const counterpart = viewerRole === ROLE.DRIVER ? ride.client : ride.driver;
  const counterpartLabel = t(viewerRole === ROLE.DRIVER ? 'common.client' : 'common.driver');
  const hasCredit = ride.creditApplied > 0;
  const amountDue = getAmountDue(ride);
  const isArabic = i18n.language === 'ar';
  const pickupAddress = (isArabic && ride.pickupAddressAr) || ride.pickupAddress;
  const destinationAddress = (isArabic && ride.destinationAddressAr) || ride.destinationAddress;

  return (
    <View style={styles.card}>
      {counterpart ? (
        <View style={styles.counterpartRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{counterpart.fullName?.trim()?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.counterpartInfo}>
            <Text style={styles.counterpartName}>{counterpart.fullName}</Text>
            <Text style={styles.counterpartMeta}>
              {counterpartLabel}
              {counterpart.phone ? ` · ${counterpart.phone}` : ''}
              {counterpart.ratingCount > 0 ? ` · ★ ${counterpart.ratingAverage.toFixed(1)}` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.routeBlock}>
        <View style={styles.routeLine}>
          <View style={styles.dotPickup} />
          <View style={styles.connector} />
          <View style={styles.dotDestination} />
        </View>
        <View style={styles.routeAddresses}>
          <Text style={styles.address} numberOfLines={1}>
            {pickupAddress || `${ride.pickupLat.toFixed(4)}, ${ride.pickupLng.toFixed(4)}`}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {destinationAddress || `${ride.destinationLat.toFixed(4)}, ${ride.destinationLng.toFixed(4)}`}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.metricChip}>
          <Ionicons name="trail-sign-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metric}>{formatDistance(ride.distanceKm)}</Text>
        </View>
        <View style={styles.metricChip}>
          <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metric}>{formatDuration(ride.durationMin)}</Text>
        </View>
        <View style={[styles.metricChip, styles.fareChip]}>
          <Ionicons name="pricetag" size={13} color={colors.onPrimary} />
          <Text style={styles.fareText}>{formatFare(amountDue)}</Text>
        </View>
      </View>
      {hasCredit ? <Text style={styles.credit}>{t('payment.creditApplied', { amount: formatFare(ride.creditApplied) })}</Text> : null}
      <Text style={styles.paymentLabel}>{t('payment.label', { method: formatPaymentMethod(ride.paymentMethod, t) })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  counterpartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  counterpartInfo: {
    flex: 1,
  },
  counterpartName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  counterpartMeta: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  routeBlock: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  routeLine: {
    alignItems: 'center',
    width: 12,
    paddingTop: 4,
  },
  dotPickup: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.charcoal,
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 14,
    backgroundColor: colors.border,
    marginVertical: 3,
  },
  dotDestination: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  routeAddresses: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 14,
  },
  address: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  metric: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  fareChip: {
    backgroundColor: colors.primary,
  },
  fareText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  credit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  paymentLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
