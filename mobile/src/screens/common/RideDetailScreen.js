import { useState } from 'react';
import { Text, ScrollView, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import RideStatusBadge from '../../components/RideStatusBadge';
import RideSummaryCard from '../../components/RideSummaryCard';
import RatingPrompt from '../../components/RatingPrompt';
import PaymentStatus from '../../components/PaymentStatus';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { rateRide, markRidePaid, getRide, createCheckoutSession } from '../../api/rideApi';
import { formatDateTime } from '../../utils/formatters';
import { RIDE_STATUS } from '../../config/constants';
import { colors, spacing } from '../../theme/theme';

export default function RideDetailScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [ride, setRide] = useState(route.params.ride);

  const handleRate = async (value, comment) => {
    const updated = await rateRide(ride.id, value, comment);
    setRide(updated);
  };

  const handleMarkPaid = async () => {
    const updated = await markRidePaid(ride.id);
    setRide(updated);
  };

  // Same short-retry pattern as ActiveRideScreen - there's no polling here to
  // pick up the webhook's result otherwise, since this screen only fetches
  // the ride once (via route.params).
  const handlePay = async () => {
    const returnUrl = Linking.createURL('payment-result', { queryParams: { rideId: ride.id } });
    const { url } = await createCheckoutSession(ride.id, { successUrl: returnUrl, cancelUrl: returnUrl });
    await WebBrowser.openAuthSessionAsync(url, returnUrl);

    let updated = await getRide(ride.id);
    if (!updated.isPaid) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      updated = await getRide(ride.id);
    }
    setRide(updated);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RideStatusBadge status={ride.status} />
      <RideSummaryCard ride={ride} viewerRole={user.role} />
      <PrimaryButton title={t('common.chat')} variant="secondary" onPress={() => navigation.navigate('Chat', { rideId: ride.id })} />
      <View style={styles.timestamps}>
        <Text style={styles.label}>{t('rideDetail.requested', { date: formatDateTime(ride.requestedAt, i18n.language) })}</Text>
        {ride.completedAt ? (
          <Text style={styles.label}>{t('rideDetail.completed', { date: formatDateTime(ride.completedAt, i18n.language) })}</Text>
        ) : null}
        {ride.cancelledAt ? (
          <Text style={styles.label}>{t('rideDetail.cancelled', { date: formatDateTime(ride.cancelledAt, i18n.language) })}</Text>
        ) : null}
        {ride.cancellationReason ? <Text style={styles.label}>{t('rideDetail.reason', { reason: ride.cancellationReason })}</Text> : null}
      </View>
      {ride.status === RIDE_STATUS.COMPLETED ? (
        <>
          <PaymentStatus ride={ride} viewerRole={user.role} onMarkPaid={handleMarkPaid} onPay={handlePay} />
          <RatingPrompt ride={ride} viewerRole={user.role} onSubmit={handleRate} />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  timestamps: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
