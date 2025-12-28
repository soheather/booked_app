import { View, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState } from 'react';
import { format } from 'date-fns';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBooksStore } from '@/stores/books-store';
import { useQuotesStore } from '@/stores/quotes-store';
import { useCaptureStore } from '@/stores/capture-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const books = useBooksStore((state) => state.books);
  const deleteBook = useBooksStore((state) => state.deleteBook);
  const getQuotesByBook = useQuotesStore((state) => state.getQuotesByBook);
  const deleteQuote = useQuotesStore((state) => state.deleteQuote);
  const setSelectedBook = useCaptureStore((state) => state.setSelectedBook);

  const book = books.find((b) => b.id === id);
  const quotes = book ? getQuotesByBook(book.id) : [];

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());

  const handleAddQuote = () => {
    if (book) {
      setSelectedBook(book);
      router.push('/(capture)/camera' as any);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy.MM.dd');
    } catch {
      return '';
    }
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      setSelectedQuoteIds(new Set());
    }
    setIsEditMode(!isEditMode);
  };

  const toggleQuoteSelection = (quoteId: string) => {
    const newSelection = new Set(selectedQuoteIds);
    if (newSelection.has(quoteId)) {
      newSelection.delete(quoteId);
    } else {
      newSelection.add(quoteId);
    }
    setSelectedQuoteIds(newSelection);
  };

  const selectAllQuotes = () => {
    if (selectedQuoteIds.size === quotes.length) {
      setSelectedQuoteIds(new Set());
    } else {
      setSelectedQuoteIds(new Set(quotes.map(q => q.id)));
    }
  };

  const handleDeleteSelectedQuotes = () => {
    if (selectedQuoteIds.size === 0) return;

    Alert.alert(
      '문장 삭제',
      `선택한 ${selectedQuoteIds.size}개의 문장을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const deletePromises = Array.from(selectedQuoteIds).map(id =>
              deleteQuote(id).catch(err => console.error('삭제 실패:', id, err))
            );
            await Promise.all(deletePromises);
            setSelectedQuoteIds(new Set());
            setIsEditMode(false);
          },
        },
      ]
    );
  };

  const handleDeleteBook = () => {
    Alert.alert(
      '책 삭제',
      `"${book?.title}"을(를) 삭제하시겠습니까?\n저장된 ${quotes.length}개의 문장도 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            router.back();
            const deleteQuotePromises = quotes.map(q =>
              deleteQuote(q.id).catch(err => console.error('문장 삭제 실패:', err))
            );
            await Promise.all(deleteQuotePromises);
            await deleteBook(book!.id).catch(err => {
              console.error('책 삭제 실패:', err);
              Alert.alert('오류', '책 삭제에 실패했습니다.');
            });
          },
        },
      ]
    );
  };

  if (!book) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>책을 찾을 수 없습니다.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* 네비게이션 헤더 설정 */}
      <Stack.Screen
        options={{
          title: '책 상세',
          headerRight: () => (
            <Pressable onPress={toggleEditMode} style={styles.headerButton}>
              <ThemedText style={{ color: Colors.brand.primary, fontSize: 16 }}>
                {isEditMode ? '완료' : '편집'}
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
          <View style={styles.sectionHeader}>
            <ThemedText style={Typography.h3}>저장된 문장</ThemedText>
            {isEditMode && quotes.length > 0 && (
              <Pressable onPress={selectAllQuotes} style={styles.selectAllButton}>
                <ThemedText style={{ color: Colors.brand.primary }}>
                  {selectedQuoteIds.size === quotes.length ? '전체 해제' : '전체 선택'}
                </ThemedText>
              </Pressable>
            )}
          </View>

          {quotes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                아직 저장된 문장이 없습니다.
              </ThemedText>
            </Card>
          ) : (
            <Card noPadding>
              {quotes.map((quote, index) => (
                <View key={quote.id}>
                  <Pressable
                    style={styles.quoteItem}
                    onPress={() => {
                      if (isEditMode) {
                        toggleQuoteSelection(quote.id);
                      } else {
                        router.push(`/note/${quote.id}` as any);
                      }
                    }}
                  >
                    {isEditMode && (
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: selectedQuoteIds.has(quote.id) ? Colors.brand.primary : colors.border },
                          selectedQuoteIds.has(quote.id) && { backgroundColor: Colors.brand.primary },
                        ]}
                      >
                        {selectedQuoteIds.has(quote.id) && (
                          <IconSymbol name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    )}
                    <View style={styles.quoteContent}>
                      <ThemedText style={Typography.body} numberOfLines={2}>
                        "{quote.content}"
                      </ThemedText>

                      <View style={styles.quoteInfo}>
                        {quote.created_at && (
                          <ThemedText style={[styles.dateText, { color: colors.textTertiary }]}>
                            {formatDate(quote.created_at)}
                          </ThemedText>
                        )}
                        {quote.page_number && (
                          <ThemedText style={[styles.pageNumber, { color: colors.textTertiary }]}>
                            p.{quote.page_number}
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    {!isEditMode && (
                      <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
                    )}
                  </Pressable>
                  {index !== quotes.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {isEditMode ? (
          <View style={styles.editFooter}>
            <Button
              title="책 삭제"
              variant="outline"
              onPress={handleDeleteBook}
              style={[styles.footerButton, styles.deleteBookButton]}
            />
            <Button
              title={selectedQuoteIds.size > 0 ? `${selectedQuoteIds.size}개 문장 삭제` : '문장 삭제'}
              variant="outline"
              onPress={handleDeleteSelectedQuotes}
              disabled={selectedQuoteIds.size === 0}
              style={[styles.footerButton, styles.deleteQuotesButton]}
            />
          </View>
        ) : (
          <Button
            title="문장 추가하기"
            onPress={handleAddQuote}
            fullWidth
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  scrollContent: {
    paddingBottom: Spacing.md,
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
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  selectAllButton: {
    padding: Spacing.sm,
  },
  emptyCard: {
    padding: Spacing.xl,
  },
  quoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg,
  },
  quoteContent: {
    flex: 1,
  },
  quoteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  dateText: {
    ...Typography.caption,
  },
  pageNumber: {
    ...Typography.caption,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  editFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  footerButton: {
    flex: 1,
  },
  deleteBookButton: {
    borderColor: Colors.semantic.error,
  },
  deleteQuotesButton: {
    borderColor: Colors.semantic.error,
  },
});
