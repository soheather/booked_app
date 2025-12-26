import { useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FAB } from '@/components/ui/fab';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useQuotesStore } from '@/stores/quotes-store';
import { useBooksStore } from '@/stores/books-store';
import { useAuthStore } from '@/stores/auth-store';
import { Note } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { quotes, isLoading: quotesLoading, fetchQuotes, syncToggleFavorite } = useQuotesStore();
  const { books, fetchBooks } = useBooksStore();

  const isLoading = authLoading || quotesLoading;

  // 데이터 로드
  const loadData = useCallback(async () => {
    if (user?.id) {
      await Promise.all([
        fetchQuotes(user.id),
        fetchBooks(user.id),
      ]);
    }
  }, [user?.id, fetchQuotes, fetchBooks]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadData();
    }
  }, [isAuthenticated, user?.id, loadData]);

  const handleCapture = () => {
    router.push('/(capture)/camera');
  };

  const handleQuotePress = (id: string) => {
    router.push(`/note/${id}` as any);
  };

  const handleToggleFavorite = (id: string) => {
    syncToggleFavorite(id);
  };

  const getBookInfo = (bookId?: string) => {
    if (!bookId) return null;
    return books.find((b) => b.id === bookId);
  };

  const renderQuote = ({ item }: { item: Note }) => {
    const book = getBookInfo(item.book_id);

    return (
      <Card onPress={() => handleQuotePress(item.id)} style={styles.quoteCard}>
        <View style={styles.quoteHeader}>
          <View style={styles.quoteContentWrapper}>
            <ThemedText style={[styles.quoteContent, Typography.quote]}>
              "{item.content}"
            </ThemedText>
          </View>
          <Pressable
            onPress={() => handleToggleFavorite(item.id)}
            style={styles.favoriteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol
              name={item.is_favorite ? 'heart.fill' : 'heart'}
              size={20}
              color={item.is_favorite ? Colors.brand.primary : colors.textTertiary}
            />
          </Pressable>
        </View>
        {book && (
          <View style={styles.bookInfo}>
            <ThemedText style={[styles.bookTitle, { color: colors.textSecondary }]}>
              {book.title}
            </ThemedText>
            {book.author && (
              <ThemedText style={[styles.author, { color: colors.textTertiary }]}>
                {book.author}
              </ThemedText>
            )}
          </View>
        )}
        {!book && (
          <View style={styles.bookInfo}>
            <ThemedText style={[styles.bookTitle, { color: colors.textTertiary }]}>
              책 미지정
            </ThemedText>
          </View>
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <IconSymbol name="book.fill" size={40} color={colors.textTertiary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        아직 저장된 문장이 없어요
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        아래 버튼을 눌러{'\n'}책의 문장을 기록해보세요
      </ThemedText>
    </View>
  );

  if (isLoading && quotes.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <Loading message="불러오는 중..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText style={[styles.headerTitle, Typography.h1]}>
          내 문장
        </ThemedText>
        {quotes.length > 0 && (
          <ThemedText style={[styles.headerCount, { color: colors.textSecondary }]}>
            {quotes.length}개
          </ThemedText>
        )}
      </View>

      <FlatList
        data={quotes}
        renderItem={renderQuote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          quotes.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadData}
            tintColor={Colors.brand.primary}
          />
        }
      />

      <FAB
        icon="camera.fill"
        onPress={handleCapture}
        style={{ bottom: insets.bottom + Spacing.xl }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerCount: {
    ...Typography.body,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  quoteCard: {
    marginBottom: Spacing.md,
  },
  quoteHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  quoteContentWrapper: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  quoteContent: {},
  favoriteButton: {
    padding: Spacing.xs,
  },
  bookInfo: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.sm,
  },
  bookTitle: {
    ...Typography.label,
  },
  author: {
    ...Typography.caption,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
});
