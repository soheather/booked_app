import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type FABSize = 'md' | 'lg';

interface FABProps {
  icon?: string;
  onPress: () => void;
  size?: FABSize;
  style?: ViewStyle;
  color?: string;
  iconColor?: string;
}

export function FAB({
  icon = 'camera.fill',
  onPress,
  size = 'lg',
  style,
  color,
  iconColor,
}: FABProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeConfig = {
    md: { size: 52, iconSize: 24 },
    lg: { size: 64, iconSize: 28 },
  };

  const config = sizeConfig[size];
  const bgColor = color || Colors.brand.primary;
  const icColor = iconColor || '#FFFFFF';

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.fab,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: bgColor,
        },
        Shadows.xl,
        animatedStyle,
        style,
      ]}
    >
      <IconSymbol name={icon as any} size={config.iconSize} color={icColor} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
