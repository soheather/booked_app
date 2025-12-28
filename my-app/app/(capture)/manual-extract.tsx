import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Pressable,
  Alert,
  Dimensions,
  ScrollView,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookSelectModal } from '@/components/book-select-modal';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCaptureStore } from '@/stores/capture-store';
import { useQuotesStore } from '@/stores/quotes-store';
import { useAuthStore } from '@/stores/auth-store';
import { Book } from '@/types';
import {
  performOCRWithBoundingBox,
  OCRTextLine,
} from '@/services/ocr/google-vision';
import { uploadImage } from '@/services/supabase/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SelectableTextLine extends OCRTextLine {
  selected: boolean;
  scaledBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function ManualExtractScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { images, selectedBook, isProcessing, setProcessing, reset: resetCapture } = useCaptureStore();
  const { saveQuotes } = useQuotesStore();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [textLines, setTextLines] = useState<SelectableTextLine[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [bookSelectModalVisible, setBookSelectModalVisible] = useState(false);

  // 드래그 선택 영역
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const imageContainerRef = useRef<View>(null);
  const imageOffsetRef = useRef({ x: 0, y: 0 });

  // 현재 이미지 (첫 번째 이미지만 처리)
  const currentImage = images[0];

  // 이미지 로드 및 OCR 실행
  useEffect(() => {
    if (!currentImage) {
      setIsLoading(false);
      return;
    }

    const loadImageAndOCR = async () => {
      setIsLoading(true);

      try {
        // 이미지 크기 가져오기
        Image.getSize(
          currentImage.uri,
          async (width, height) => {
            try {
              console.log('이미지 크기:', width, height);
              setImageSize({ width, height });

              // 화면에 맞게 스케일 계산
              const containerWidth = SCREEN_WIDTH - Spacing.lg * 2;
              const scale = containerWidth / width;
              const scaledHeight = height * scale;
              setDisplaySize({ width: containerWidth, height: scaledHeight });

              console.log('OCR 시작 (ML Kit 온디바이스)...');
              // OCR 실행 (ML Kit 온디바이스 - Development Build 필요)
              const ocrResult = await performOCRWithBoundingBox(currentImage.uri);
              console.log('OCR 결과 블록 수:', ocrResult.blocks.length);

              if (ocrResult.blocks.length === 0) {
                console.log('OCR 결과 없음 - 텍스트가 감지되지 않았습니다');
                Alert.alert('알림', '이미지에서 텍스트를 찾을 수 없습니다. 다른 이미지를 시도해주세요.');
                setIsLoading(false);
                return;
              }

              // 텍스트 라인을 선택 가능한 형태로 변환
              const lines: SelectableTextLine[] = [];
              ocrResult.blocks.forEach((block) => {
                block.lines.forEach((line) => {
                  // 바운딩 박스를 화면 크기에 맞게 스케일
                  const scaledBox = {
                    x: line.boundingBox.x * scale,
                    y: line.boundingBox.y * scale,
                    width: line.boundingBox.width * scale,
                    height: line.boundingBox.height * scale,
                  };

                  lines.push({
                    ...line,
                    selected: false,
                    scaledBox,
                  });
                });
              });

              console.log('변환된 라인 수:', lines.length);
              setTextLines(lines);
              setIsLoading(false);
            } catch (ocrError: any) {
              console.error('OCR 처리 실패:', ocrError?.message || ocrError);
              const errorMessage = ocrError?.message?.includes('Development Build')
                ? '직접 추출 기능은 Development Build가 필요합니다.\n\nExpo Go에서는 사용할 수 없습니다.'
                : 'OCR 처리 중 문제가 발생했습니다.';
              Alert.alert('오류', errorMessage);
              setIsLoading(false);
            }
          },
          (error) => {
            console.error('이미지 로드 실패:', error);
            Alert.alert('오류', '이미지를 불러올 수 없습니다.');
            setIsLoading(false);
          }
        );
      } catch (error: any) {
        console.error('처리 실패:', error?.message || error);
        Alert.alert('오류', '처리 중 문제가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadImageAndOCR();
  }, [currentImage]);

  // 드래그 영역과 텍스트 라인의 교차 확인
  const checkIntersection = useCallback(
    (lineBox: SelectableTextLine['scaledBox'], selStart: { x: number; y: number }, selEnd: { x: number; y: number }) => {
      const selLeft = Math.min(selStart.x, selEnd.x);
      const selRight = Math.max(selStart.x, selEnd.x);
      const selTop = Math.min(selStart.y, selEnd.y);
      const selBottom = Math.max(selStart.y, selEnd.y);

      const lineLeft = lineBox.x;
      const lineRight = lineBox.x + lineBox.width;
      const lineTop = lineBox.y;
      const lineBottom = lineBox.y + lineBox.height;

      // AABB 교차 검사
      return !(selRight < lineLeft || selLeft > lineRight || selBottom < lineTop || selTop > lineBottom);
    },
    []
  );

  // 드래그로 선택된 라인 업데이트
  const updateSelectionFromDrag = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      setTextLines((prev) =>
        prev.map((line) => ({
          ...line,
          selected: checkIntersection(line.scaledBox, start, end),
        }))
      );
    },
    [checkIntersection]
  );

  // PanResponder 설정
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setSelectionStart({ x: locationX, y: locationY });
        setSelectionEnd({ x: locationX, y: locationY });
        setIsDragging(true);

        // 기존 선택 해제
        setTextLines((prev) => prev.map((line) => ({ ...line, selected: false })));
      },

      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (selectionStart) {
          const newEnd = {
            x: selectionStart.x + gestureState.dx,
            y: selectionStart.y + gestureState.dy,
          };
          setSelectionEnd(newEnd);
          updateSelectionFromDrag(selectionStart, newEnd);
        }
      },

      onPanResponderRelease: () => {
        setIsDragging(false);
        // 선택 영역 표시는 유지하되 드래그 상태만 해제
      },
    })
  ).current;

  // 라인 탭으로 선택/해제
  const handleLineTap = (lineId: string) => {
    setTextLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, selected: !line.selected } : line
      )
    );
    // 드래그 선택 영역 초기화
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    const allSelected = textLines.every((line) => line.selected);
    setTextLines((prev) => prev.map((line) => ({ ...line, selected: !allSelected })));
  };

  // 선택 초기화
  const handleClearSelection = () => {
    setTextLines((prev) => prev.map((line) => ({ ...line, selected: false })));
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // 추출 버튼 클릭
  const handleExtract = () => {
    const selectedLines = textLines.filter((line) => line.selected);

    if (selectedLines.length === 0) {
      Alert.alert('알림', '추출할 텍스트를 선택해주세요.');
      return;
    }

    if (!user?.id) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    // 이미 선택된 책이 있으면 바로 저장
    if (selectedBook) {
      handleBookSelect(selectedBook);
      return;
    }

    // 책 선택 모달 열기
    setBookSelectModalVisible(true);
  };

  // 책 선택 후 저장
  const handleBookSelect = async (book: Book) => {
    setBookSelectModalVisible(false);

    const selectedLines = textLines.filter((line) => line.selected);
    if (selectedLines.length === 0 || !user?.id || !currentImage) {
      return;
    }

    setProcessing(true);

    try {
      // 선택된 텍스트 결합
      const combinedText = selectedLines.map((line) => line.text).join(' ');

      // 이미지 업로드
      let imageUrl: string | undefined;
      try {
        const fileName = `${Date.now()}-${currentImage.id}.jpg`;
        imageUrl = await uploadImage(user.id, currentImage.uri, fileName);
        console.log('이미지 업로드 완료:', imageUrl);
      } catch (uploadError) {
        console.error('이미지 업로드 실패:', uploadError);
      }

      // 저장 데이터 구조 (스펙에 맞게)
      const quoteData = {
        book_id: book.id,
        content: combinedText,
        is_favorite: false,
        ...(imageUrl && { image_url: imageUrl }),
      };

      await saveQuotes(user.id, [quoteData]);

      resetCapture();

      Alert.alert('저장 완료', '문장이 저장되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            router.replace(`/book/${book.id}` as any);
          },
        },
      ]);
    } catch (error) {
      console.error('저장 실패:', error);
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const selectedCount = textLines.filter((line) => line.selected).length;
  const selectedText = textLines
    .filter((line) => line.selected)
    .map((line) => line.text)
    .join(' ');

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Loading message="텍스트 인식 중..." fullScreen />
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

  if (!currentImage) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <IconSymbol name="photo" size={48} color={colors.textTertiary} />
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            이미지가 없습니다
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 안내 텍스트 */}
        <View style={styles.instructionContainer}>
          <IconSymbol name="hand.draw" size={20} color={Colors.brand.primary} />
          <ThemedText style={[styles.instructionText, { color: colors.textSecondary }]}>
            드래그하거나 탭하여 추출할 텍스트를 선택하세요
          </ThemedText>
        </View>

        {/* 이미지 + 텍스트 오버레이 */}
        <View
          ref={imageContainerRef}
          style={[
            styles.imageContainer,
            { width: displaySize.width, height: displaySize.height },
          ]}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: currentImage.uri }}
            style={[styles.image, { width: displaySize.width, height: displaySize.height }]}
            resizeMode="contain"
          />

          {/* 텍스트 라인 오버레이 */}
          {textLines.map((line) => (
            <Pressable
              key={line.id}
              onPress={() => handleLineTap(line.id)}
              style={[
                styles.textLineOverlay,
                {
                  left: line.scaledBox.x,
                  top: line.scaledBox.y,
                  width: line.scaledBox.width,
                  height: line.scaledBox.height,
                  backgroundColor: line.selected
                    ? 'rgba(99, 102, 241, 0.4)'
                    : 'rgba(255, 255, 255, 0.2)',
                  borderColor: line.selected ? Colors.brand.primary : 'transparent',
                  borderWidth: line.selected ? 2 : 0,
                },
              ]}
            />
          ))}

          {/* 드래그 선택 영역 표시 */}
          {isDragging && selectionStart && selectionEnd && (
            <View
              style={[
                styles.selectionRect,
                {
                  left: Math.min(selectionStart.x, selectionEnd.x),
                  top: Math.min(selectionStart.y, selectionEnd.y),
                  width: Math.abs(selectionEnd.x - selectionStart.x),
                  height: Math.abs(selectionEnd.y - selectionStart.y),
                },
              ]}
            />
          )}
        </View>

        {/* 선택된 텍스트 미리보기 */}
        {selectedCount > 0 && (
          <View style={[styles.previewContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.previewHeader}>
              <ThemedText style={Typography.label}>선택된 텍스트</ThemedText>
              <Pressable onPress={handleClearSelection}>
                <ThemedText style={{ color: Colors.brand.primary, fontSize: 14 }}>
                  선택 해제
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText style={[styles.previewText, { color: colors.text }]} numberOfLines={5}>
              "{selectedText}"
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.footerInfo}>
          <ThemedText style={[styles.selectedCount, { color: colors.textSecondary }]}>
            {selectedCount}개 라인 선택됨
          </ThemedText>
        </View>
        <Button
          title="추출하기"
          onPress={handleExtract}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 200,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  instructionText: {
    ...Typography.bodySmall,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  image: {
    borderRadius: BorderRadius.lg,
  },
  textLineOverlay: {
    position: 'absolute',
    borderRadius: 2,
  },
  selectionRect: {
    position: 'absolute',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    borderStyle: 'dashed',
  },
  previewContainer: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  previewText: {
    ...Typography.body,
    lineHeight: 24,
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
});
