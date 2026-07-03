import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { updateMe } from '../../api/userApi';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

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
      setError(err.message || 'Could not save your profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        {saved ? <Text style={styles.saved}>Profile updated</Text> : null}

        <TextField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Jane Doe" />
        {nameInvalid ? <Text style={styles.fieldError}>Name must be at least 2 characters</Text> : null}
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0600000000" />

        <View style={styles.readOnly}>
          <Text style={styles.readOnlyLabel}>Email</Text>
          <Text style={styles.readOnlyValue}>{user.email}</Text>
        </View>

        <PrimaryButton title="Save changes" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
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
});
