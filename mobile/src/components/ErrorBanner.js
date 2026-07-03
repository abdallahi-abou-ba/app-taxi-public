import { View, Text, StyleSheet } from 'react-native';

export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  text: {
    color: '#a52714',
    fontSize: 14,
  },
});
