import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getReferralInfo } from '../../api/userApi';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import PrimaryButton from '../../components/PrimaryButton';
import { formatFare } from '../../utils/formatters';

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
    gap: 20,
  },
  codeCard: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontSize: 13,
    color: '#666',
  },
  code: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a73e8',
    letterSpacing: 2,
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
    fontWeight: '700',
    color: '#222',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  howItWorks: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});
