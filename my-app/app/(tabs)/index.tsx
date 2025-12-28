import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Pressable, Image, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

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
  const { quotes, isLoading: quotesLoading, fetchQuotes } = useQuotesStore();
  const { books, fetchBooks } = useBooksStore();

  const [viewMode, setViewMode] = useState<'text' | 'image'>('text');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Picker 임시 값 (확인 전까지 실제 필터에 반영 안됨)
  const [tempYear, setTempYear] = useState<number | null>(null);
  const [tempMonth, setTempMonth] = useState<number | null>(null);

  // Bottom Sheet 애니메이션
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (isFilterModalVisible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(300);
    }
  }, [isFilterModalVisible]);

  const isLoading = authLoading || quotesLoading;

  // 사용 가능한 년/월 목록 계산
  const availableYearMonths = useMemo(() => {
    const yearMonthSet = new Set<string>();
    quotes.forEach((quote) => {
      if (quote.created_at) {
        const date = new Date(quote.created_at);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        yearMonthSet.add(`${year}-${month}`);
      }
    });

    const years = new Set<number>();
    const monthsByYear: Record<number, number[]> = {};

    yearMonthSet.forEach((ym) => {
      const [year, month] = ym.split('-').map(Number);
      years.add(year);
      if (!monthsByYear[year]) {
        monthsByYear[year] = [];
      }
      monthsByYear[year].push(month);
    });

    // 정렬
    Object.keys(monthsByYear).forEach((year) => {
      monthsByYear[Number(year)].sort((a, b) => b - a);
    });

    return {
      years: Array.from(years).sort((a, b) => b - a),
      monthsByYear,
    };
  }, [quotes]);

  // 필터된 quotes
  const filteredQuotes = useMemo(() => {
    if (!selectedYear) return quotes;

    return quotes.filter((quote) => {
      if (!quote.created_at) return false;
      const date = new Date(quote.created_at);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (selectedMonth) {
        return year === selectedYear && month === selectedMonth;
      }
      return year === selectedYear;
    });
  }, [quotes, selectedYear, selectedMonth]);

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

  const getBookInfo = (bookId?: string) => {
    if (!bookId) return null;
    return books.find((b) => b.id === bookId);
  };

  const renderQuote = ({ item }: { item: Note }) => {
    const book = getBookInfo(item.book_id);

    if (viewMode === 'image') {
      if (!item.image_url) return null;

      return (
        <Card onPress={() => handleQuotePress(item.id)} style={[styles.imageCard, { borderWidth: 1, borderColor: colors.border }]} noPadding>
          <Image
            source={{ uri: item.image_url }}
            style={styles.quoteImage}
            resizeMode="cover"
          />
          {book && (
            <View style={styles.imageBookInfo}>
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
        </Card>
      );
    }

    return (
      <Card onPress={() => handleQuotePress(item.id)} style={[styles.quoteCard, { borderWidth: 1, borderColor: colors.border }]}>
        <View style={styles.quoteHeader}>
          <ThemedText style={[styles.quoteContent, Typography.quote]}>
            "{item.content}"
          </ThemedText>
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
        <View style={styles.headerLeft}>
          <ThemedText style={[styles.headerTitle, Typography.h1]}>
            내 문장
          </ThemedText>
          {quotes.length > 0 && (
            <ThemedText style={[styles.headerCount, { color: colors.textSecondary }]}>
              {quotes.length}개
            </ThemedText>
          )}
        </View>
        {quotes.length > 0 && (
          <Pressable
            onPress={() => setViewMode(viewMode === 'text' ? 'image' : 'text')}
            style={[styles.viewModeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <IconSymbol
              name={viewMode === 'text' ? 'photo' : 'text.alignleft'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {/* 년/월 필터 버튼 */}
      {quotes.length > 0 && availableYearMonths.years.length > 0 && (
        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => {
              setTempYear(selectedYear);
              setTempMonth(selectedMonth);
              setIsFilterModalVisible(true);
            }}
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <ThemedText style={styles.filterButtonText}>
              {selectedYear
                ? selectedMonth
                  ? `${selectedYear}년 ${selectedMonth}월`
                  : `${selectedYear}년`
                : '전체'}
            </ThemedText>
            <IconSymbol name="chevron.down" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      <FlatList
        data={filteredQuotes}
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

      {/* Bottom Sheet 필터 모달 */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsFilterModalVisible(false)}
          >
            <Animated.View
              style={[
                styles.bottomSheetBackdrop,
                { opacity: backdropOpacity },
              ]}
            />
          </Pressable>
          <Animated.View
            style={[
              styles.bottomSheetContent,
              { backgroundColor: colors.card, transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            {/* 헤더 */}
            <View style={styles.bottomSheetHeader}>
              <Pressable
                onPress={() => setIsFilterModalVisible(false)}
                style={styles.bottomSheetHeaderButton}
              >
                <ThemedText style={{ color: colors.textSecondary }}>취소</ThemedText>
              </Pressable>
              <ThemedText style={Typography.bodyBold}>기간 선택</ThemedText>
              <Pressable
                onPress={() => {
                  setSelectedYear(tempYear);
                  setSelectedMonth(tempMonth);
                  setIsFilterModalVisible(false);
                }}
                style={styles.bottomSheetHeaderButton}
              >
                <ThemedText style={{ color: Colors.brand.primary, fontWeight: '600' }}>확인</ThemedText>
              </Pressable>
            </View>

            {/* Wheel Picker */}
            <View style={styles.pickerContainer}>
              {/* 년도 Picker */}
              <Picker
                selectedValue={tempYear}
                onValueChange={(value) => {
                  setTempYear(value);
                  if (value === null) {
                    setTempMonth(null);
                  }
                }}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="전체" value={null} />
                {availableYearMonths.years.map((year) => (
                  <Picker.Item key={year} label={`${year}년`} value={year} />
                ))}
              </Picker>

              {/* 월 Picker */}
              <Picker
                selectedValue={tempMonth}
                onValueChange={(value) => setTempMonth(value)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="전체" value={null} />
                <Picker.Item label="1월" value={1} />
                <Picker.Item label="2월" value={2} />
                <Picker.Item label="3월" value={3} />
                <Picker.Item label="4월" value={4} />
                <Picker.Item label="5월" value={5} />
                <Picker.Item label="6월" value={6} />
                <Picker.Item label="7월" value={7} />
                <Picker.Item label="8월" value={8} />
                <Picker.Item label="9월" value={9} />
                <Picker.Item label="10월" value={10} />
                <Picker.Item label="11월" value={11} />
                <Picker.Item label="12월" value={12} />
              </Picker>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerCount: {
    ...Typography.body,
  },
  viewModeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterButtonText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomSheetContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  bottomSheetHeaderButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minWidth: 50,
  },
  pickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
  },
  picker: {
    flex: 1,
    height: 200,
  },
  pickerItem: {
    fontSize: 18,
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
    marginBottom: Spacing.md,
  },
  quoteContent: {},
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
  imageCard: {
    marginBottom: Spacing.md,
  },
  quoteImage: {
    width: '100%',
    height: 400,
    marginBottom: -1,
  },
  imageBookInfo: {
    padding: Spacing.md,
    borderTopWidth: 0,
  },
});
