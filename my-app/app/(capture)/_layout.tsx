import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CaptureLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="camera"
        options={{
          title: '사진 촬영',
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="preview"
        options={{
          title: '이미지 확인',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="ocr-result"
        options={{
          title: '문장 확인',
          headerBackTitle: '뒤로',
        }}
      />
    </Stack>
  );
}
