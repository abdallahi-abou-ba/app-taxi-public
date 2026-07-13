import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { requestOtp } from '../../api/authApi';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { colors, spacing } from '../../theme/theme';

export default function PhoneEntryScreen({ navigation }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = phone.trim().length >= 8 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await requestOtp(phone.trim());
      navigation.navigate('OtpVerify', { phone: phone.trim(), devCode: result.devCode });
    } catch (err) {
      setError(err.message || t('auth.otpRequestError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoMark}>
          <Ionicons name="car-sport" size={28} color={colors.charcoal} />
        </View>
        <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('auth.phoneEntrySubtitle')}</Text>

        <ErrorBanner message={error} />

        <TextField
          label={t('auth.phoneLabel')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t('auth.phonePlaceholder')}
        />

        <PrimaryButton
          title={t('auth.requestCode')}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          style={styles.submitButton}
        />

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkButton} hitSlop={8}>
          <Text style={styles.linkText}>{t('auth.useEmailPasswordInstead')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
  },
  logoMark: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  linkText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
});
