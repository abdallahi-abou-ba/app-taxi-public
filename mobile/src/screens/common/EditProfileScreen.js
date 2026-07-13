import { useState } from 'react';
import { View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { updateMe, deleteAccount, uploadAvatar, deleteAvatar, requestPhoneOtp, verifyPhoneOtp } from '../../api/userApi';
import { getApiBaseUrl } from '../../config/env';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { LANGUAGES, setLanguage, restartApp } from '../../i18n/languageManager';
import { colors, radius, spacing } from '../../theme/theme';

export default function EditProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, updateUser, logout, getAccessToken } = useAuth();
  const [fullName, setFullName] = useState(user.fullName);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Optimistically assume a photo exists and try to load it - onError swaps
  // to the initials fallback. avatarVersion busts the Image cache after an
  // upload/delete, since the URL itself never changes otherwise.
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarUri = `${getApiBaseUrl()}/api/users/me/avatar?v=${avatarVersion}`;

  async function pickAvatar(fromCamera) {
    setError(null);
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('editProfile.permissionDenied'));
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets?.[0]) return;

    const manipulated = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 512 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    setAvatarBusy(true);
    try {
      await uploadAvatar({ uri: manipulated.uri, mimeType: 'image/jpeg' });
      setAvatarFailed(false);
      setAvatarVersion((v) => v + 1);
    } catch (err) {
      setError(err.message || t('editProfile.photoError'));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setError(null);
    setAvatarBusy(true);
    try {
      await deleteAvatar();
      setAvatarFailed(true);
      setAvatarVersion((v) => v + 1);
    } catch (err) {
      setError(err.message || t('editProfile.photoError'));
    } finally {
      setAvatarBusy(false);
    }
  }

  // Phone is a login credential now (see backend User.phone's @unique
  // constraint), so changing it must go through the same OTP-verified flow
  // as login, not a raw unverified text field.
  const [phoneChangeOpen, setPhoneChangeOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneChangeError, setPhoneChangeError] = useState(null);
  const [phoneChangeBusy, setPhoneChangeBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteOtpCode, setDeleteOtpCode] = useState('');
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // A phone-only (phone+OTP) account has no email; used purely to pick which
  // confirmation UI to show - the server itself decides which check applies.
  const hasPassword = !!user.email;

  const nameInvalid = fullName.trim().length > 0 && fullName.trim().length < 2;
  const canSubmit = fullName.trim().length >= 2 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const updated = await updateMe({ fullName: fullName.trim() });
      updateUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message || t('editProfile.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const openPhoneChange = () => {
    setPhoneChangeOpen(true);
    setNewPhone('');
    setPhoneCode('');
    setPhoneCodeSent(false);
    setPhoneChangeError(null);
  };

  const handleSendPhoneCode = async () => {
    setPhoneChangeError(null);
    setPhoneChangeBusy(true);
    try {
      const result = await requestPhoneOtp(newPhone.trim());
      setPhoneCodeSent(true);
      if (result.devCode) setPhoneCode(result.devCode);
    } catch (err) {
      setPhoneChangeError(err.message || t('auth.otpRequestError'));
    } finally {
      setPhoneChangeBusy(false);
    }
  };

  const handleConfirmPhoneChange = async () => {
    setPhoneChangeError(null);
    setPhoneChangeBusy(true);
    try {
      const updated = await verifyPhoneOtp(newPhone.trim(), phoneCode.trim());
      updateUser(updated);
      setPhoneChangeOpen(false);
    } catch (err) {
      setPhoneChangeError(err.message || t('auth.otpInvalid'));
    } finally {
      setPhoneChangeBusy(false);
    }
  };

  const handleSelectLanguage = async (lang) => {
    if (lang === i18n.language) return;
    const needsRestart = await setLanguage(lang);
    if (needsRestart) {
      Alert.alert(t('language.restartTitle'), t('language.restartMessage'), [
        { text: t('language.restartNow'), onPress: restartApp },
      ]);
    }
  };

  const handleSendDeleteOtp = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await requestPhoneOtp(user.phone);
      setDeleteOtpSent(true);
    } catch (err) {
      setDeleteError(err.message || t('auth.otpRequestError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(hasPassword ? { password: deletePassword } : { otpCode: deleteOtpCode.trim() });
      await logout();
    } catch (err) {
      setDeleteError(err.message || t('deleteAccount.genericError'));
      setDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {!avatarFailed ? (
              <Image
                source={{ uri: avatarUri, headers: { Authorization: `Bearer ${getAccessToken()}` } }}
                style={styles.avatarImage}
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <Text style={styles.avatarText}>{user.fullName?.trim()?.[0]?.toUpperCase() || '?'}</Text>
            )}
            {avatarBusy ? (
              <View style={styles.avatarBusyOverlay}>
                <ActivityIndicator color={colors.surface} size="small" />
              </View>
            ) : null}
          </View>

          <View style={styles.avatarActions}>
            <Pressable
              onPress={() => pickAvatar(false)}
              disabled={avatarBusy}
              style={({ pressed }) => [styles.avatarActionChip, pressed && styles.avatarActionChipPressed]}
            >
              <Ionicons name="images-outline" size={14} color={colors.textPrimary} />
              <Text style={styles.avatarActionText}>{t('editProfile.chooseFromGallery')}</Text>
            </Pressable>
            <Pressable
              onPress={() => pickAvatar(true)}
              disabled={avatarBusy}
              style={({ pressed }) => [styles.avatarActionChip, pressed && styles.avatarActionChipPressed]}
            >
              <Ionicons name="camera-outline" size={14} color={colors.textPrimary} />
              <Text style={styles.avatarActionText}>{t('editProfile.takePhoto')}</Text>
            </Pressable>
          </View>
          {!avatarFailed ? (
            <Pressable onPress={handleRemoveAvatar} disabled={avatarBusy} hitSlop={6}>
              <Text style={styles.avatarRemoveText}>{t('editProfile.removePhoto')}</Text>
            </Pressable>
          ) : null}
        </View>

        <ErrorBanner message={error} />
        {saved ? (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.saved}>{t('editProfile.saved')}</Text>
          </View>
        ) : null}

        <TextField label={t('editProfile.fullNameLabel')} value={fullName} onChangeText={setFullName} placeholder={t('auth.fullNamePlaceholder')} />
        {nameInvalid ? <Text style={styles.fieldError}>{t('editProfile.nameError')}</Text> : null}

        {user.email ? (
          <View style={styles.readOnly}>
            <Text style={styles.readOnlyLabel}>{t('editProfile.emailLabel')}</Text>
            <Text style={styles.readOnlyValue}>{user.email}</Text>
          </View>
        ) : null}

        <View style={styles.readOnly}>
          <Text style={styles.readOnlyLabel}>{t('editProfile.phoneLabel')}</Text>
          <View style={styles.phoneValueRow}>
            <Text style={styles.readOnlyValue}>{user.phone || t('editProfile.noPhone')}</Text>
            <Pressable onPress={openPhoneChange} hitSlop={8}>
              <Text style={styles.changeLinkText}>{t('editProfile.changePhone')}</Text>
            </Pressable>
          </View>
        </View>

        {phoneChangeOpen ? (
          <View style={styles.phoneChangeForm}>
            <ErrorBanner message={phoneChangeError} />
            <TextField
              label={t('auth.phoneLabel')}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              placeholder={t('auth.phonePlaceholder')}
              editable={!phoneCodeSent}
            />
            {!phoneCodeSent ? (
              <PrimaryButton
                title={t('auth.requestCode')}
                variant="secondary"
                onPress={handleSendPhoneCode}
                disabled={newPhone.trim().length < 8 || phoneChangeBusy}
                loading={phoneChangeBusy}
              />
            ) : (
              <>
                <TextField
                  label={t('auth.otpCodeLabel')}
                  value={phoneCode}
                  onChangeText={setPhoneCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                />
                <PrimaryButton
                  title={t('auth.verifyCode')}
                  onPress={handleConfirmPhoneChange}
                  disabled={phoneCode.trim().length !== 6 || phoneChangeBusy}
                  loading={phoneChangeBusy}
                />
              </>
            )}
            <Pressable onPress={() => setPhoneChangeOpen(false)} hitSlop={8} style={styles.cancelLink}>
              <Text style={styles.changeLinkText}>{t('deleteAccount.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}

        <PrimaryButton title={t('editProfile.saveChanges')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language.sectionTitle')}</Text>
          <View style={styles.languageRow}>
            {Object.values(LANGUAGES).map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => handleSelectLanguage(lang.code)}
                style={[styles.languageOption, i18n.language === lang.code && styles.languageOptionActive]}
              >
                <Text style={[styles.languageOptionText, i18n.language === lang.code && styles.languageOptionTextActive]}>{lang.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.dangerTitle}>{t('deleteAccount.sectionTitle')}</Text>
          <Text style={styles.dangerWarning}>{t('deleteAccount.warning')}</Text>

          {deleteOpen ? (
            <View style={styles.deleteForm}>
              <ErrorBanner message={deleteError} />
              {hasPassword ? (
                <TextField
                  label={t('deleteAccount.passwordPlaceholder')}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                  placeholder={t('deleteAccount.passwordPlaceholder')}
                />
              ) : !deleteOtpSent ? (
                <PrimaryButton
                  title={t('auth.requestCode')}
                  variant="secondary"
                  onPress={handleSendDeleteOtp}
                  loading={deleting}
                />
              ) : (
                <TextField
                  label={t('auth.otpCodeLabel')}
                  value={deleteOtpCode}
                  onChangeText={setDeleteOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                />
              )}
              <Text style={styles.dangerMessage}>{t('deleteAccount.dialogMessage')}</Text>
              <View style={styles.deleteActions}>
                <PrimaryButton
                  title={t('deleteAccount.cancel')}
                  variant="secondary"
                  onPress={() => {
                    setDeleteOpen(false);
                    setDeletePassword('');
                    setDeleteOtpCode('');
                    setDeleteOtpSent(false);
                    setDeleteError(null);
                  }}
                  style={styles.smallButton}
                />
                <PrimaryButton
                  title={t('deleteAccount.confirm')}
                  variant="danger"
                  onPress={handleDeleteAccount}
                  disabled={hasPassword ? deletePassword.length === 0 : deleteOtpCode.trim().length !== 6}
                  loading={deleting}
                  style={styles.smallButton}
                />
              </View>
            </View>
          ) : (
            <PrimaryButton title={t('deleteAccount.button')} variant="danger" onPress={() => setDeleteOpen(true)} />
          )}
        </View>
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
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBusyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28,28,30,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '800',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  avatarActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarActionChipPressed: {
    opacity: 0.8,
  },
  avatarActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avatarRemoveText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -10,
    marginBottom: 14,
    fontWeight: '600',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  saved: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  readOnly: {
    marginBottom: 20,
  },
  readOnlyLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  readOnlyValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  phoneValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  phoneChangeForm: {
    gap: 10,
    marginBottom: 20,
  },
  cancelLink: {
    alignSelf: 'center',
  },
  section: {
    marginTop: 32,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  languageOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  languageOptionActive: {
    backgroundColor: colors.primary,
  },
  languageOptionText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  languageOptionTextActive: {
    color: colors.onPrimary,
  },
  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 20,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.danger,
  },
  dangerWarning: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  dangerMessage: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteForm: {
    gap: 10,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallButton: {
    flex: 1,
  },
});
