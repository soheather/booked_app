import {
  StyleSheet,
  View,
  SectionList,
  Pressable,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookSelectModal } from '@/components/book-select-modal';
import { useCaptureStore } from '@/stores/capture-store';
import { useQuotesStore } from '@/stores/quotes-store';
import { useAuthStore } from '@/stores/auth-store';
import { Book } from '@/types';
import { processOCRText } from '@/lib/text/sentence-splitter';
import { performBatchStructuredOCR } from '@/services/ocr/google-vision';
import { uploadImage } from '@/services/supabase/database';

const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '';

// 디버그: API 키 로드 확인
console.log('=== OCR DEBUG ===');
console.log('API Key loaded:', GOOGLE_VISION_API_KEY ? `${GOOGLE_VISION_API_KEY.substring(0, 10)}...` : 'NOT SET');

interface ExtractedSentence {
  id: string;
  content: string;
  imageId: string;
  selected: boolean;
  isUnderlined?: boolean; // 밑줄 친 문장 여부
}

export default function OCRResultScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { images, selectedBook, isProcessing, setProcessing, reset: resetCapture } = useCaptureStore();
  const { saveQuotes } = useQuotesStore();
  const { user } = useAuthStore();

  const [sentences, setSentences] = useState<ExtractedSentence[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sectionListRef = useRef<SectionList>(null);

  // 책 선택 모달 상태
  const [bookSelectModalVisible, setBookSelectModalVisible] = useState(false);

  // 초기 로드 시 OCR 처리
  useEffect(() => {
    const extractText = async () => {
      if (images.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        let allSentences: ExtractedSentence[] = [];

        console.log('=== OCR 시작 ===');
        console.log('이미지 수:', images.length);
        console.log('API 키 존재:', !!GOOGLE_VISION_API_KEY);

        if (GOOGLE_VISION_API_KEY) {
          // Gemini API로 구조화된 OCR 수행
          console.log('Gemini API 구조화된 OCR 호출 중...');
          const ocrResults = await performBatchStructuredOCR(
            images.map(img => img.uri),
            GOOGLE_VISION_API_KEY,
            true // 밑줄 감지 ON
          );
          console.log('OCR 결과:', ocrResults.size, '개');

          // 각 이미지별 OCR 결과 처리
          images.forEach((img) => {
            const result = ocrResults.get(img.uri);
            if (!result) return;

            // 감지된 책 제목 로깅
            if (result.bookTitle) {
              console.log('감지된 책 제목:', result.bookTitle);
            }
            if (result.pageNumber) {
              console.log('감지된 페이지:', result.pageNumber);
            }

            // 1. 밑줄 친 문장을 먼저 추가 (우선 보여주기)
            const addedUnderlinedIds = new Set<string>();
            result.underlinedSentences.forEach((underlined, uIndex) => {
              if (underlined.trim()) {
                const id = `underlined-${img.id}-${uIndex}`;
                allSentences.push({
                  id,
                  content: underlined,
                  imageId: img.id,
                  selected: true,
                  isUnderlined: true,
                });
                addedUnderlinedIds.add(underlined);
              }
            });

            // 2. 일반 문단 추가 (밑줄 친 문장은 제외)
            result.paragraphs.forEach((content, pIndex) => {
              // 이미 밑줄 문장으로 추가된 경우 건너뛰기
              if (addedUnderlinedIds.has(content)) {
                return;
              }

              // 밑줄 친 부분이 포함된 문단인 경우 분리
              let hasUnderlined = false;
              let remainingContent = content;

              for (const underlined of result.underlinedSentences) {
                if (content.includes(underlined)) {
                  hasUnderlined = true;
                  // 밑줄 친 부분을 제거
                  remainingContent = remainingContent.replace(underlined, '').trim();
                }
              }

              // 밑줄 제거 후 남은 내용이 있으면 추가
              if (remainingContent && remainingContent.length >= 10) {
                allSentences.push({
                  id: `sentence-${img.id}-${pIndex}`,
                  content: remainingContent,
                  imageId: img.id,
                  selected: true,
                  isUnderlined: false,
                });
              } else if (!hasUnderlined) {
                // 밑줄이 없는 일반 문단
                allSentences.push({
                  id: `sentence-${img.id}-${pIndex}`,
                  content,
                  imageId: img.id,
                  selected: true,
                  isUnderlined: false,
                });
              }
            });
          });

          // 밑줄 문장을 상단으로 정렬
          allSentences.sort((a, b) => {
            if (a.isUnderlined && !b.isUnderlined) return -1;
            if (!a.isUnderlined && b.isUnderlined) return 1;
            return 0;
          });
        } else {
          // API 키 없는 경우 더미 데이터 사용
          console.log('Google Vision API 키가 설정되지 않았습니다. 더미 데이터를 사용합니다.');
          await new Promise(resolve => setTimeout(resolve, 1000));

          const dummyText = `우리가 두려워해야 할 것은 두려움 그 자체뿐이다. 용기란 두려움이 없는 것이 아니라, 두려움을 극복하는 것이다. 인생에서 가장 큰 위험은 어떤 위험도 감수하지 않는 것이다.`;

          const sentences = processOCRText(dummyText);
          allSentences = sentences.map((content, index) => ({
            id: `sentence-${Date.now()}-${index}`,
            content,
            imageId: images[0]?.id || '',
            selected: true,
          }));
        }

        setSentences(allSentences);
      } catch (error) {
        console.error('OCR 처리 실패:', error);
        Alert.alert('오류', '텍스트 추출 중 문제가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    extractText();
  }, [images]);

  const handleToggleSentence = (id: string) => {
    setSentences(prev =>
      prev.map(s => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleEditSentence = (id: string, content: string) => {
    setSentences(prev =>
      prev.map(s => (s.id === id ? { ...s, content } : s))
    );
  };

  // 편집 시작 및 스크롤
  const handleStartEdit = useCallback((id: string, sectionIndex: number, itemIndex: number) => {
    setEditingId(id);
    // 키보드가 올라오는 시간을 고려하여 딜레이 후 스크롤
    setTimeout(() => {
      sectionListRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex,
        viewOffset: 200, // 푸터 높이를 고려한 오프셋
        animated: true,
      });
    }, 350);
  }, []);

  // 저장하기 버튼 클릭
  const handleSave = () => {
    const selectedSentences = sentences.filter(s => s.selected && s.content.trim());

    if (selectedSentences.length === 0) {
      Alert.alert('알림', '저장할 문장을 선택해주세요.');
      return;
    }

    if (!user?.id) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    // 이미 선택된 책이 있으면 바로 저장 (책 상세에서 진입한 경우)
    if (selectedBook) {
      handleBookSelect(selectedBook);
      return;
    }

    // 책 선택 모달 열기
    setBookSelectModalVisible(true);
  };

  // 책 선택 후 저장 처리
  const handleBookSelect = async (book: Book) => {
    setBookSelectModalVisible(false);

    const selectedSentences = sentences.filter(s => s.selected && s.content.trim());

    if (selectedSentences.length === 0 || !user?.id) {
      return;
    }

    setProcessing(true);

    try {
      console.log('선택된 책:', book);
      console.log('책 ID:', book.id);

      const bookId = book.id;

      // 이미지별로 업로드하고 URL 매핑 생성
      const imageUrlMap = new Map<string, string>();

      for (const img of images) {
        try {
          const fileName = `${Date.now()}-${img.id}.jpg`;
          const uploadedUrl = await uploadImage(user.id, img.uri, fileName);
          imageUrlMap.set(img.id, uploadedUrl);
          console.log('이미지 업로드 완료:', img.id, uploadedUrl);
        } catch (uploadError) {
          console.error('이미지 업로드 실패:', img.id, uploadError);
          // 이미지 업로드 실패해도 문장은 저장 진행
        }
      }

      // 문장들을 Supabase에 저장 (이미지 URL 포함)
      const quotesData = selectedSentences.map(s => {
        const imageUrl = imageUrlMap.get(s.imageId);
        return {
          book_id: bookId,
          content: s.content,
          is_favorite: false,
          ...(imageUrl && { image_url: imageUrl }),
        };
      });

      await saveQuotes(user.id, quotesData);

      // 캡처 상태 초기화
      resetCapture();

      Alert.alert(
        '저장 완료',
        `${selectedSentences.length}개의 문장이 저장되었습니다.`,
        [
          {
            text: '확인',
            onPress: () => {
              router.replace(`/book/${bookId}` as any);
            },
          },
        ]
      );
    } catch (error) {
      console.error('저장 실패:', error);
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const selectedCount = sentences.filter(s => s.selected).length;

  // 이미지별로 문장 그룹화
  const groupedSentences = useMemo(() => {
    const groups: { imageId: string; imageUri: string; data: ExtractedSentence[] }[] = [];

    images.forEach((img) => {
      const imageSentences = sentences.filter(s => s.imageId === img.id);
      // 밑줄 문장을 상단으로 정렬
      imageSentences.sort((a, b) => {
        if (a.isUnderlined && !b.isUnderlined) return -1;
        if (!a.isUnderlined && b.isUnderlined) return 1;
        return 0;
      });

      if (imageSentences.length > 0) {
        groups.push({
          imageId: img.id,
          imageUri: img.uri,
          data: imageSentences,
        });
      }
    });

    return groups;
  }, [sentences, images]);

  const renderSectionHeader = ({ section }: { section: { imageId: string; imageUri: string; data: ExtractedSentence[] } }) => (
    <View style={styles.sectionHeader}>
      <Image
        source={{ uri: section.imageUri }}
        style={styles.sectionImage}
        resizeMode="contain"
      />
      <View style={styles.sectionImageBadge}>
        <IconSymbol name="doc.text.image" size={14} color="#fff" />
        <ThemedText style={styles.sectionImageBadgeText}>
          {section.data.length}개 문장
        </ThemedText>
      </View>
    </View>
  );

  const renderSentence = ({ item, index, section }: { item: ExtractedSentence; index: number; section: { imageId: string; imageUri: string; data: ExtractedSentence[] } }) => {
    const isEditing = editingId === item.id;
    const sectionIndex = groupedSentences.findIndex(s => s.imageId === section.imageId);

    const handleEditPress = () => {
      if (isEditing) {
        setEditingId(null);
      } else {
        handleStartEdit(item.id, sectionIndex, index);
      }
    };

    return (
      <Card
        style={{
          ...styles.sentenceCard,
          ...(item.selected ? { borderColor: Colors.brand.primary, borderWidth: 2 } : {}),
          ...(item.isUnderlined ? { backgroundColor: 'rgba(255, 230, 109, 0.15)' } : {}),
        }}
        noPadding
      >
        {/* 밑줄 문장 표시 배지 */}
        {item.isUnderlined && (
          <View style={[styles.underlineBadge, { backgroundColor: Colors.brand.secondary }]}>
            <IconSymbol name="highlighter" size={12} color="#fff" />
            <ThemedText style={styles.underlineBadgeText}>밑줄</ThemedText>
          </View>
        )}
        <Pressable
          onPress={() => handleToggleSentence(item.id)}
          style={styles.sentenceContent}
        >
          <View style={styles.checkboxContainer}>
            <View
              style={[
                styles.checkbox,
                { borderColor: item.selected ? Colors.brand.primary : colors.border },
                item.selected && { backgroundColor: Colors.brand.primary },
              ]}
            >
              {item.selected && (
                <IconSymbol name="checkmark" size={14} color="#fff" />
              )}
            </View>
          </View>

          <View style={styles.textContainer}>
            {isEditing ? (
              <TextInput
                value={item.content}
                onChangeText={(text) => handleEditSentence(item.id, text)}
                onBlur={() => setEditingId(null)}
                style={[styles.textInput, { color: colors.text }]}
                multiline
                autoFocus
              />
            ) : (
              <ThemedText style={styles.sentenceText}>
                "{item.content}"
              </ThemedText>
            )}
          </View>

          <Pressable
            onPress={handleEditPress}
            style={styles.editButton}
          >
            <IconSymbol
              name={isEditing ? 'checkmark.circle.fill' : 'pencil'}
              size={20}
              color={isEditing ? Colors.brand.primary : colors.textTertiary}
            />
          </Pressable>
        </Pressable>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Loading message="텍스트 추출 중..." fullScreen />
      </ThemedView>
    );
  }

  if (isProcessing) {
    return (
      <ThemedView style={styles.container}>
        <Loading message="이미지 업로드 및 저장 중..." fullScreen />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          {groupedSentences.length > 0 ? (
            <SectionList
              ref={sectionListRef}
              sections={groupedSentences}
              renderItem={renderSentence}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="doc.text" size={48} color={colors.textTertiary} />
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                추출된 문장이 없습니다
              </ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.footerInfo}>
            <ThemedText style={[styles.selectedCount, { color: colors.textSecondary }]}>
              {selectedCount}개 문장 선택됨
            </ThemedText>
          </View>
          <Button
            title="저장하기"
            onPress={handleSave}
            disabled={selectedCount === 0}
            fullWidth
          />
        </View>

        {/* 책 선택 모달 */}
        <BookSelectModal
          visible={bookSelectModalVisible}
          onClose={() => setBookSelectModalVisible(false)}
          onSelect={handleBookSelect}
        />
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 200,
  },
  sentenceCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  sentenceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  checkboxContainer: {
    paddingTop: 4,
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  sentenceText: {
    fontSize: 14,
    lineHeight: 22,
  },
  textInput: {
    fontSize: 14,
    lineHeight: 22,
    padding: 0,
  },
  editButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerInfo: {
    marginBottom: Spacing.md,
  },
  selectedCount: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  underlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.md,
    marginTop: Spacing.sm,
    gap: 4,
  },
  underlineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sectionImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  sectionImageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sectionImageBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
