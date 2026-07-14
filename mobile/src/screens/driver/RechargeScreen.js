import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import TextField from '../../components/TextField';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import { getTopUpInfo, getMyTopUps, createTopUp } from '../../api/walletApi';
import { PAYMENT_METHOD, MOBILE_MONEY_METHODS } from '../../config/constants';
import { formatFare, formatDateTime, formatPaymentMethod } from '../../utils/formatters';
import { callPhone } from '../../utils/call.util';
import { colors, radius, shadow, spacing } from '../../theme/theme';

const TOPUP_METHODS = [PAYMENT_METHOD.CARD, ...MOBILE_MONEY_METHODS];

export default function RechargeScreen() {
  const { t, i18n } = useTranslation();
  const [info, setInfo] = useState(null);
  const [topUps, setTopUps] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [infoRes, topUpsRes] = await Promise.all([getTopUpInfo(), getMyTopUps()]);
      setInfo(infoRes);
      setTopUps(topUpsRes);
    } catch (err) {
      setError(err.message || t('recharge.loadError'));
    } finally {
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSubmit = async () => {
    const numericAmount = Number(amount);
    setError(null);
    setSuccess(null);
    if (!method || !numericAmount) return;
    setBusy(true);
    try {
      if (method === PAYMENT_METHOD.CARD) {
        const returnUrl = Linking.createURL('recharge-result');
        const { url } = await createTopUp({ amount: numericAmount, method, successUrl: returnUrl, cancelUrl: returnUrl });
        await WebBrowser.openAuthSessionAsync(url, returnUrl);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        await createTopUp({ amount: numericAmount, method });
        setSuccess(t('recharge.declaredSuccess'));
      }
      setAmount('');
      setMethod(null);
      await load(true);
    } catch (err) {
      setError(err.message || t('recharge.submitError'));
    } finally {
      setBusy(false);
    }
  };

  if (!info) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const numericAmount = Number(amount);
  const belowMinimum = amount !== '' && numericAmount < info.minAmount;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <ErrorBanner message={error} />
      {success ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>{t('recharge.amountLabel', { min: info.minAmount })}</Text>
        <TextField
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder={t('recharge.amountPlaceholder')}
        />
        {belowMinimum ? <Text style={styles.warning}>{t('recharge.belowMinimum', { min: info.minAmount })}</Text> : null}

        <Text style={styles.label}>{t('recharge.chooseMethod')}</Text>
        <View style={styles.methodOptions}>
          {TOPUP_METHODS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={[styles.methodOption, method === m && styles.methodOptionActive]}
            >
              <Text style={[styles.methodOptionText, method === m && styles.methodOptionTextActive]}>
                {formatPaymentMethod(m, t)}
              </Text>
            </Pressable>
          ))}
        </View>

        {method && method !== PAYMENT_METHOD.CARD ? (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsText}>
              {info.companyPhone
                ? t('recharge.mobileMoneyInstructions', { method: formatPaymentMethod(method, t) })
                : t('recharge.noCompanyPhone')}
            </Text>
            {info.companyPhone ? (
              <Pressable style={styles.phoneRow} onPress={() => callPhone(info.companyPhone)} hitSlop={6}>
                <Ionicons name="call-outline" size={15} color={colors.primaryDark} />
                <Text style={styles.phoneText}>{info.companyPhone}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <PrimaryButton
          title={t('recharge.submit')}
          onPress={handleSubmit}
          loading={busy}
          disabled={!method || !numericAmount || belowMinimum}
        />
      </View>

      <Text style={styles.historyTitle}>{t('recharge.history')}</Text>
      {topUps && topUps.length === 0 ? <Text style={styles.emptyText}>{t('recharge.empty')}</Text> : null}
      {(topUps || []).map((topUp) => (
        <View key={topUp.id} style={styles.historyCard}>
          <View style={styles.historyRow}>
            <Text style={styles.historyAmount}>{formatFare(topUp.amount)}</Text>
            <StatusPill status={topUp.status} t={t} />
          </View>
          <Text style={styles.historyMeta}>
            {formatPaymentMethod(topUp.method, t)} · {formatDateTime(topUp.createdAt, i18n.language)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function StatusPill({ status, t }) {
  const style =
    status === 'CONFIRMED' ? [styles.pill, styles.pillConfirmed] : status === 'CANCELLED' ? [styles.pill, styles.pillCancelled] : [styles.pill, styles.pillPending];
  const textStyle =
    status === 'CONFIRMED' ? styles.pillTextConfirmed : status === 'CANCELLED' ? styles.pillTextCancelled : styles.pillTextPending;
  return (
    <View style={style}>
      <Text style={textStyle}>{t(`recharge.status.${status}`)}</Text>
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 12,
  },
  successText: {
    flex: 1,
    color: colors.success,
    fontSize: 13.5,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  warning: {
    fontSize: 12.5,
    color: colors.warning,
    fontWeight: '600',
    marginTop: -8,
  },
  methodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodOption: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  methodOptionActive: {
    backgroundColor: colors.primary,
  },
  methodOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodOptionTextActive: {
    color: colors.onPrimary,
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
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    ...shadow.card,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historyMeta: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  pill: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillPending: { backgroundColor: colors.warningSoft },
  pillConfirmed: { backgroundColor: colors.successSoft },
  pillCancelled: { backgroundColor: colors.surfaceAlt },
  pillTextPending: { fontSize: 11.5, fontWeight: '700', color: colors.warning },
  pillTextConfirmed: { fontSize: 11.5, fontWeight: '700', color: colors.success },
  pillTextCancelled: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
});
