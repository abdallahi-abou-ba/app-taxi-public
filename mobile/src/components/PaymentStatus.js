import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import PrimaryButton from './PrimaryButton';
import ErrorBanner from './ErrorBanner';
import { ROLE, PAYMENT_METHOD, MOBILE_MONEY_METHODS } from '../config/constants';
import { formatPaymentMethod, formatFare, getAmountDue } from '../utils/formatters';
import { callPhone } from '../utils/call.util';
import { colors, radius, spacing } from '../theme/theme';

// CASH: the driver still confirms collection in person (onMarkPaid). CARD:
// the client pays through a Stripe Checkout Session (onPay) - the driver has
// nothing to manually confirm there, only the webhook ever marks it paid.
// Mobile money (Bankily/Sedad/Masrivi/Click/Bimbank): no gateway API, so it's
// a two-step manual flow instead - the client transfers outside the app then
// declares it paid (onDeclarePaid), and the driver confirms receipt
// (onConfirmPayment) before isPaid ever flips.
export default function PaymentStatus({ ride, viewerRole, onMarkPaid, onPay, onDeclarePaid, onConfirmPayment }) {
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
  const isMobileMoney = MOBILE_MONEY_METHODS.includes(ride.paymentMethod);
  const isDriver = viewerRole === ROLE.DRIVER;

  if (isCardPayment && isDriver) {
    return (
      <View style={[styles.pill, styles.pillPending]}>
        <Ionicons name="time" size={16} color={colors.warning} />
        <Text style={styles.pending}>{t('payment.waitingOnlinePayment')}</Text>
      </View>
    );
  }

  if (isMobileMoney) {
    return (
      <MobileMoneyPaymentStatus
        ride={ride}
        isDriver={isDriver}
        busy={busy}
        setBusy={setBusy}
        error={error}
        setError={setError}
        onDeclarePaid={onDeclarePaid}
        onConfirmPayment={onConfirmPayment}
      />
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

function MobileMoneyPaymentStatus({ ride, isDriver, busy, setBusy, error, setError, onDeclarePaid, onConfirmPayment }) {
  const { t } = useTranslation();
  const declared = !!ride.clientMarkedPaidAt;

  if (!declared && isDriver) {
    return (
      <View style={[styles.pill, styles.pillPending]}>
        <Ionicons name="time" size={16} color={colors.warning} />
        <Text style={styles.pending}>{t('payment.waitingClientDeclaration')}</Text>
      </View>
    );
  }

  if (declared && !isDriver) {
    return (
      <View style={[styles.pill, styles.pillPending]}>
        <Ionicons name="time" size={16} color={colors.warning} />
        <Text style={styles.pending}>{t('payment.waitingDriverConfirmation')}</Text>
      </View>
    );
  }

  const handlePress = async () => {
    setError(null);
    setBusy(true);
    try {
      await (isDriver ? onConfirmPayment() : onDeclarePaid());
    } catch (err) {
      setError(err.message || t(isDriver ? 'payment.confirmPaymentError' : 'payment.declarePaidError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      {!isDriver ? (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsText}>
            {t('payment.mobileMoneyInstructions', {
              method: formatPaymentMethod(ride.paymentMethod, t),
              amount: formatFare(getAmountDue(ride)),
            })}
          </Text>
          {ride.driver?.phone ? (
            <Pressable style={styles.phoneRow} onPress={() => callPhone(ride.driver.phone)} hitSlop={6}>
              <Ionicons name="call-outline" size={15} color={colors.primaryDark} />
              <Text style={styles.phoneText}>{ride.driver.phone}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <PrimaryButton
        title={isDriver ? t('payment.confirmReceipt') : t('payment.declarePaid')}
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
  instructionsBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  phoneText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
