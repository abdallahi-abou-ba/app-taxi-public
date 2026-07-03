import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingOverlay({ message }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    fontSize: 15,
    color: '#555',
  },
});
