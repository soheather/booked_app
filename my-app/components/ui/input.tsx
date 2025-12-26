import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...props
}: InputProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return Colors.semantic.error;
    if (isFocused) return Colors.brand.primary;
    return colors.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </ThemedText>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: getBorderColor(),
          },
        ]}
      >
        {leftIcon && (
          <IconSymbol
            name={leftIcon as any}
            size={20}
            color={colors.textTertiary}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            Typography.body,
            {
              color: colors.text,
              paddingLeft: leftIcon ? 0 : Spacing.md,
              paddingRight: rightIcon ? 0 : Spacing.md,
            },
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
            <IconSymbol
              name={rightIcon as any}
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
      {error && (
        <ThemedText style={[styles.error, { color: Colors.semantic.error }]}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    height: 48,
  },
  input: {
    flex: 1,
    height: '100%',
  },
  leftIcon: {
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  rightIcon: {
    padding: Spacing.md,
  },
  error: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});
