import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBooksStore } from '@/stores/books-store';
import { useAuthStore } from '@/stores/auth-store';
import { Book, BookSearchResult } from '@/types';
import { searchBooks } from '@/services/books/naver-api';

const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET || '';

interface BookSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (book: Book) => void;
}

export function BookSelectModal({ visible, onClose, onSelect }: BookSelectModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { books, fetchBooks, findOrCreateBook } = useBooksStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // 모달 열릴 때 책 목록 새로고침
  useEffect(() => {
    if (visible && user?.id) {
      fetchBooks(user.id);
    }
  }, [visible, user?.id, fetchBooks]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [visible]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
        const results = await searchBooks(searchQuery, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, {
          display: 10,
        });
        setSearchResults(results);
      } else {
        // API 키 없는 경우 더미 데이터
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSearchResults([
          {
            isbn: `isbn-${Date.now()}`,
            title: searchQuery,
            author: '저자 미상',
            publisher: '출판사 미상',
            cover_url: '',
          },
        ]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelectMyBook = (book: Book) => {
    onSelect(book);
  };

  const handleSelectSearchResult = async (result: BookSearchResult) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const book = await findOrCreateBook(user.id, {
        isbn: result.isbn,
        title: result.title,
        author: result.author,
        publisher: result.publisher,
        cover_url: result.cover_url || undefined,
      });
      onSelect(book);
    } catch (error) {
      console.error('Failed to save book:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderMyBook = ({ item }: { item: Book }) => (
    <Pressable
      style={[styles.bookItem, { borderBottomColor: colors.border }]}
      onPress={() => handleSelectMyBook(item)}
    >
      {item.cover_url ? (
        <Image source={{ uri: item.cover_url }} style={styles.bookCover} />
      ) : (
        <View style={[styles.bookCoverPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
          <IconSymbol name="book.fill" size={20} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.bookInfo}>
        <ThemedText style={Typography.bodyBold} numberOfLines={1}>
          {item.title}
        </ThemedText>
        {item.author && (
          <ThemedText style={[styles.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.author}
          </ThemedText>
        )}
      </View>
      <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
    </Pressable>
  );

  const renderSearchResult = ({ item }: { item: BookSearchResult }) => (
    <Pressable
      style={[styles.bookItem, { borderBottomColor: colors.border }]}
      onPress={() => handleSelectSearchResult(item)}
    >
      {item.cover_url ? (
        <Image source={{ uri: item.cover_url }} style={styles.bookCover} />
      ) : (
        <View style={[styles.bookCoverPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
          <IconSymbol name="book.fill" size={20} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.bookInfo}>
        <ThemedText style={Typography.bodyBold} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.author}
        </ThemedText>
        {item.publisher && (
          <ThemedText style={[styles.bookPublisher, { color: colors.textTertiary }]} numberOfLines={1}>
            {item.publisher}
          </ThemedText>
        )}
      </View>
      <IconSymbol name="plus.circle.fill" size={24} color={Colors.brand.primary} />
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ThemedView style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
            <View style={styles.headerTop}>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <IconSymbol name="xmark" size={20} color={colors.text} />
              </Pressable>
              <ThemedText style={[styles.headerTitle, Typography.h2]}>
                어떤 책인가요?
              </ThemedText>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          {isSaving ? (
            <Loading message="책을 저장하는 중..." />
          ) : showSearch ? (
            /* 검색 모드 */
            <View style={styles.content}>
              <View style={styles.searchHeader}>
                <Pressable onPress={() => setShowSearch(false)} style={styles.backButton}>
                  <IconSymbol name="chevron.left" size={20} color={colors.text} />
                </Pressable>
                <View style={styles.searchInputWrapper}>
                  <IconSymbol name="magnifyingglass" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="책 제목 또는 저자 검색"
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    autoFocus
                  />
                </View>
                <Button title="검색" onPress={handleSearch} size="sm" />
              </View>

              {isSearching ? (
                <Loading message="검색 중..." />
              ) : (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResult}
                  keyExtractor={(item, index) => `${item.isbn}-${index}`}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    searchQuery ? (
                      <View style={styles.emptyState}>
                        <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                          검색 결과가 없습니다
                        </ThemedText>
                      </View>
                    ) : (
                      <View style={styles.emptyState}>
                        <IconSymbol name="magnifyingglass" size={32} color={colors.textTertiary} />
                        <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                          책 제목이나 저자를 검색해보세요
                        </ThemedText>
                      </View>
                    )
                  }
                />
              )}
            </View>
          ) : (
            /* 내 책 목록 모드 */
            <View style={styles.content}>
              {/* 책 검색 버튼 */}
              <Pressable
                style={[styles.searchButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setShowSearch(true)}
              >
                <IconSymbol name="magnifyingglass" size={18} color={colors.textTertiary} />
                <ThemedText style={[styles.searchButtonText, { color: colors.textSecondary }]}>
                  책 검색하기
                </ThemedText>
                <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
              </Pressable>

              {/* 내 책 목록 */}
              {books.length > 0 && (
                <View style={styles.myBooksSection}>
                  <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    내 서재
                  </ThemedText>
                  <FlatList
                    data={books}
                    renderItem={renderMyBook}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                  />
                </View>
              )}

              {books.length === 0 && (
                <View style={styles.emptyState}>
                  <IconSymbol name="books.vertical" size={48} color={colors.textTertiary} />
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                    저장된 책이 없습니다
                  </ThemedText>
                  <ThemedText style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                    위에서 책을 검색해 추가해보세요
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchButtonText: {
    flex: 1,
    ...Typography.body,
  },
  myBooksSection: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  bookCover: {
    width: 44,
    height: 64,
    borderRadius: BorderRadius.sm,
  },
  bookCoverPlaceholder: {
    width: 44,
    height: 64,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookAuthor: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  bookPublisher: {
    ...Typography.caption,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
  emptySubtext: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
