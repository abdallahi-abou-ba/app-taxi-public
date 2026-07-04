import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/theme';

export default function SplashScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.logoMark}>
        <Ionicons name="car-sport" size={30} color={colors.charcoal} />
      </View>
      <Text style={styles.loadingText}>{t('splash.loading')}</Text>
      <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.charcoal,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textOnDarkMuted,
    fontWeight: '600',
  },
  spinner: {
    marginTop: 4,
  },
});
