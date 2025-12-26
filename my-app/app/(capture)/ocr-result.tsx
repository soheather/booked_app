import {
  StyleSheet,
  View,
  SectionList,
  Pressable,
  TextInput,
  Alert,
  Image,
  Modal,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCaptureStore } from '@/stores/capture-store';
import { useQuotesStore } from '@/stores/quotes-store';
import { useBooksStore } from '@/stores/books-store';
import { useAuthStore } from '@/stores/auth-store';
import { processOCRText } from '@/lib/text/sentence-splitter';
import { performBatchStructuredOCR, performStructuredOCR } from '@/services/ocr/google-vision';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 선택 영역 인터페이스
interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  const { findOrCreateBook } = useBooksStore();
  const { user } = useAuthStore();

  const [sentences, setSentences] = useState<ExtractedSentence[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 이미지 선택 모달 상태
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isExtractingSelection, setIsExtractingSelection] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // 이미지 표시 영역 정보
  const [imageLayout, setImageLayout] = useState<{ width: number; height: number; x: number; y: number } | null>(null);

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

            // 밑줄 친 문장 Set (중복 체크용)
            const underlinedSet = new Set(result.underlinedSentences);

            // 문단을 문장으로 분리하여 추가
            result.paragraphs.forEach((paragraph, pIndex) => {
              const sentences = processOCRText(paragraph);
              sentences.forEach((content, sIndex) => {
                // 밑줄 친 문장인지 확인
                const isUnderlined = underlinedSet.has(content) ||
                  result.underlinedSentences.some(u => content.includes(u) || u.includes(content));

                allSentences.push({
                  id: `sentence-${img.id}-${pIndex}-${sIndex}`,
                  content,
                  imageId: img.id,
                  selected: true,
                  isUnderlined,
                });
              });
            });

            // 밑줄 문장이 paragraphs에 없는 경우 별도 추가
            result.underlinedSentences.forEach((underlined, uIndex) => {
              const alreadyExists = allSentences.some(s =>
                s.content === underlined || s.content.includes(underlined)
              );
              if (!alreadyExists && underlined.trim()) {
                allSentences.push({
                  id: `underlined-${img.id}-${uIndex}`,
                  content: underlined,
                  imageId: img.id,
                  selected: true,
                  isUnderlined: true,
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

  const handleSelectBook = () => {
    router.push('/book/search' as any);
  };

  // 이미지 클릭 - 선택 모달 열기
  const handleImagePress = useCallback((imageUri: string, imageId: string) => {
    setSelectedImageUri(imageUri);
    setSelectedImageId(imageId);
    setSelectionRect(null);
    setSelectionModalVisible(true);
  }, []);

  // 선택 모달 닫기
  const handleCloseSelectionModal = useCallback(() => {
    setSelectionModalVisible(false);
    setSelectedImageUri(null);
    setSelectedImageId(null);
    setSelectionRect(null);
    setIsSelecting(false);
  }, []);

  // 터치 시작
  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    if (!imageLayout) return;
    const { locationX, locationY } = event.nativeEvent;
    setStartPoint({ x: locationX, y: locationY });
    setSelectionRect({ x: locationX, y: locationY, width: 0, height: 0 });
    setIsSelecting(true);
  }, [imageLayout]);

  // 터치 이동
  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    if (!isSelecting || !startPoint) return;
    const { locationX, locationY } = event.nativeEvent;

    const x = Math.min(startPoint.x, locationX);
    const y = Math.min(startPoint.y, locationY);
    const width = Math.abs(locationX - startPoint.x);
    const height = Math.abs(locationY - startPoint.y);

    setSelectionRect({ x, y, width, height });
  }, [isSelecting, startPoint]);

  // 터치 종료
  const handleTouchEnd = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // 선택 영역 OCR 추출
  const handleExtractSelection = useCallback(async () => {
    if (!selectionRect || !selectedImageUri || !selectedImageId || !imageLayout) {
      Alert.alert('알림', '추출할 영역을 선택해주세요.');
      return;
    }

    if (selectionRect.width < 20 || selectionRect.height < 20) {
      Alert.alert('알림', '선택 영역이 너무 작습니다. 더 넓게 선택해주세요.');
      return;
    }

    setIsExtractingSelection(true);

    try {
      // 이미지 크기 비율 계산 (실제 이미지 vs 화면에 표시된 크기)
      const imageInfo = await ImageManipulator.manipulateAsync(selectedImageUri, []);
      const scaleX = imageInfo.width / imageLayout.width;
      const scaleY = imageInfo.height / imageLayout.height;

      // 선택 영역을 실제 이미지 좌표로 변환
      const cropRegion = {
        originX: Math.round(selectionRect.x * scaleX),
        originY: Math.round(selectionRect.y * scaleY),
        width: Math.round(selectionRect.width * scaleX),
        height: Math.round(selectionRect.height * scaleY),
      };

      // 이미지 크롭
      const croppedImage = await ImageManipulator.manipulateAsync(
        selectedImageUri,
        [{ crop: cropRegion }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 크롭된 이미지로 OCR 수행
      const ocrResult = await performStructuredOCR(croppedImage.uri, GOOGLE_VISION_API_KEY, true);

      if (ocrResult.paragraphs.length === 0) {
        Alert.alert('알림', '선택한 영역에서 텍스트를 찾을 수 없습니다.');
        return;
      }

      // 추출된 문장들을 목록에 추가
      const newSentences: ExtractedSentence[] = [];
      ocrResult.paragraphs.forEach((paragraph, pIndex) => {
        const processed = processOCRText(paragraph);
        processed.forEach((content, sIndex) => {
          newSentences.push({
            id: `manual-${Date.now()}-${pIndex}-${sIndex}`,
            content,
            imageId: selectedImageId,
            selected: true,
            isUnderlined: ocrResult.underlinedSentences.some(u => content.includes(u) || u.includes(content)),
          });
        });
      });

      setSentences(prev => [...newSentences, ...prev]);
      handleCloseSelectionModal();
      Alert.alert('완료', `${newSentences.length}개의 문장이 추가되었습니다.`);
    } catch (error) {
      console.error('선택 영역 OCR 실패:', error);
      Alert.alert('오류', '텍스트 추출에 실패했습니다.');
    } finally {
      setIsExtractingSelection(false);
    }
  }, [selectionRect, selectedImageUri, selectedImageId, imageLayout, handleCloseSelectionModal]);

  const handleSave = async () => {
    const selectedSentences = sentences.filter(s => s.selected && s.content.trim());

    if (selectedSentences.length === 0) {
      Alert.alert('알림', '저장할 문장을 선택해주세요.');
      return;
    }

    if (!user?.id) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    setProcessing(true);

    try {
      // 책이 선택된 경우 책 저장/조회
      let bookId: string | undefined = selectedBook?.id;
      if (selectedBook && !bookId) {
        const book = await findOrCreateBook(user.id, {
          isbn: selectedBook.isbn,
          title: selectedBook.title,
          author: selectedBook.author,
          publisher: selectedBook.publisher,
          cover_url: selectedBook.cover_url,
        });
        bookId = book.id;
      }

      // 문장들을 Supabase에 저장
      const quotesData = selectedSentences.map(s => ({
        book_id: bookId,
        content: s.content,
        is_favorite: false,
        image_url: images.find(img => img.id === s.imageId)?.uri,
      }));

      await saveQuotes(user.id, quotesData);

      // 캡처 상태 초기화
      resetCapture();

      Alert.alert(
        '저장 완료',
        `${selectedSentences.length}개의 문장이 저장되었습니다.`,
        [
          {
            text: '확인',
            onPress: () => router.replace('/(tabs)'),
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
    <Pressable
      style={styles.sectionHeader}
      onPress={() => handleImagePress(section.imageUri, section.imageId)}
    >
      <Image
        source={{ uri: section.imageUri }}
        style={styles.sectionImage}
        resizeMode="cover"
      />
      <View style={styles.sectionImageOverlay}>
        <View style={styles.sectionImageBadge}>
          <IconSymbol name="doc.text.image" size={14} color="#fff" />
          <ThemedText style={styles.sectionImageBadgeText}>
            {section.data.length}개 문장
          </ThemedText>
        </View>
        <View style={styles.sectionSelectHint}>
          <IconSymbol name="hand.draw" size={12} color="#fff" />
          <ThemedText style={styles.sectionSelectHintText}>
            탭하여 영역 선택
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );

  const renderSentence = ({ item }: { item: ExtractedSentence }) => {
    const isEditing = editingId === item.id;

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
              <ThemedText style={[styles.sentenceText, Typography.quote]}>
                "{item.content}"
              </ThemedText>
            )}
          </View>

          <Pressable
            onPress={() => setEditingId(isEditing ? null : item.id)}
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
        <Loading message="저장 중..." fullScreen />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, Typography.h2]}>
            추출된 문장
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            저장할 문장을 선택하고 필요하면 수정하세요
          </ThemedText>
        </View>

        {/* 책 선택 */}
        <Pressable
          onPress={handleSelectBook}
          style={[styles.bookSelect, { backgroundColor: colors.backgroundSecondary }]}
        >
          <View style={styles.bookSelectContent}>
            <IconSymbol name="book.closed.fill" size={20} color={Colors.brand.primary} />
            <ThemedText style={[styles.bookSelectText, { color: selectedBook ? colors.text : colors.textSecondary }]}>
              {selectedBook ? selectedBook.title : '책을 선택해주세요'}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
        </Pressable>

        {groupedSentences.length > 0 ? (
          <SectionList
            sections={groupedSentences}
            renderItem={renderSentence}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
  },
  bookSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bookSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  bookSelectText: {
    ...Typography.body,
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
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
    lineHeight: 28,
  },
  textInput: {
    ...Typography.quote,
    lineHeight: 28,
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
    height: 160,
    position: 'relative',
  },
  sectionImage: {
    width: '100%',
    height: '100%',
  },
  sectionImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sectionImageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionImageBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
