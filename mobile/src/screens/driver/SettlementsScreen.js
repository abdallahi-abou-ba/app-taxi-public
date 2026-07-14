import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import { getMySettlements, declareSettlementPaid } from '../../api/userApi';
import { formatFare, formatDateTime, formatPaymentMethod } from '../../utils/formatters';
import { MOBILE_MONEY_METHODS } from '../../config/constants';
import { colors, radius, shadow, spacing } from '../../theme/theme';

const PAYMENT_ICONS = {
  BANKILY: 'phone-portrait-outline',
  SEDAD: 'phone-portrait-outline',
  MASRIVI: 'phone-portrait-outline',
  CLICK: 'phone-portrait-outline',
  BIMBANK: 'phone-portrait-outline',
};

export default function SettlementsScreen() {
  const { t, i18n } = useTranslation();
  const [settlements, setSettlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMySettlements();
      setSettlements(data);
    } catch (err) {
      setError(err.message || t('settlements.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <ErrorBanner message={error} />
      {settlements && settlements.length === 0 ? <Text style={styles.emptyText}>{t('settlements.empty')}</Text> : null}
      {(settlements || []).map((settlement) => (
        <SettlementCard key={settlement.id} settlement={settlement} t={t} i18n={i18n} onChanged={() => load(true)} />
      ))}
    </ScrollView>
  );
}

function SettlementCard({ settlement, t, i18n, onChanged }) {
  const [method, setMethod] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cardError, setCardError] = useState(null);

  const owesCompany = settlement.netAmount < 0;
  const amountDue = Math.abs(settlement.netAmount);
  const declared = !!settlement.driverMarkedPaidAt;

  const handleDeclare = async () => {
    if (!method) return;
    setCardError(null);
    setBusy(true);
    try {
      await declareSettlementPaid(settlement.id, method);
      onChanged();
    } catch (err) {
      setCardError(err.message || t('settlements.declareError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.period}>
          {formatDateTime(settlement.periodStart, i18n.language)} - {formatDateTime(settlement.periodEnd, i18n.language)}
        </Text>
        <StatusPill status={settlement.status} t={t} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>{owesCompany ? t('settlements.youOwe') : t('settlements.companyOwesYou')}</Text>
        <Text style={[styles.amountValue, owesCompany ? styles.amountDue : styles.amountCredit]}>{formatFare(amountDue)}</Text>
      </View>

      {settlement.status === 'PENDING' && owesCompany ? (
        declared ? (
          <View style={styles.declaredRow}>
            <Ionicons name="time-outline" size={14} color={colors.warning} />
            <Text style={styles.declaredText}>
              {t('settlements.waitingConfirmation', { method: formatPaymentMethod(settlement.driverPaymentMethod, t) })}
            </Text>
          </View>
        ) : (
          <View style={styles.declareForm}>
            <ErrorBanner message={cardError} />
            <Text style={styles.paymentLabel}>{t('settlements.chooseMethod')}</Text>
            <View style={styles.paymentOptions}>
              {MOBILE_MONEY_METHODS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[styles.paymentOption, method === m && styles.paymentOptionActive]}
                >
                  <Ionicons
                    name={PAYMENT_ICONS[m]}
                    size={14}
                    color={method === m ? colors.onPrimary : colors.textSecondary}
                  />
                  <Text style={[styles.paymentOptionText, method === m && styles.paymentOptionTextActive]}>
                    {formatPaymentMethod(m, t)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton title={t('settlements.declarePaid')} onPress={handleDeclare} disabled={!method} loading={busy} />
          </View>
        )
      ) : null}
    </View>
  );
}

function StatusPill({ status, t }) {
  const style =
    status === 'PAID' ? [styles.pill, styles.pillPaid] : status === 'CANCELLED' ? [styles.pill, styles.pillCancelled] : [styles.pill, styles.pillPending];
  const textStyle =
    status === 'PAID' ? styles.pillTextPaid : status === 'CANCELLED' ? styles.pillTextCancelled : styles.pillTextPending;
  return (
    <View style={style}>
      <Text style={textStyle}>{t(`settlements.status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  period: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  pill: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillPending: { backgroundColor: colors.warningSoft },
  pillPaid: { backgroundColor: colors.successSoft },
  pillCancelled: { backgroundColor: colors.surfaceAlt },
  pillTextPending: { fontSize: 11.5, fontWeight: '700', color: colors.warning },
  pillTextPaid: { fontSize: 11.5, fontWeight: '700', color: colors.success },
  pillTextCancelled: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 13.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  amountDue: {
    color: colors.danger,
  },
  amountCredit: {
    color: colors.success,
  },
  declaredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  declaredText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.warning,
    flex: 1,
  },
  declareForm: {
    gap: spacing.sm,
  },
  paymentLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  paymentOptionActive: {
    backgroundColor: colors.primary,
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentOptionTextActive: {
    color: colors.onPrimary,
  },
});
