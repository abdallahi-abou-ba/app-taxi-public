import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { updateMe, deleteAccount } from '../../api/userApi';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import { LANGUAGES, setLanguage, restartApp } from '../../i18n/languageManager';

export default function EditProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const nameInvalid = fullName.trim().length > 0 && fullName.trim().length < 2;
  const canSubmit = fullName.trim().length >= 2 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const updated = await updateMe({ fullName: fullName.trim(), phone: phone.trim() || undefined });
      updateUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message || t('editProfile.saveError'));
    } finally {
      setLoading(false);
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

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      await logout();
    } catch (err) {
      setDeleteError(err.message || t('deleteAccount.genericError'));
      setDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        {saved ? <Text style={styles.saved}>{t('editProfile.saved')}</Text> : null}

        <TextField label={t('editProfile.fullNameLabel')} value={fullName} onChangeText={setFullName} placeholder={t('auth.fullNamePlaceholder')} />
        {nameInvalid ? <Text style={styles.fieldError}>{t('editProfile.nameError')}</Text> : null}
        <TextField
          label={t('editProfile.phoneLabel')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t('auth.phonePlaceholder')}
        />

        <View style={styles.readOnly}>
          <Text style={styles.readOnlyLabel}>{t('editProfile.emailLabel')}</Text>
          <Text style={styles.readOnlyValue}>{user.email}</Text>
        </View>

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
              <TextField
                label={t('deleteAccount.passwordPlaceholder')}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                placeholder={t('deleteAccount.passwordPlaceholder')}
              />
              <Text style={styles.dangerMessage}>{t('deleteAccount.dialogMessage')}</Text>
              <View style={styles.deleteActions}>
                <PrimaryButton
                  title={t('deleteAccount.cancel')}
                  variant="secondary"
                  onPress={() => {
                    setDeleteOpen(false);
                    setDeletePassword('');
                    setDeleteError(null);
                  }}
                  style={styles.smallButton}
                />
                <PrimaryButton
                  title={t('deleteAccount.confirm')}
                  variant="danger"
                  onPress={handleDeleteAccount}
                  disabled={deletePassword.length === 0}
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
  },
  container: {
    flexGrow: 1,
    padding: 24,
  },
  fieldError: {
    color: '#a52714',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 14,
  },
  saved: {
    color: '#1a7a3c',
    fontSize: 14,
    marginBottom: 14,
  },
  readOnly: {
    marginBottom: 20,
  },
  readOnlyLabel: {
    fontSize: 13,
    color: '#444',
    marginBottom: 4,
    fontWeight: '500',
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginTop: 32,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  languageOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  languageOptionActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  languageOptionText: {
    color: '#333',
    fontWeight: '500',
  },
  languageOptionTextActive: {
    color: '#fff',
  },
  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#a52714',
  },
  dangerWarning: {
    fontSize: 13,
    color: '#666',
  },
  dangerMessage: {
    fontSize: 12,
    color: '#666',
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
