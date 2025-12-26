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

export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    const result = await signUp(email, password);
    if (result.success) {
      Alert.alert(
        '회원가입 완료',
        '이메일 인증 후 로그인해주세요.',
        [
          {
            text: '확인',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } else if (result.error) {
      Alert.alert('회원가입 실패', result.error);
    }
  };

  const handleBack = () => {
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
          <Pressable onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, Typography.h3]}>회원가입</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: Colors.brand.primary + '20' }]}>
              <IconSymbol name="person.badge.plus" size={36} color={Colors.brand.primary} />
            </View>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              새 계정을 만들어보세요
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
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearError();
              }}
              secureTextEntry
              leftIcon="lock.fill"
            />
            <Input
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
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
              title="회원가입"
              onPress={handleSignUp}
              loading={isLoading}
              fullWidth
              style={styles.signUpButton}
            />
          </View>

          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              이미 계정이 있으신가요?
            </ThemedText>
            <Pressable onPress={handleBack}>
              <ThemedText style={[styles.loginLink, { color: Colors.brand.primary }]}>
                로그인
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
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
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
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
  signUpButton: {
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
  loginLink: {
    ...Typography.body,
    fontWeight: '600',
  },
});
