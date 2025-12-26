import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBooksStore } from '@/stores/books-store';
import { useQuotesStore } from '@/stores/quotes-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const books = useBooksStore((state) => state.books);
  const getQuotesByBook = useQuotesStore((state) => state.getQuotesByBook);

  const book = books.find((b) => b.id === id);
  const quotes = book ? getQuotesByBook(book.id) : [];

  if (!book) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>책을 찾을 수 없습니다.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Book Header */}
        <View style={styles.header}>
          {book.cover_url ? (
            <Image source={{ uri: book.cover_url }} style={styles.cover} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <IconSymbol name="book.fill" size={40} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.bookInfo}>
            <ThemedText style={Typography.h2}>{book.title}</ThemedText>
            {book.author && (
              <ThemedText style={[styles.author, { color: colors.textSecondary }]}>
                {book.author}
              </ThemedText>
            )}
            <ThemedText style={[styles.quoteCount, { color: colors.textTertiary }]}>
              {quotes.length}개의 문장
            </ThemedText>
          </View>
        </View>

        {/* Quotes Section */}
        <View style={styles.section}>
          <ThemedText style={[Typography.h3, styles.sectionTitle]}>저장된 문장</ThemedText>
          {quotes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                아직 저장된 문장이 없습니다.
              </ThemedText>
            </Card>
          ) : (
            quotes.map((quote) => (
              <Card
                key={quote.id}
                style={styles.quoteCard}
                onPress={() => router.push(`/note/${quote.id}` as any)}
              >
                <ThemedText style={Typography.quote} numberOfLines={3}>
                  "{quote.content}"
                </ThemedText>
                {quote.page_number && (
                  <ThemedText style={[styles.pageNumber, { color: colors.textTertiary }]}>
                    p.{quote.page_number}
                  </ThemedText>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Quote Button */}
      <View style={styles.footer}>
        <Button
          title="문장 추가하기"
          onPress={() => router.push('/(capture)/camera')}
          fullWidth
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  cover: {
    width: 100,
    height: 150,
    borderRadius: BorderRadius.md,
  },
  coverPlaceholder: {
    width: 100,
    height: 150,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  author: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  quoteCount: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  section: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  emptyCard: {
    padding: Spacing.xl,
  },
  quoteCard: {
    marginBottom: Spacing.sm,
  },
  pageNumber: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  footer: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
