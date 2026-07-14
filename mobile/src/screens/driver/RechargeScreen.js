import { View, Text, Pressable, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MOBILE_MONEY_METHODS } from '../../config/constants';
import { formatPaymentMethod } from '../../utils/formatters';
import { colors, radius, shadow, spacing } from '../../theme/theme';

// No verified deep-link URL scheme for these Mauritanian mobile-money apps
// (Bankily/Sedad/Masrivi/Click/Bimbank), so this can't open the installed app
// directly - it opens a store search instead, a safe fallback that always
// works whether or not the app is already installed. The driver tops up
// their own mobile-money wallet from there; this screen has no backend call
// at all, it's purely a launcher.
const STORE_SEARCH_TERMS = {
  BANKILY: 'Bankily',
  SEDAD: 'Sedad Mauritanie',
  MASRIVI: 'Masrivi',
  CLICK: 'Click Mauritanie',
  BIMBANK: 'Bimbank',
};

function openStoreSearch(method) {
  const term = encodeURIComponent(STORE_SEARCH_TERMS[method] || method);
  const url = Platform.OS === 'ios'
    ? `https://apps.apple.com/search?term=${term}`
    : `https://play.google.com/store/search?q=${term}&c=apps`;
  Linking.openURL(url).catch(() => {});
}

export default function RechargeScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>{t('recharge.intro')}</Text>

      {MOBILE_MONEY_METHODS.map((method) => (
        <Pressable key={method} style={styles.card} onPress={() => openStoreSearch(method)}>
          <View style={styles.cardIcon}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.primaryDark} />
          </View>
          <Text style={styles.cardLabel}>{formatPaymentMethod(method, t)}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  intro: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
