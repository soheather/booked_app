import { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '@/stores/auth-store';
import { useQuotesStore } from '@/stores/quotes-store';
import { useBooksStore } from '@/stores/books-store';
import * as db from '@/services/supabase/database';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, showArrow = true, danger = false }: SettingItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingItem,
        pressed && { backgroundColor: colors.cardPressed },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? Colors.semantic.error + '15' : colors.backgroundTertiary }]}>
        <IconSymbol
          name={icon as any}
          size={20}
          color={danger ? Colors.semantic.error : Colors.brand.primary}
        />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={[styles.settingTitle, danger && { color: Colors.semantic.error }]}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {showArrow && (
        <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { user, isAuthenticated, logout } = useAuthStore();
  const { quotes } = useQuotesStore();
  const { books } = useBooksStore();

  const [stats, setStats] = useState({ totalBooks: 0, totalNotes: 0 });

  useEffect(() => {
    const loadStats = async () => {
      if (user?.id) {
        try {
          const userStats = await db.fetchUserStats(user.id);
          setStats(userStats);
        } catch (error) {
          console.error('Failed to load stats:', error);
        }
      }
    };
    loadStats();
  }, [user?.id, quotes.length, books.length]);

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };

  const handleLogin = () => {
    router.push('/(auth)/login' as any);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText style={[styles.headerTitle, Typography.h1]}>
          설정
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 사용자 정보 */}
        {isAuthenticated && user ? (
          <Card style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: Colors.brand.primary + '20' }]}>
                <ThemedText style={[styles.avatarText, { color: Colors.brand.primary }]}>
                  {user.display_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.userDetails}>
                <ThemedText style={styles.userName}>
                  {user.display_name || '사용자'}
                </ThemedText>
                <ThemedText style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user.email}
                </ThemedText>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.brand.primary }]}>
                  {stats.totalBooks}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                  책
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.brand.primary }]}>
                  {stats.totalNotes}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                  문장
                </ThemedText>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={styles.loginCard}>
            <View style={styles.loginContent}>
              <IconSymbol name="person.circle" size={48} color={colors.textTertiary} />
              <ThemedText style={[styles.loginText, { color: colors.textSecondary }]}>
                로그인하고 데이터를 동기화하세요
              </ThemedText>
              <Pressable
                onPress={handleLogin}
                style={[styles.loginButton, { backgroundColor: Colors.brand.primary }]}
              >
                <ThemedText style={styles.loginButtonText}>로그인</ThemedText>
              </Pressable>
            </View>
          </Card>
        )}

        {/* 계정 섹션 */}
        {isAuthenticated && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              계정
            </ThemedText>
            <Card noPadding style={styles.sectionCard}>
              <SettingItem
                icon="person.fill"
                title="프로필"
                subtitle="이름, 이메일 변경"
                onPress={() => {}}
              />
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <SettingItem
                icon="key.fill"
                title="비밀번호 변경"
                onPress={() => {}}
              />
            </Card>
          </View>
        )}

        {/* 앱 설정 섹션 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            앱 설정
          </ThemedText>
          <Card noPadding style={styles.sectionCard}>
            <SettingItem
              icon="bell.fill"
              title="알림"
              subtitle="푸시 알림 설정"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            <SettingItem
              icon="paintbrush.fill"
              title="테마"
              subtitle="라이트 / 다크 모드"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* 데이터 섹션 */}
        {isAuthenticated && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              데이터
            </ThemedText>
            <Card noPadding style={styles.sectionCard}>
              <SettingItem
                icon="arrow.down.doc.fill"
                title="데이터 내보내기"
                onPress={() => {}}
              />
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <SettingItem
                icon="icloud.fill"
                title="동기화"
                subtitle="마지막 동기화: 방금 전"
                onPress={() => {}}
              />
            </Card>
          </View>
        )}

        {/* 정보 섹션 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            정보
          </ThemedText>
          <Card noPadding style={styles.sectionCard}>
            <SettingItem
              icon="info.circle.fill"
              title="앱 정보"
              subtitle="버전 1.0.0"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            <SettingItem
              icon="doc.text.fill"
              title="이용약관"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            <SettingItem
              icon="hand.raised.fill"
              title="개인정보 처리방침"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* 로그아웃 */}
        {isAuthenticated && (
          <View style={styles.section}>
            <Card noPadding style={styles.sectionCard}>
              <SettingItem
                icon="rectangle.portrait.and.arrow.right"
                title="로그아웃"
                onPress={handleLogout}
                showArrow={false}
                danger
              />
            </Card>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  userCard: {
    marginBottom: Spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...Typography.h3,
    marginBottom: 2,
  },
  userEmail: {
    ...Typography.bodySmall,
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  loginCard: {
    marginBottom: Spacing.lg,
  },
  loginContent: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  loginText: {
    ...Typography.body,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loginButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.body,
    fontWeight: '500',
  },
  settingSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
});
