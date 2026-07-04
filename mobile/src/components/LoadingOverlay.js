import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/theme';

export default function LoadingOverlay({ message }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: colors.background,
  },
  text: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
