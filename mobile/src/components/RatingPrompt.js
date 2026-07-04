import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import TextField from './TextField';
import PrimaryButton from './PrimaryButton';
import ErrorBanner from './ErrorBanner';
import { ROLE } from '../config/constants';
import { colors, radius, shadow, spacing } from '../theme/theme';

export default function RatingPrompt({ ride, viewerRole, onSubmit }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isClient = viewerRole === ROLE.CLIENT;
  const alreadyRated = isClient ? ride.driverRating != null : ride.clientRating != null;

  if (alreadyRated) {
    return (
      <View style={styles.container}>
        <View style={styles.thanksRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.thanks}>{t(isClient ? 'rating.thanksDriver' : 'rating.thanksClient')}</Text>
        </View>
      </View>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim() || undefined);
    } catch (err) {
      setError(err.message || t('rating.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(isClient ? 'rating.rateDriver' : 'rating.rateClient')}</Text>
      <ErrorBanner message={error} />
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setRating(value)} hitSlop={8}>
            <Ionicons
              name={value <= rating ? 'star' : 'star-outline'}
              size={32}
              color={value <= rating ? colors.primary : colors.border}
            />
          </Pressable>
        ))}
      </View>
      <TextField
        label={t('rating.commentOptional')}
        value={comment}
        onChangeText={setComment}
        placeholder={t('rating.commentPlaceholder')}
        multiline
      />
      <PrimaryButton title={t('rating.submit')} onPress={handleSubmit} disabled={rating === 0} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
  thanksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thanks: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '700',
  },
});
