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
import { colors, radius, spacing } from '../../theme/theme';

export default function CompleteProfileScreen({ route }) {
  const { t } = useTranslation();
  const { completeRegistration } = useAuth();
  const { registrationToken } = route.params;
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [role, setRole] = useState(ROLE.CLIENT);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isDriver = role === ROLE.DRIVER;
  const canSubmit = fullName.trim().length >= 2 && (!isDriver || vehiclePlate.trim().length > 0) && !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await completeRegistration({
        registrationToken,
        fullName: fullName.trim(),
        role,
        referralCode: referralCode.trim() || undefined,
        vehiclePlate: isDriver ? vehiclePlate.trim() : undefined,
        vehicleModel: isDriver ? vehicleModel.trim() || undefined : undefined,
      });
      // Session applied on success, RootNavigator switches automatically.
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
        <Text style={styles.title}>{t('auth.completeProfileTitle')}</Text>

        <ErrorBanner message={error} />

        <View style={styles.roleRow}>
          <RolePill icon="person" label={t('auth.imRider')} active={role === ROLE.CLIENT} onPress={() => setRole(ROLE.CLIENT)} />
          <RolePill icon="car-sport" label={t('auth.imDriver')} active={role === ROLE.DRIVER} onPress={() => setRole(ROLE.DRIVER)} />
        </View>

        {isDriver ? (
          <>
            <TextField
              label={t('auth.vehiclePlateLabel')}
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
              placeholder={t('auth.vehiclePlatePlaceholder')}
            />
            <TextField
              label={t('auth.vehicleModelOptionalLabel')}
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder={t('auth.vehicleModelPlaceholder')}
            />
          </>
        ) : null}

        <TextField label={t('auth.fullNameLabel')} value={fullName} onChangeText={setFullName} placeholder={t('auth.fullNamePlaceholder')} />
        <TextField
          label={t('auth.referralCodeLabel')}
          value={referralCode}
          onChangeText={setReferralCode}
          autoCapitalize="characters"
          placeholder={t('auth.referralCodePlaceholder')}
        />

        <PrimaryButton title={t('auth.createAccount')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={styles.submitButton} />
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
    fontSize: 24,
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
});
