import { StyleSheet, View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCaptureStore } from '@/stores/capture-store';
import { ImageAsset } from '@/types';

export default function CameraScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { addImages, reset } = useCaptureStore();

  const handleClose = () => {
    reset();
    router.back();
  };

  const processImages = (
    assets: ImagePicker.ImagePickerAsset[],
    source: 'camera' | 'gallery'
  ): ImageAsset[] => {
    return assets.map((asset) => ({
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      source,
    }));
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '카메라 권한 필요',
        '설정에서 카메라 권한을 허용해주세요.',
        [{ text: '확인' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const images = processImages(result.assets, 'camera');
      addImages(images);
      router.push('/(capture)/preview');
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '갤러리 권한 필요',
        '설정에서 갤러리 권한을 허용해주세요.',
        [{ text: '확인' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const images = processImages(result.assets, 'gallery');
      addImages(images);
      router.push('/(capture)/preview');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <IconSymbol name="xmark" size={24} color={colors.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, Typography.h3]}>
          사진 선택
        </ThemedText>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          책의 페이지를 촬영하거나{'\n'}앨범에서 선택해주세요
        </ThemedText>

        {/* Option Cards */}
        <View style={styles.options}>
          <Pressable
            onPress={handleCamera}
            style={({ pressed }) => [
              styles.optionCard,
              { backgroundColor: colors.card },
              pressed && { backgroundColor: colors.cardPressed },
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.brand.primary + '15' }]}>
              <IconSymbol name="camera.fill" size={32} color={Colors.brand.primary} />
            </View>
            <ThemedText style={[styles.optionTitle, Typography.label]}>
              카메라로 촬영
            </ThemedText>
            <ThemedText style={[styles.optionDesc, { color: colors.textTertiary }]}>
              지금 바로 촬영하기
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleGallery}
            style={({ pressed }) => [
              styles.optionCard,
              { backgroundColor: colors.card },
              pressed && { backgroundColor: colors.cardPressed },
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.brand.secondary + '15' }]}>
              <IconSymbol name="photo.on.rectangle" size={32} color={Colors.brand.secondary} />
            </View>
            <ThemedText style={[styles.optionTitle, Typography.label]}>
              앨범에서 선택
            </ThemedText>
            <ThemedText style={[styles.optionDesc, { color: colors.textTertiary }]}>
              최대 10장까지 선택
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          title="취소"
          onPress={handleClose}
          variant="ghost"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  options: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  optionCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  optionTitle: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  optionDesc: {
    ...Typography.caption,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
  },
});
