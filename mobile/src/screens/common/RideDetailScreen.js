import { useState } from 'react';
import { Text, ScrollView, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import RideStatusBadge from '../../components/RideStatusBadge';
import RideSummaryCard from '../../components/RideSummaryCard';
import RatingPrompt from '../../components/RatingPrompt';
import PaymentStatus from '../../components/PaymentStatus';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { rateRide, markRidePaid } from '../../api/rideApi';
import { formatDateTime } from '../../utils/formatters';
import { RIDE_STATUS } from '../../config/constants';

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
          <PaymentStatus ride={ride} viewerRole={user.role} onMarkPaid={handleMarkPaid} />
          <RatingPrompt ride={ride} viewerRole={user.role} onSubmit={handleRate} />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    gap: 14,
  },
  timestamps: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: '#555',
  },
});
