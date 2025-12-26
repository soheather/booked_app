import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export function Loading({
  message,
  fullScreen = false,
  size = 'large',
}: LoadingProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const content = (
    <>
      <ActivityIndicator size={size} color={Colors.brand.primary} />
      {message && (
        <ThemedText style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </ThemedText>
      )}
    </>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
