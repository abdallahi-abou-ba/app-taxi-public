import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { isValidEmail } from '../../utils/validators';
import { colors, spacing } from '../../theme/theme';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const emailInvalid = email.trim().length > 0 && !isValidEmail(email);
  const canSubmit = isValidEmail(email) && password.length > 0 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(err.message || t('auth.loginFailed'));
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

        <ErrorBanner message={error} />

        <TextField
          label={t('auth.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('auth.emailPlaceholder')}
        />
        {emailInvalid ? <Text style={styles.fieldError}>{t('auth.emailInvalid')}</Text> : null}
        <TextField
          label={t('auth.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('auth.passwordPlaceholder')}
        />

        <PrimaryButton title={t('auth.login')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={styles.submitButton} />

        <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkButton} hitSlop={8}>
          <Text style={styles.linkText}>{t('auth.createAccount')}</Text>
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
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  linkText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14.5,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -10,
    marginBottom: 14,
    fontWeight: '600',
  },
});
