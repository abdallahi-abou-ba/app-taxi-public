import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import { getMyDocuments, uploadDocument } from '../../api/userApi';
import { colors, radius, spacing, typography } from '../../theme/theme';

const DOCUMENT_TYPES = ['PHOTO', 'ID_CARD', 'LICENSE'];

export default function DriverDocumentsScreen() {
  const { t } = useTranslation();
  const [statusByType, setStatusByType] = useState({});
  const [previewByType, setPreviewByType] = useState({});
  const [uploadingType, setUploadingType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  async function pickAndUpload(type, fromCamera) {
    setError(null);
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

    const asset = result.assets[0];
    setUploadingType(type);
    setPreviewByType((prev) => ({ ...prev, [type]: asset.uri }));
    try {
      const document = await uploadDocument(type, asset);
      setStatusByType((prev) => ({ ...prev, [type]: document }));
    } catch (err) {
      setError(err.message || t('driverDocuments.uploadError'));
    } finally {
      setUploadingType(null);
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

      {DOCUMENT_TYPES.map((type) => {
        const doc = statusByType[type];
        const preview = previewByType[type];
        const isUploading = uploadingType === type;

        return (
          <View key={type} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t(`driverDocuments.types.${type}`)}</Text>
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.cardStatus, doc && styles.cardStatusDone]}>
                  {doc
                    ? t('driverDocuments.uploadedOn', { date: new Date(doc.uploadedAt).toLocaleDateString() })
                    : t('driverDocuments.notUploaded')}
                </Text>
              )}
            </View>

            {preview ? <Image source={{ uri: preview }} style={styles.preview} /> : null}

            <View style={styles.actions}>
              <PrimaryButton
                title={t('driverDocuments.chooseFromGallery')}
                variant="secondary"
                onPress={() => pickAndUpload(type, false)}
                disabled={isUploading}
                style={styles.actionButton}
              />
              <PrimaryButton
                title={t('driverDocuments.takePhoto')}
                variant="secondary"
                onPress={() => pickAndUpload(type, true)}
                disabled={isUploading}
                style={styles.actionButton}
              />
            </View>
          </View>
        );
      })}
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
