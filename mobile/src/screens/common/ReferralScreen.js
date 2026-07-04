import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getReferralInfo } from '../../api/userApi';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import PrimaryButton from '../../components/PrimaryButton';
import { formatFare } from '../../utils/formatters';
import { colors, radius, shadow, spacing } from '../../theme/theme';

export default function ReferralScreen() {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReferralInfo()
      .then(setInfo)
      .catch((err) => setError(err.message || t('referral.loadError')));
  }, [t]);

  const handleShare = () => {
    if (!info) return;
    Share.share({ message: t('referral.shareMessage', { code: info.referralCode }) }).catch(() => {});
  };

  if (!info && !error) return <LoadingOverlay message={t('splash.loading')} />;

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      {info ? (
        <>
          <View style={styles.codeCard}>
            <View style={styles.giftIcon}>
              <Ionicons name="gift" size={22} color={colors.onPrimary} />
            </View>
            <Text style={styles.codeLabel}>{t('referral.yourCode')}</Text>
            <Text style={styles.code}>{info.referralCode}</Text>
          </View>
          <PrimaryButton title={t('referral.share')} onPress={handleShare} />
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatFare(info.creditBalance)}</Text>
              <Text style={styles.statLabel}>{t('referral.creditBalance')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{info.referralCount}</Text>
              <Text style={styles.statLabel}>{t('referral.referralCount')}</Text>
            </View>
          </View>
          <Text style={styles.howItWorks}>{t('referral.howItWorks')}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: spacing.xl,
    backgroundColor: colors.background,
  },
  codeCard: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: 8,
    ...shadow.raised,
  },
  giftIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  codeLabel: {
    fontSize: 13,
    color: colors.textOnDarkMuted,
    fontWeight: '600',
  },
  code: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  howItWorks: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
