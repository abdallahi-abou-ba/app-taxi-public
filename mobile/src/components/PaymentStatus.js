import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import PrimaryButton from './PrimaryButton';
import ErrorBanner from './ErrorBanner';
import { ROLE, PAYMENT_METHOD } from '../config/constants';
import { formatPaymentMethod } from '../utils/formatters';
import { colors, radius, spacing } from '../theme/theme';

// CASH: the driver still confirms collection in person (onMarkPaid). CARD:
// the client pays through a Stripe Checkout Session (onPay) - the driver has
// nothing to manually confirm there, only the webhook ever marks it paid.
export default function PaymentStatus({ ride, viewerRole, onMarkPaid, onPay }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (ride.isPaid) {
    return (
      <View style={[styles.pill, styles.pillPaid]}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={styles.paid}>{t('payment.paid')}</Text>
      </View>
    );
  }

  const isCardPayment = ride.paymentMethod === PAYMENT_METHOD.CARD;
  const isDriver = viewerRole === ROLE.DRIVER;

  if (isCardPayment && isDriver) {
    return (
      <View style={[styles.pill, styles.pillPending]}>
        <Ionicons name="time" size={16} color={colors.warning} />
        <Text style={styles.pending}>{t('payment.waitingOnlinePayment')}</Text>
      </View>
    );
  }

  if (!isCardPayment && !isDriver) {
    return (
      <View style={[styles.pill, styles.pillPending]}>
        <Ionicons name="time" size={16} color={colors.warning} />
        <Text style={styles.pending}>{t('payment.pending')}</Text>
      </View>
    );
  }

  const handlePress = async () => {
    setError(null);
    setBusy(true);
    try {
      await (isCardPayment ? onPay() : onMarkPaid());
    } catch (err) {
      setError(err.message || t(isCardPayment ? 'payment.payError' : 'payment.markPaidError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <PrimaryButton
        title={isCardPayment ? t('payment.payNow') : t('payment.markAsPaid', { method: formatPaymentMethod(ride.paymentMethod, t) })}
        variant="secondary"
        onPress={handlePress}
        loading={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  pillPaid: {
    backgroundColor: colors.successSoft,
  },
  pillPending: {
    backgroundColor: colors.warningSoft,
  },
  paid: {
    fontSize: 13.5,
    color: colors.success,
    fontWeight: '700',
  },
  pending: {
    fontSize: 13.5,
    color: colors.warning,
    fontWeight: '700',
  },
});
