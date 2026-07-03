import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import PrimaryButton from './PrimaryButton';
import ErrorBanner from './ErrorBanner';
import { ROLE } from '../config/constants';
import { formatPaymentMethod } from '../utils/formatters';

// No online gateway either way - the driver still confirms collection in
// person, only the client picks which payment method that'll be.
export default function PaymentStatus({ ride, viewerRole, onMarkPaid }) {
  const { t } = useTranslation();
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState(null);

  if (ride.isPaid) {
    return (
      <View style={styles.container}>
        <Text style={styles.paid}>{t('payment.paid')}</Text>
      </View>
    );
  }

  if (viewerRole !== ROLE.DRIVER) {
    return (
      <View style={styles.container}>
        <Text style={styles.pending}>{t('payment.pending')}</Text>
      </View>
    );
  }

  const handlePress = async () => {
    setError(null);
    setMarking(true);
    try {
      await onMarkPaid();
    } catch (err) {
      setError(err.message || t('payment.markPaidError'));
    } finally {
      setMarking(false);
    }
  };

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <PrimaryButton
        title={t('payment.markAsPaid', { method: formatPaymentMethod(ride.paymentMethod, t) })}
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
