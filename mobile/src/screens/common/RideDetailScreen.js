import { useState } from 'react';
import { Text, ScrollView, View, StyleSheet } from 'react-native';
import RideStatusBadge from '../../components/RideStatusBadge';
import RideSummaryCard from '../../components/RideSummaryCard';
import RatingPrompt from '../../components/RatingPrompt';
import PaymentStatus from '../../components/PaymentStatus';
import { useAuth } from '../../context/AuthContext';
import { rateRide, markRidePaid } from '../../api/rideApi';
import { formatDateTime } from '../../utils/formatters';
import { RIDE_STATUS } from '../../config/constants';

export default function RideDetailScreen({ route }) {
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
      <View style={styles.timestamps}>
        <Text style={styles.label}>Requested: {formatDateTime(ride.requestedAt)}</Text>
        {ride.completedAt ? <Text style={styles.label}>Completed: {formatDateTime(ride.completedAt)}</Text> : null}
        {ride.cancelledAt ? <Text style={styles.label}>Cancelled: {formatDateTime(ride.cancelledAt)}</Text> : null}
        {ride.cancellationReason ? <Text style={styles.label}>Reason: {ride.cancellationReason}</Text> : null}
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
