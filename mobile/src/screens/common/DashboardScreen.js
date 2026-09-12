import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import DashboardStats from '../../components/DashboardStats';
import DriverPerformanceStats from '../../components/DriverPerformanceStats';
import { ROLE } from '../../config/constants';
import { spacing } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <DashboardStats role={user.role} />
      {user.role === ROLE.DRIVER ? <DriverPerformanceStats /> : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
});
