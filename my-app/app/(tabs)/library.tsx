import { useCallback } from 'react';
import { StyleSheet, View, FlatList, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useBooksStore } from '@/stores/books-store';
import { useAuthStore } from '@/stores/auth-store';
import { Book } from '@/types';

export default function LibraryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { user, isAuthenticated } = useAuthStore();
  const { books, noteCountByBook, isLoading, fetchBookWithNoteCount } = useBooksStore();

  const loadData = useCallback(async () => {
    if (user?.id) {
      await fetchBookWithNoteCount(user.id);
    }
  }, [user?.id, fetchBookWithNoteCount]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?.id) {
        loadData();
      }
    }, [isAuthenticated, user?.id, loadData])
  );

  const handleBookPress = (id: string) => {
    router.push(`/book/${id}` as any);
  };

  const handleAddBook = () => {
    router.push('/book/search?from=library' as any);
  };

  const renderBook = ({ item }: { item: Book }) => {
    const quoteCount = noteCountByBook.get(item.id) || 0;

    return (
      <Card
        onPress={() => handleBookPress(item.id)}
        style={styles.bookCard}
        noPadding
      >
        <View style={styles.bookContent}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.bookCover} />
          ) : (
            <View style={[styles.bookCoverPlaceholder, { backgroundColor: colors.backgroundTertiary }]}>
              <IconSymbol name="book.closed.fill" size={24} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.bookInfo}>
            <ThemedText style={[styles.bookTitle, Typography.label]} numberOfLines={2}>
              {item.title}
            </ThemedText>
            {item.author && (
              <ThemedText style={[styles.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.author}
              </ThemedText>
            )}
            <ThemedText style={[styles.quoteCount, { color: colors.textTertiary }]}>
              {quoteCount}개의 문장
            </ThemedText>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <IconSymbol name="books.vertical" size={40} color={colors.textTertiary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        서재가 비어있어요
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        책을 추가하고 문장을 기록해보세요
      </ThemedText>
      <Button
        title="책 추가하기"
        onPress={handleAddBook}
        style={styles.addButton}
      />
    </View>
  );

  if (isLoading && books.length === 0) {
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
          내 서재
        </ThemedText>
        {books.length > 0 && (
          <Button
            title="추가"
            onPress={handleAddBook}
            variant="ghost"
            size="sm"
          />
        )}
      </View>

      <FlatList
        data={books}
        renderItem={renderBook}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          books.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={books.length > 0 ? styles.row : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadData}
            tintColor={Colors.brand.primary}
          />
        }
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
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'space-between',
  },
  bookCard: {
    width: '48%',
    marginBottom: Spacing.md,
  },
  bookContent: {
    padding: Spacing.sm,
  },
  bookCover: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  bookCoverPlaceholder: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    paddingHorizontal: Spacing.xs,
  },
  bookTitle: {
    marginBottom: 2,
  },
  bookAuthor: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  quoteCount: {
    ...Typography.caption,
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
    marginBottom: Spacing.lg,
  },
  addButton: {
    marginTop: Spacing.sm,
  },
});
