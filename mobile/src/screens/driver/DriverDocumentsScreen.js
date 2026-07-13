import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import { getMyDocuments, uploadDocument } from '../../api/userApi';
import { colors, radius, shadow, spacing, typography } from '../../theme/theme';

const DOCUMENT_TYPES = ['PHOTO', 'ID_CARD', 'LICENSE', 'VEHICLE_PHOTO'];

const TYPE_STYLE = {
  PHOTO: { icon: 'person-circle-outline', bg: colors.charcoal, fg: colors.textOnDark },
  ID_CARD: { icon: 'card-outline', bg: colors.primarySoft, fg: colors.primaryDark },
  LICENSE: { icon: 'document-text-outline', bg: colors.infoSoft, fg: colors.info },
  VEHICLE_PHOTO: { icon: 'car-outline', bg: colors.successSoft, fg: colors.success },
};

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

  function removePending(type) {
    setPendingByType((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }

  const pendingTypes = DOCUMENT_TYPES.filter((type) => pendingByType[type]);
  const doneCount = DOCUMENT_TYPES.filter((type) => statusByType[type]).length;
  const progressPct = Math.round((doneCount / DOCUMENT_TYPES.length) * 100);
  const allComplete = doneCount === DOCUMENT_TYPES.length && pendingTypes.length === 0;
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
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.successText}>{t('driverDocuments.submitSuccess')}</Text>
        </View>
      ) : null}

      <View style={styles.progressCard}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressTitle}>
            {t('driverDocuments.progressLabel', { done: doneCount, total: DOCUMENT_TYPES.length })}
          </Text>
          {allComplete ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> : null}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        {pendingTypes.length > 0 ? (
          <View style={styles.pendingNote}>
            <Ionicons name="time-outline" size={13} color={colors.warning} />
            <Text style={styles.pendingNoteText}>
              {t('driverDocuments.pendingCountLabel', { count: pendingTypes.length })}
            </Text>
          </View>
        ) : null}
      </View>

      {DOCUMENT_TYPES.map((type) => {
        const doc = statusByType[type];
        const pending = pendingByType[type];
        const typeStyle = TYPE_STYLE[type];

        let statusIcon = 'ellipse-outline';
        let statusColor = colors.textMuted;
        let statusBg = colors.surfaceAlt;
        let statusLabel = t('driverDocuments.notUploaded');
        let accentColor = colors.border;

        if (pending) {
          statusIcon = 'time-outline';
          statusColor = colors.warning;
          statusBg = colors.warningSoft;
          statusLabel = t('driverDocuments.pendingSubmit');
          accentColor = colors.warning;
        } else if (doc) {
          statusIcon = 'checkmark-circle';
          statusColor = colors.success;
          statusBg = colors.successSoft;
          statusLabel = t('driverDocuments.uploadedOn', { date: new Date(doc.uploadedAt).toLocaleDateString() });
          accentColor = colors.success;
        }

        return (
          <View key={type} style={[styles.card, { borderLeftColor: accentColor }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: typeStyle.bg }]}>
                <Ionicons name={typeStyle.icon} size={20} color={typeStyle.fg} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{t(`driverDocuments.types.${type}`)}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                  <Ionicons name={statusIcon} size={12} color={statusColor} />
                  <Text style={[styles.statusPillText, { color: statusColor }]} numberOfLines={1}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
            </View>

            {pending ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: pending.uri }} style={styles.preview} />
                <Pressable
                  onPress={() => removePending(type)}
                  disabled={submitting}
                  hitSlop={8}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close" size={16} color={colors.surface} />
                </Pressable>
              </View>
            ) : doc ? (
              <View style={styles.sentRow}>
                <View style={styles.sentIconWrap}>
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                </View>
                <Text style={styles.sentText}>{t('driverDocuments.replaceHint')}</Text>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="cloud-upload-outline" size={22} color={colors.textMuted} />
                <Text style={styles.emptyText}>{t('driverDocuments.emptyHint')}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                onPress={() => pickDocument(type, false)}
                disabled={submitting}
                style={({ pressed }) => [styles.pickChip, submitting && styles.pickChipDisabled, pressed && styles.pickChipPressed]}
              >
                <Ionicons name="images-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.pickChipText}>{t('driverDocuments.chooseFromGallery')}</Text>
              </Pressable>
              <Pressable
                onPress={() => pickDocument(type, true)}
                disabled={submitting}
                style={({ pressed }) => [styles.pickChip, submitting && styles.pickChipDisabled, pressed && styles.pickChipPressed]}
              >
                <Ionicons name="camera-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.pickChipText}>{t('driverDocuments.takePhoto')}</Text>
              </Pressable>
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 12,
  },
  successText: {
    color: colors.success,
    fontSize: 13.5,
    fontWeight: '700',
    flex: 1,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pendingNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  previewWrap: {
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 170,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(28,28,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  sentIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.success,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickChipDisabled: {
    opacity: 0.45,
  },
  pickChipPressed: {
    opacity: 0.8,
  },
  pickChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
