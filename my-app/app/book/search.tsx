import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Image, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Card } from '@/components/ui/card';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBooksStore } from '@/stores/books-store';
import { useCaptureStore } from '@/stores/capture-store';
import { useAuthStore } from '@/stores/auth-store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Book, BookSearchResult } from '@/types';
import { searchBooks } from '@/services/books/naver-api';

// 환경 변수에서 API 키 가져오기 (실제 사용 시)
const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET || '';

export default function BookSearchScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { books, findOrCreateBook } = useBooksStore();
  const setSelectedBook = useCaptureStore((state) => state.setSelectedBook);
  const user = useAuthStore((state) => state.user);
  const [isSaving, setIsSaving] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Naver Books API 사용 (API 키가 있는 경우)
      if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
        const searchResults = await searchBooks(query, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, {
          display: 10,
        });
        setResults(searchResults);
      } else {
        // API 키 없는 경우 더미 데이터
        await new Promise((resolve) => setTimeout(resolve, 500));
        setResults([
          {
            isbn: `isbn-${Date.now()}`,
            title: query,
            author: '저자 미상',
            publisher: '출판사 미상',
            cover_url: '',
          },
        ]);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('검색 오류', '책 검색 중 문제가 발생했습니다.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleSelectBook = async (result: BookSearchResult) => {
    if (!user?.id) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    setIsSaving(true);

    try {
      // Supabase에 책 저장 (이미 있으면 기존 책 반환)
      const book = await findOrCreateBook(user.id, {
        isbn: result.isbn,
        title: result.title,
        author: result.author,
        publisher: result.publisher,
        cover_url: result.cover_url || undefined,
      });

      console.log('✅ 책 저장/조회 완료:', book.title, book.id);

      if (from === 'library') {
        // 내 서재에서 진입: 책만 저장하고 내 서재로 돌아감
        Alert.alert('완료', `"${book.title}"이(가) 내 서재에 추가되었습니다.`, [
          { text: '확인', onPress: () => router.back() }
        ]);
      } else {
        // OCR 결과에서 진입: 책 선택 후 OCR 결과 화면으로 이동
        setSelectedBook(book);
        router.back();
      }
    } catch (error) {
      console.error('책 저장 실패:', error);
      Alert.alert('오류', '책을 저장하는 중 문제가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSearchResult = ({ item }: { item: BookSearchResult }) => (
    <Pressable
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      onPress={() => handleSelectBook(item)}
    >
      {item.cover_url ? (
        <Image source={{ uri: item.cover_url }} style={styles.resultCover} />
      ) : (
        <View style={[styles.resultCoverPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
          <IconSymbol name="book.fill" size={24} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.resultInfo}>
        <ThemedText style={Typography.bodyBold} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.resultAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.author}
        </ThemedText>
        {item.publisher && (
          <ThemedText style={[styles.resultPublisher, { color: colors.textTertiary }]} numberOfLines={1}>
            {item.publisher}
          </ThemedText>
        )}
      </View>
      <IconSymbol name="chevron.right" size={20} color={colors.textTertiary} />
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.inputWrapper}>
          <Input
            placeholder="책 제목 또는 저자로 검색"
            value={query}
            onChangeText={setQuery}
            leftIcon="magnifyingglass"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
        </View>
        <Button title="검색" onPress={handleSearch} size="sm" style={styles.searchButton} />
      </View>

      {/* Results */}
      {isSearching || isSaving ? (
        <Loading message={isSaving ? "책을 저장하는 중..." : "검색 중..."} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderSearchResult}
          keyExtractor={(item, index) => `${item.isbn}-${index}`}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            query ? (
              <Card style={styles.emptyCard}>
                <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  검색 결과가 없습니다.
                </ThemedText>
              </Card>
            ) : (
              <Card style={styles.emptyCard}>
                <IconSymbol name="magnifyingglass" size={32} color={colors.textTertiary} />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  책 제목이나 저자를 검색해보세요
                </ThemedText>
              </Card>
            )
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  inputWrapper: {
    flex: 1,
  },
  searchButton: {
    marginTop: 0,
  },
  resultsList: {
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  resultCover: {
    width: 50,
    height: 75,
    borderRadius: BorderRadius.sm,
  },
  resultCoverPlaceholder: {
    width: 50,
    height: 75,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultAuthor: {
    ...Typography.bodySmall,
    marginTop: Spacing.xxs,
  },
  resultPublisher: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
