import { Pressable, StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: keyof typeof Spacing;
  noPadding?: boolean;
}

export function Card({
  children,
  onPress,
  style,
  padding = 'md',
  noPadding = false,
}: CardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handlePress = () => {
    if (onPress) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      padding: noPadding ? 0 : Spacing[padding],
    },
    Shadows.sm,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { backgroundColor: colors.cardPressed },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
});
