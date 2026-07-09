import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import { getMyDocuments, uploadDocument } from '../../api/userApi';
import { colors, radius, spacing, typography } from '../../theme/theme';

const DOCUMENT_TYPES = ['PHOTO', 'ID_CARD', 'LICENSE'];

export default function DriverDocumentsScreen() {
  const { t } = useTranslation();
  const [statusByType, setStatusByType] = useState({});
  // Picked but not yet uploaded - only sent to the server once "Envoyer le
  // dossier" is pressed, so a driver can attach all 3 documents before
  // committing to a single submit action.
  const [pendingByType, setPendingByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const documents = await getMyDocuments();
      const map = {};
      documents.forEach((doc) => {
        map[doc.type] = doc;
      });
      setStatusByType(map);
    } catch (err) {
      setError(err.message || t('driverDocuments.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickDocument(type, fromCamera) {
    setError(null);
    setSubmitted(false);
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('driverDocuments.permissionDenied'));
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;

    // A gallery pick can be in the device's native format (e.g. HEIC on
    // iPhone) - re-encode to a fixed-size JPEG so the backend's mimetype
    // filter always accepts it and the admin panel (a browser, which can't
    // render HEIC) can always preview it.
    const manipulated = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1600 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    setPendingByType((prev) => ({ ...prev, [type]: { uri: manipulated.uri, mimeType: 'image/jpeg' } }));
  }

  const pendingTypes = DOCUMENT_TYPES.filter((type) => pendingByType[type]);
  const canSubmit = pendingTypes.length > 0 && !submitting;

  async function handleSubmitDossier() {
    setSubmitting(true);
    setError(null);
    setSubmitted(false);
    const failures = [];

    for (const type of pendingTypes) {
      try {
        const document = await uploadDocument(type, pendingByType[type]);
        setStatusByType((prev) => ({ ...prev, [type]: document }));
        setPendingByType((prev) => {
          const next = { ...prev };
          delete next[type];
          return next;
        });
      } catch (err) {
        failures.push(`${t(`driverDocuments.types.${type}`)} (${err.message})`);
      }
    }

    setSubmitting(false);
    if (failures.length > 0) {
      setError(`${t('driverDocuments.uploadError')} : ${failures.join(', ')}`);
    } else {
      setSubmitted(true);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>{t('driverDocuments.subtitle')}</Text>
      <ErrorBanner message={error} />
      {submitted ? (
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.successText}>{t('driverDocuments.submitSuccess')}</Text>
        </View>
      ) : null}

      {DOCUMENT_TYPES.map((type) => {
        const doc = statusByType[type];
        const pending = pendingByType[type];

        return (
          <View key={type} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t(`driverDocuments.types.${type}`)}</Text>
              <Text style={[styles.cardStatus, doc && !pending && styles.cardStatusDone, pending && styles.cardStatusPending]}>
                {pending
                  ? t('driverDocuments.pendingSubmit')
                  : doc
                    ? t('driverDocuments.uploadedOn', { date: new Date(doc.uploadedAt).toLocaleDateString() })
                    : t('driverDocuments.notUploaded')}
              </Text>
            </View>

            {pending ? <Image source={{ uri: pending.uri }} style={styles.preview} /> : null}

            <View style={styles.actions}>
              <PrimaryButton
                title={t('driverDocuments.chooseFromGallery')}
                variant="secondary"
                onPress={() => pickDocument(type, false)}
                disabled={submitting}
                style={styles.actionButton}
              />
              <PrimaryButton
                title={t('driverDocuments.takePhoto')}
                variant="secondary"
                onPress={() => pickDocument(type, true)}
                disabled={submitting}
                style={styles.actionButton}
              />
            </View>
          </View>
        );
      })}

      <PrimaryButton
        title={t('driverDocuments.submitDossier')}
        onPress={handleSubmitDossier}
        disabled={!canSubmit}
        loading={submitting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  cardStatus: {
    ...typography.small,
    color: colors.textMuted,
  },
  cardStatusDone: {
    color: colors.success,
    fontWeight: '700',
  },
  cardStatusPending: {
    color: colors.warning,
    fontWeight: '700',
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
