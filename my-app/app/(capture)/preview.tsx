import { StyleSheet, View, FlatList, Image, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCaptureStore } from '@/stores/capture-store';
import { ImageAsset } from '@/types';

export default function PreviewScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { images, removeImage, addImages, isProcessing, setProcessing } = useCaptureStore();

  const handleRemoveImage = (id: string) => {
    if (images.length === 1) {
      Alert.alert(
        '이미지 삭제',
        '마지막 이미지입니다. 삭제하면 이전 화면으로 돌아갑니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              removeImage(id);
              router.back();
            },
          },
        ]
      );
      return;
    }
    removeImage(id);
  };

  const handleAddMore = async () => {
    const currentCount = images.length;
    const remainingSlots = 10 - currentCount;

    if (remainingSlots <= 0) {
      Alert.alert('알림', '최대 10장까지만 선택할 수 있습니다.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('갤러리 권한 필요', '설정에서 갤러리 권한을 허용해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages: ImageAsset[] = result.assets.map((asset) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        source: 'gallery' as const,
      }));
      addImages(newImages);
    }
  };

  const handleAutoExtract = async () => {
    if (images.length === 0) {
      Alert.alert('알림', '이미지를 선택해주세요.');
      return;
    }

    setProcessing(true);

    // TODO: OCR 처리 로직 추가
    // 지금은 바로 다음 화면으로 이동
    setTimeout(() => {
      setProcessing(false);
      router.push('/(capture)/ocr-result');
    }, 500);
  };

  const handleManualExtract = () => {
    if (images.length === 0) {
      Alert.alert('알림', '이미지를 선택해주세요.');
      return;
    }

    // 직접 추출 화면으로 이동
    router.push('/(capture)/manual-extract');
  };

  const renderImage = ({ item, index }: { item: ImageAsset; index: number }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
      <View style={styles.imageOverlay}>
        <View style={[styles.imageIndex, { backgroundColor: colors.background }]}>
          <ThemedText style={styles.imageIndexText}>{index + 1}</ThemedText>
        </View>
        <Pressable
          onPress={() => handleRemoveImage(item.id)}
          style={[styles.removeButton, { backgroundColor: Colors.semantic.error }]}
        >
          <IconSymbol name="xmark" size={14} color="#fff" />
        </Pressable>
      </View>
      <View style={[styles.sourceTag, { backgroundColor: colors.background + 'CC' }]}>
        <IconSymbol
          name={item.source === 'camera' ? 'camera.fill' : 'photo.fill'}
          size={12}
          color={colors.textSecondary}
        />
      </View>
    </View>
  );

  if (isProcessing) {
    return (
      <ThemedView style={styles.container}>
        <Loading message="이미지 처리 중..." fullScreen />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={[styles.title, Typography.h2]}>
          선택한 이미지
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {images.length}장의 이미지가 선택되었습니다 (최대 10장)
        </ThemedText>

        {images.length > 0 ? (
          <FlatList
            data={images}
            renderItem={renderImage}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageList}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol name="photo.on.rectangle" size={48} color={colors.textTertiary} />
            <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
              선택된 이미지가 없습니다
            </ThemedText>
          </View>
        )}

        {images.length < 10 && (
          <Pressable onPress={handleAddMore} style={styles.addMoreButton}>
            <IconSymbol name="plus.circle.fill" size={20} color={Colors.brand.primary} />
            <ThemedText style={[styles.addMoreText, { color: Colors.brand.primary }]}>
              이미지 추가하기 ({images.length}/10)
            </ThemedText>
          </Pressable>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <ThemedText style={[styles.footerTitle, { color: colors.textSecondary }]}>
          추출 방식 선택
        </ThemedText>
        <View style={styles.buttonRow}>
          <Button
            title="직접 추출"
            onPress={handleManualExtract}
            variant="outline"
            disabled={images.length === 0}
            style={styles.extractButton}
          />
          <Button
            title="자동 추출"
            onPress={handleAutoExtract}
            disabled={images.length === 0}
            style={styles.extractButton}
          />
        </View>
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
    paddingTop: Spacing.lg,
  },
  title: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  imageList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  imageContainer: {
    position: 'relative',
    width: 200,
    height: 280,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndexText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTag: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
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
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  addMoreText: {
    ...Typography.label,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  footerTitle: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  extractButton: {
    flex: 1,
  },
});
