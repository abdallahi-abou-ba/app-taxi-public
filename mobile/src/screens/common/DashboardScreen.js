import { View, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import DashboardStats from '../../components/DashboardStats';

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <DashboardStats role={user.role} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
