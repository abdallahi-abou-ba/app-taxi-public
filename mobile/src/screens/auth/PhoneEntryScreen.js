import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { colors, spacing } from '../../theme/theme';

export default function PhoneEntryScreen({ navigation }) {
  const { t } = useTranslation();
  const { loginByPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = phone.trim().length >= 8 && password.length > 0 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginByPhone(phone.trim(), password);
      // Session applied on success, RootNavigator switches automatically.
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
          label={t('auth.phoneLabel')}
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
          placeholder={t('auth.passwordPlaceholder')}
        />

        <PrimaryButton title={t('auth.login')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={styles.submitButton} />

        <Pressable onPress={() => navigation.navigate('PhoneRegister')} style={styles.linkButton} hitSlop={8}>
          <Text style={styles.linkText}>{t('auth.createAccount')}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkButton} hitSlop={8}>
          <Text style={styles.linkTextMuted}>{t('auth.useEmailPasswordInstead')}</Text>
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
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14.5,
  },
  linkTextMuted: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
});
