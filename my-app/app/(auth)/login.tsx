import { useState } from 'react';
import { StyleSheet, View, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { signIn, signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    const result = await signIn(email, password);
    if (result.success) {
      router.replace('/(tabs)');
    } else if (result.error) {
      Alert.alert('로그인 실패', result.error);
    }
  };

  const handleGoogleLogin = async () => {
    const result = await signInWithGoogle();
    if (result.success) {
      router.replace('/(tabs)');
    } else if (result.error) {
      Alert.alert('Google 로그인 실패', result.error);
    }
  };

  const handleSignUp = () => {
    clearError();
    router.push('/(auth)/signup');
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: Colors.brand.primary + '20' }]}>
              <IconSymbol name="book.fill" size={40} color={Colors.brand.primary} />
            </View>
            <ThemedText style={[styles.title, Typography.h1]}>Booked</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              책 속 문장을 기록하세요
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              placeholder="이메일"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearError();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="envelope.fill"
            />
            <Input
              placeholder="비밀번호"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearError();
              }}
              secureTextEntry
              leftIcon="lock.fill"
            />

            {error && (
              <ThemedText style={[styles.errorText, { color: Colors.semantic.error }]}>
                {error}
              </ThemedText>
            )}

            <Button
              title="로그인"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              style={styles.loginButton}
            />

            {/* 구분선 */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <ThemedText style={[styles.dividerText, { color: colors.textTertiary }]}>
                또는
              </ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Google 로그인 버튼 */}
            <Pressable
              onPress={handleGoogleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.googleButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.7 },
                isLoading && { opacity: 0.5 },
              ]}
            >
              <IconSymbol name="globe" size={20} color={colors.text} />
              <ThemedText style={[styles.googleButtonText, { color: colors.text }]}>
                Google로 계속하기
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              계정이 없으신가요?
            </ThemedText>
            <Pressable onPress={handleSignUp}>
              <ThemedText style={[styles.signUpLink, { color: Colors.brand.primary }]}>
                회원가입
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
  },
  form: {
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    ...Typography.body,
  },
  signUpLink: {
    ...Typography.body,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.bodySmall,
    paddingHorizontal: Spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  googleButtonText: {
    ...Typography.body,
    fontWeight: '600',
  },
});
