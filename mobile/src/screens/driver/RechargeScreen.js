import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import TextField from '../../components/TextField';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import { getTopUpInfo, getMyTopUps, createTopUp } from '../../api/walletApi';
import { MOBILE_MONEY_METHODS } from '../../config/constants';
import { formatFare, formatDateTime, formatPaymentMethod } from '../../utils/formatters';
import { colors, radius, shadow, spacing } from '../../theme/theme';

export default function RechargeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [info, setInfo] = useState(null);
  const [topUps, setTopUps] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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
    setCopied(false);
    if (!method || !numericAmount || !phone.trim()) return;
    setBusy(true);
    try {
      await createTopUp({ amount: numericAmount, method, payerPhone: phone.trim() });
      setAmount('');
      setPhone('');
      setMethod(null);
      await load(true);
    } catch (err) {
      setError(err.message || t('recharge.submitError'));
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = async () => {
    if (!info?.merchantCode) return;
    await Clipboard.setStringAsync(info.merchantCode);
    setCopied(true);
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

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('recharge.currentBalance')}</Text>
        <Text style={styles.balanceValue}>{formatFare(info.creditBalance)}</Text>
        <Pressable onPress={() => navigation.navigate('Settlements')} hitSlop={8}>
          <Text style={styles.balanceLink}>{t('recharge.viewSettlements')}</Text>
        </Pressable>
      </View>

      {info.merchantCode ? (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('recharge.merchantCodeLabel')}</Text>
          <Text style={styles.code}>{info.merchantCode}</Text>
          <Pressable style={styles.copyButton} onPress={handleCopyCode}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={colors.onPrimary} />
            <Text style={styles.copyButtonText}>{copied ? t('recharge.copied') : t('recharge.copyCode')}</Text>
          </Pressable>
          <Text style={styles.codeInstructions}>{t('recharge.codeInstructions')}</Text>
        </View>
      ) : (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={styles.warningText}>{t('recharge.noMerchantCode')}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>{t('recharge.amountLabel', { min: info.minAmount })}</Text>
        <TextField
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder={t('recharge.amountPlaceholder')}
        />
        {belowMinimum ? <Text style={styles.warning}>{t('recharge.belowMinimum', { min: info.minAmount })}</Text> : null}

        <Text style={styles.label}>{t('recharge.phoneLabel')}</Text>
        <TextField
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t('recharge.phonePlaceholder')}
        />

        <Text style={styles.label}>{t('recharge.chooseMethod')}</Text>
        <View style={styles.methodOptions}>
          {MOBILE_MONEY_METHODS.map((m) => (
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

        <PrimaryButton
          title={t('recharge.submit')}
          onPress={handleSubmit}
          loading={busy}
          disabled={!method || !numericAmount || !phone.trim() || belowMinimum || !info.merchantCode}
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
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
    ...shadow.card,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  balanceLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 4,
  },
  codeCard: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 8,
    ...shadow.raised,
  },
  codeLabel: {
    fontSize: 13,
    color: colors.textOnDarkMuted,
    fontWeight: '600',
  },
  code: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  codeInstructions: {
    fontSize: 12.5,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
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
