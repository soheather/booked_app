import { View, StyleSheet, ScrollView, Image, TextInput, Alert, Modal, Pressable, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState, useRef } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useQuotesStore } from '@/stores/quotes-store';
import { useBooksStore } from '@/stores/books-store';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const quotes = useQuotesStore((state) => state.quotes);
  const { syncUpdateQuote, deleteQuote } = useQuotesStore();
  const books = useBooksStore((state) => state.books);

  const quote = quotes.find((q) => q.id === id);
  const book = quote?.book_id ? books.find((b) => b.id === quote.book_id) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(quote?.content || '');
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!quote) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>문장을 찾을 수 없습니다.</ThemedText>
      </ThemedView>
    );
  }

  const handleEdit = () => {
    if (isEditing) {
      // 저장
      if (editedContent.trim() && editedContent !== quote.content) {
        Alert.alert(
          '변경 사항 저장',
          '수정한 내용을 저장하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '저장',
              onPress: async () => {
                try {
                  await syncUpdateQuote(quote.id, { content: editedContent.trim() });
                  setIsEditing(false);
                  Alert.alert('완료', '문장이 수정되었습니다.');
                } catch (error) {
                  Alert.alert('오류', '문장 수정에 실패했습니다.');
                }
              },
            },
          ]
        );
      } else {
        setIsEditing(false);
      }
    } else {
      // 편집 모드 진입
      setEditedContent(quote.content);
      setIsEditing(true);
      // 이미지가 있으면 이미지 높이만큼 스크롤하여 텍스트 박스가 상단에 보이도록
      if (quote.image_url) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 420, animated: true });
        }, 100);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(quote.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      '문장 삭제',
      '이 문장을 정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            // 먼저 뒤로 가고, 삭제는 백그라운드에서 처리
            router.back();
            deleteQuote(quote.id).catch(() => {
              Alert.alert('오류', '문장 삭제에 실패했습니다.');
            });
          },
        },
      ]
    );
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
      <Stack.Screen
        options={{
          title: '문장 상세',
          headerRight: () => (
            <Pressable
              onPress={isEditing ? handleCancelEdit : handleEdit}
              style={styles.headerButton}
            >
              <ThemedText style={{ color: Colors.brand.primary, fontSize: 16 }}>
                {isEditing ? '취소' : '편집'}
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 1. Original Image */}
        {quote.image_url && (
          <Pressable onPress={() => setIsImageModalVisible(true)}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: quote.image_url }}
                style={styles.originalImage}
                resizeMode="cover"
              />
            </View>
          </Pressable>
        )}

        {/* 2. Date */}
        <View style={styles.dateSection}>
          <ThemedText style={[Typography.caption, { color: colors.textTertiary }]}>
            {formatDate(quote.created_at)}
          </ThemedText>
        </View>

        {/* 3. Quote Content */}
        <Card style={styles.quoteCard} noPadding>
          <View style={styles.quoteSection}>
            {isEditing ? (
              <TextInput
                style={[
                  Typography.quote,
                  styles.quoteText,
                  styles.quoteInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={editedContent}
                onChangeText={setEditedContent}
                multiline
                autoFocus
                placeholder="문장을 입력하세요"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <ThemedText style={[Typography.quote, styles.quoteText]}>
                "{quote.content}"
              </ThemedText>
            )}

            {quote.page_number && (
              <ThemedText style={[styles.pageNumber, { color: colors.textTertiary }]}>
                p.{quote.page_number}
              </ThemedText>
            )}
          </View>

          {/* 3. Book Info */}
          {book && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.bookSection}>
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
              </View>
            </>
          )}
        </Card>

        {/* 4. Delete Button */}
        <Pressable onPress={handleDelete} style={styles.deleteSection}>
          <ThemedText style={[styles.deleteText, { color: colors.textTertiary }]}>
            문장 삭제
          </ThemedText>
        </Pressable>
      </ScrollView>

      {/* Footer - 편집 모드에서만 저장 버튼 표시 */}
      {isEditing && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            title="저장"
            onPress={handleEdit}
            fullWidth
          />
        </View>
      )}
      </KeyboardAvoidingView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={isImageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsImageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsImageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {quote.image_url && (
              <Image
                source={{ uri: quote.image_url }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
          <Pressable
            style={styles.closeButton}
            onPress={() => setIsImageModalVisible(false)}
          >
            <IconSymbol name="xmark.circle.fill" size={32} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  imageContainer: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  originalImage: {
    width: '100%',
    height: 400,
  },
  quoteCard: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  quoteSection: {
    padding: Spacing.lg,
  },
  quoteText: {},
  quoteInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pageNumber: {
    ...Typography.caption,
    marginTop: Spacing.md,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  bookSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
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
  dateSection: {
    marginBottom: Spacing.sm,
  },
  deleteSection: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  deleteText: {
    ...Typography.body,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  headerButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
