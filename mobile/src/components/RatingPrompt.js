import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import TextField from './TextField';
import PrimaryButton from './PrimaryButton';
import ErrorBanner from './ErrorBanner';
import { ROLE } from '../config/constants';

export default function RatingPrompt({ ride, viewerRole, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const alreadyRated = viewerRole === ROLE.CLIENT ? ride.driverRating != null : ride.clientRating != null;
  const counterpartLabel = viewerRole === ROLE.CLIENT ? 'driver' : 'client';

  if (alreadyRated) {
    return (
      <View style={styles.container}>
        <Text style={styles.thanks}>Thanks for rating your {counterpartLabel}!</Text>
      </View>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim() || undefined);
    } catch (err) {
      setError(err.message || 'Could not submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate your {counterpartLabel}</Text>
      <ErrorBanner message={error} />
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setRating(value)} hitSlop={8}>
            <Text style={[styles.star, value <= rating && styles.starFilled]}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextField label="Comment (optional)" value={comment} onChangeText={setComment} placeholder="How was your trip?" multiline />
      <PrimaryButton title="Submit rating" onPress={handleSubmit} disabled={rating === 0} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  stars: {
    flexDirection: 'row',
    gap: 6,
  },
  star: {
    fontSize: 32,
    color: '#ccc',
  },
  starFilled: {
    color: '#f5b301',
  },
  thanks: {
    fontSize: 14,
    color: '#1a8b53',
    fontWeight: '600',
  },
});
