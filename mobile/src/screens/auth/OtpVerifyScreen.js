import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { requestOtp } from '../../api/authApi';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { colors, spacing } from '../../theme/theme';

export default function OtpVerifyScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { verifyOtp } = useAuth();
  const { phone, devCode } = route.params;
  // Stub mode has no real SMS channel yet - prefilling from devCode keeps the
  // screen usable end-to-end today, and disappears with zero UI changes once
  // a real SMS provider is wired into sms.util.js server-side.
  const [code, setCode] = useState(devCode || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const canSubmit = code.trim().length === 6 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOtp(phone, code.trim());
      if (result.isNewUser) {
        navigation.navigate('CompleteProfile', { registrationToken: result.registrationToken });
      }
      // Existing user: session is already applied, RootNavigator switches automatically.
    } catch (err) {
      setError(err.message || t('auth.otpInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResending(true);
    try {
      const result = await requestOtp(phone);
      if (result.devCode) setCode(result.devCode);
    } catch (err) {
      setError(err.message || t('auth.otpRequestError'));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.otpCodeLabel')}</Text>
        <Text style={styles.subtitle}>{t('auth.otpSentTo', { phone })}</Text>

        <ErrorBanner message={error} />

        <TextField
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          style={styles.codeInput}
        />

        <PrimaryButton
          title={t('auth.verifyCode')}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          style={styles.submitButton}
        />

        <Pressable onPress={handleResend} style={styles.linkButton} hitSlop={8} disabled={resending}>
          <Text style={styles.linkText}>{t('auth.resendCode')}</Text>
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
  title: {
    fontSize: 24,
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
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '700',
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
