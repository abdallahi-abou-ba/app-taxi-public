import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { ROLE } from '../../config/constants';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { isValidEmail } from '../../utils/validators';
import { colors, radius, spacing } from '../../theme/theme';

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
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
        referralCode: referralCode.trim() || undefined,
      });
    } catch (err) {
      setError(err.message || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.createAccount')}</Text>

        <ErrorBanner message={error} />

        <View style={styles.roleRow}>
          <RolePill icon="person" label={t('auth.imRider')} active={role === ROLE.CLIENT} onPress={() => setRole(ROLE.CLIENT)} />
          <RolePill icon="car-sport" label={t('auth.imDriver')} active={role === ROLE.DRIVER} onPress={() => setRole(ROLE.DRIVER)} />
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
        <TextField
          label={t('auth.referralCodeLabel')}
          value={referralCode}
          onChangeText={setReferralCode}
          autoCapitalize="characters"
          placeholder={t('auth.referralCodePlaceholder')}
        />

        <PrimaryButton title={t('auth.createAccount')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={styles.submitButton} />

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkButton} hitSlop={8}>
          <Text style={styles.linkText}>{t('auth.backToLogin')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RolePill({ icon, label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Ionicons name={icon} size={16} color={active ? colors.onPrimary : colors.textSecondary} />
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
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
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13.5,
  },
  pillTextActive: {
    color: colors.onPrimary,
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
