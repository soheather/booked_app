import { View, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useQuotesStore } from '@/stores/quotes-store';
import { useBooksStore } from '@/stores/books-store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const quotes = useQuotesStore((state) => state.quotes);
  const toggleFavorite = useQuotesStore((state) => state.toggleFavorite);
  const removeQuote = useQuotesStore((state) => state.removeQuote);
  const books = useBooksStore((state) => state.books);

  const quote = quotes.find((q) => q.id === id);
  const book = quote?.book_id ? books.find((b) => b.id === quote.book_id) : null;

  if (!quote) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>문장을 찾을 수 없습니다.</ThemedText>
      </ThemedView>
    );
  }

  const handleToggleFavorite = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleFavorite(quote.id);
  };

  const handleDelete = () => {
    // TODO: Add confirmation dialog
    removeQuote(quote.id);
    router.back();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Quote Content */}
        <Card style={styles.quoteCard}>
          <ThemedText style={[Typography.quote, styles.quoteText]}>
            "{quote.content}"
          </ThemedText>

          {quote.page_number && (
            <ThemedText style={[styles.pageNumber, { color: colors.textTertiary }]}>
              p.{quote.page_number}
            </ThemedText>
          )}

          {/* Favorite Button */}
          <Pressable onPress={handleToggleFavorite} style={styles.favoriteButton}>
            <IconSymbol
              name={quote.is_favorite ? 'heart.fill' : 'heart'}
              size={24}
              color={quote.is_favorite ? Colors.semantic.error : colors.textTertiary}
            />
          </Pressable>
        </Card>

        {/* Book Info */}
        {book && (
          <Card
            style={styles.bookCard}
            onPress={() => router.push(`/book/${book.id}` as any)}
          >
            <View style={styles.bookContent}>
              {book.cover_url ? (
                <Image source={{ uri: book.cover_url }} style={styles.bookCover} />
              ) : (
                <View style={[styles.bookCoverPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                  <IconSymbol name="book.fill" size={20} color={colors.textTertiary} />
                </View>
              )}
              <View style={styles.bookInfo}>
                <ThemedText style={Typography.bodyBold} numberOfLines={1}>
                  {book.title}
                </ThemedText>
                {book.author && (
                  <ThemedText style={[styles.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                    {book.author}
                  </ThemedText>
                )}
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textTertiary} />
            </View>
          </Card>
        )}

        {/* Original Image */}
        {quote.image_url && (
          <View style={styles.section}>
            <ThemedText style={[Typography.label, styles.sectionTitle, { color: colors.textSecondary }]}>
              원본 이미지
            </ThemedText>
            <Card noPadding>
              <Image source={{ uri: quote.image_url }} style={styles.originalImage} resizeMode="contain" />
            </Card>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <ThemedText style={[Typography.caption, { color: colors.textTertiary }]}>
            저장일: {formatDate(quote.created_at)}
          </ThemedText>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button
          title="삭제"
          variant="outline"
          onPress={handleDelete}
          style={styles.deleteButton}
        />
        <Button
          title="편집"
          onPress={() => {
            // TODO: Implement edit functionality
          }}
          style={styles.editButton}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  quoteCard: {
    marginBottom: Spacing.md,
    position: 'relative',
  },
  quoteText: {
    paddingRight: Spacing.xl,
  },
  pageNumber: {
    ...Typography.caption,
    marginTop: Spacing.md,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  bookCard: {
    marginBottom: Spacing.md,
  },
  bookContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bookCover: {
    width: 40,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  bookCoverPlaceholder: {
    width: 40,
    height: 60,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookAuthor: {
    ...Typography.bodySmall,
    marginTop: Spacing.xxs,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  originalImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  deleteButton: {
    flex: 1,
  },
  editButton: {
    flex: 2,
  },
});
