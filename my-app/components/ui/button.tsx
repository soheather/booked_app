import { Pressable, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getBackgroundColor = (pressed: boolean): string => {
    if (disabled) {
      return colorScheme === 'light' ? '#E2E8F0' : '#334155';
    }

    switch (variant) {
      case 'primary':
        return pressed ? Colors.brand.primaryDark : Colors.brand.primary;
      case 'secondary':
        return pressed ? Colors.brand.secondaryDark : Colors.brand.secondary;
      case 'outline':
      case 'ghost':
        return pressed ? colors.backgroundTertiary : 'transparent';
      default:
        return Colors.brand.primary;
    }
  };

  const getTextColor = (): string => {
    if (disabled) {
      return colorScheme === 'light' ? '#9BA1A6' : '#687076';
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
        return '#FFFFFF';
      case 'outline':
      case 'ghost':
        return colors.text;
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = (): string | undefined => {
    if (variant === 'outline') {
      return disabled ? colors.border : colors.text;
    }
    return undefined;
  };

  const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; text: TextStyle }> = {
    sm: {
      height: 36,
      paddingHorizontal: Spacing.md,
      text: Typography.bodySmall,
    },
    md: {
      height: 44,
      paddingHorizontal: Spacing.lg,
      text: Typography.body,
    },
    lg: {
      height: 52,
      paddingHorizontal: Spacing.xl,
      text: Typography.bodyLarge,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(pressed),
          height: currentSize.height,
          paddingHorizontal: currentSize.paddingHorizontal,
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          width: fullWidth ? '100%' : undefined,
        },
        variant === 'primary' && !disabled && Shadows.md,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon}
          <ThemedText
            style={[
              styles.text,
              currentSize.text,
              { color: getTextColor(), fontWeight: '600' },
              leftIcon ? { marginLeft: Spacing.sm } : undefined,
              rightIcon ? { marginRight: Spacing.sm } : undefined,
            ]}
          >
            {title}
          </ThemedText>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  text: {
    textAlign: 'center',
  },
});
