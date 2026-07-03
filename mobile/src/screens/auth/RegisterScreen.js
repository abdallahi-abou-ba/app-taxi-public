import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../config/constants';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { isValidEmail } from '../../utils/validators';

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLE.CLIENT);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const emailInvalid = email.trim().length > 0 && !isValidEmail(email);
  const passwordInvalid = password.length > 0 && password.length < 6;
  const canSubmit = fullName.trim().length >= 2 && isValidEmail(email) && password.length >= 6 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role,
      });
    } catch (err) {
      setError(err.message || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.createAccount')}</Text>

        <ErrorBanner message={error} />

        <View style={styles.roleRow}>
          <RolePill label={t('auth.imRider')} active={role === ROLE.CLIENT} onPress={() => setRole(ROLE.CLIENT)} />
          <RolePill label={t('auth.imDriver')} active={role === ROLE.DRIVER} onPress={() => setRole(ROLE.DRIVER)} />
        </View>

        <TextField label={t('auth.fullNameLabel')} value={fullName} onChangeText={setFullName} placeholder={t('auth.fullNamePlaceholder')} />
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
          label={t('auth.phoneOptionalLabel')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t('auth.phonePlaceholder')}
        />
        <TextField
          label={t('auth.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('auth.passwordPlaceholderMin')}
        />
        {passwordInvalid ? <Text style={styles.fieldError}>{t('auth.passwordInvalid')}</Text> : null}

        <PrimaryButton title={t('auth.createAccount')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} />

        <PrimaryButton
          title={t('auth.backToLogin')}
          variant="secondary"
          onPress={() => navigation.navigate('Login')}
          style={styles.secondaryButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RolePill({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
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
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  pillText: {
    color: '#333',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
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
