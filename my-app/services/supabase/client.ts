import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// WebBrowser 세션 완료 설정
WebBrowser.maybeCompleteAuthSession();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// SSR 환경 체크 (localStorage가 없는 경우)
const isSSR = typeof window === 'undefined';

// SecureStore adapter for Supabase auth
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isSSR) {
      return null; // SSR 환경에서는 null 반환
    }
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isSSR) {
      return; // SSR 환경에서는 무시
    }
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isSSR) {
      return; // SSR 환경에서는 무시
    }
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth 헬퍼 함수
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

export const signInWithGoogle = async () => {
  try {
    console.log('===== Google Sign In 시작 =====');
    console.log('Platform:', Platform.OS);
    
    // Supabase 직접 URL 사용 (Expo Go에서 가장 안정적)
    const redirectUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/callback`;

    console.log('생성된 Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    console.log('Supabase OAuth 응답:', { 
      hasData: !!data, 
      hasError: !!error,
      url: data?.url?.substring(0, 100) 
    });

    if (error) {
      console.error('Supabase OAuth 에러:', error);
      throw error;
    }

    // 브라우저 열기
    if (data?.url) {
      console.log('브라우저 열기 시도:', data.url.substring(0, 100));
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );
      console.log('브라우저 결과:', result);

      if (result.type === 'success') {
        console.log('로그인 성공! URL:', result.url);
        
        // Supabase가 이미 세션을 설정했을 가능성이 높음
        // 세션 새로고침
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          console.log('세션 확인 성공:', sessionData.session.user.email);
          return { data: sessionData, error: null };
        }
        
        // 혹시 URL에 토큰이 있다면 추출
        try {
          const url = new URL(result.url);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');

          if (access_token && refresh_token) {
            console.log('URL에서 토큰 추출 성공');
            const { data: tokenData, error: tokenError } = 
              await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
            return { data: tokenData, error: tokenError };
          }
        } catch (e) {
          console.log('URL 파싱 실패, 세션은 이미 설정되었을 수 있음');
        }

        return { data: sessionData, error: sessionError };
      } else if (result.type === 'cancel') {
        console.log('사용자가 로그인을 취소함');
        return { data: null, error: new Error('로그인이 취소되었습니다.') };
      }
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    return { data: null, error };
  }
};
