import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PrimaryButton from './PrimaryButton';
import ErrorBanner from './ErrorBanner';
import { ROLE } from '../config/constants';
import { formatPaymentMethod } from '../utils/formatters';

// No online gateway either way - the driver still confirms collection in
// person, only the client picks which payment method that'll be.
export default function PaymentStatus({ ride, viewerRole, onMarkPaid }) {
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState(null);

  if (ride.isPaid) {
    return (
      <View style={styles.container}>
        <Text style={styles.paid}>Paid ✓</Text>
      </View>
    );
  }

  if (viewerRole !== ROLE.DRIVER) {
    return (
      <View style={styles.container}>
        <Text style={styles.pending}>Payment pending</Text>
      </View>
    );
  }

  const handlePress = async () => {
    setError(null);
    setMarking(true);
    try {
      await onMarkPaid();
    } catch (err) {
      setError(err.message || 'Could not mark this ride as paid');
    } finally {
      setMarking(false);
    }
  };

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <PrimaryButton
        title={`Mark as paid (${formatPaymentMethod(ride.paymentMethod).toLowerCase()})`}
        variant="secondary"
        onPress={handlePress}
        loading={marking}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  paid: {
    fontSize: 14,
    color: '#1a8b53',
    fontWeight: '600',
  },
  pending: {
    fontSize: 14,
    color: '#a52714',
    fontWeight: '600',
  },
});
