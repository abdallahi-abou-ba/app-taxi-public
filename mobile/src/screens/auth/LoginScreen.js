import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { isValidEmail } from '../../utils/validators';

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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

        <PrimaryButton title={t('auth.login')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} />

        <PrimaryButton
          title={t('auth.createAccount')}
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
          style={styles.secondaryButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 12,
  },
  fieldError: {
    color: '#a52714',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 14,
  },
});
