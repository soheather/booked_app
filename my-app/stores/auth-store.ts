import { create } from 'zustand';
import { User } from '@/types';
import { supabase, signInWithEmail, signUpWithEmail, signInWithGoogle as supabaseSignInWithGoogle, signOut as supabaseSignOut, getSession } from '@/services/supabase/client';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Auth Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const mapSupabaseUser = (supabaseUser: any): User | null => {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    display_name: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0],
    avatar_url: supabaseUser.user_metadata?.avatar_url,
    created_at: supabaseUser.created_at,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setSession: (session) =>
    set({
      session,
      user: mapSupabaseUser(session?.user),
      isAuthenticated: !!session,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { session, error } = await getSession();

      if (error) {
        console.error('Session initialization error:', error);
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      if (session) {
        set({
          session,
          user: mapSupabaseUser(session.user),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }

      // Auth 상태 변화 리스너 설정
      supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          set({
            session,
            user: mapSupabaseUser(session?.user),
            isAuthenticated: true,
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            session: null,
            user: null,
            isAuthenticated: false,
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization failed:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        const errorMessage = getErrorMessage(error.message);
        set({ error: errorMessage, isLoading: false });
        return { success: false, error: errorMessage };
      }

      if (data.session) {
        set({
          session: data.session,
          user: mapSupabaseUser(data.user),
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: '로그인에 실패했습니다.' };
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = '로그인 중 오류가 발생했습니다.';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signUpWithEmail(email, password);

      if (error) {
        const errorMessage = getErrorMessage(error.message);
        set({ error: errorMessage, isLoading: false });
        return { success: false, error: errorMessage };
      }

      // 이메일 확인이 필요한 경우
      if (data.user && !data.session) {
        set({ isLoading: false });
        return { success: true };
      }

      if (data.session) {
        set({
          session: data.session,
          user: mapSupabaseUser(data.user),
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: '회원가입에 실패했습니다.' };
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = '회원가입 중 오류가 발생했습니다.';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('[auth-store] Google 로그인 시작');
      const { data, error } = await supabaseSignInWithGoogle();

      console.log('[auth-store] Google 로그인 응답:', { 
        hasData: !!data, 
        hasError: !!error,
        hasSession: !!data?.session,
        hasUser: !!data?.user
      });

      if (error) {
        const errorMessage = error.message || 'Google 로그인에 실패했습니다.';
        set({ error: errorMessage, isLoading: false });
        return { success: false, error: errorMessage };
      }

      // session이 있으면 성공 (user는 session.user에 있을 수 있음)
      if (data?.session) {
        const user = data.user || data.session.user;
        console.log('[auth-store] 세션 설정:', user?.email);
        set({
          session: data.session,
          user: mapSupabaseUser(user),
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      console.log('[auth-store] 세션 없음');
      set({ isLoading: false });
      return { success: false, error: 'Google 로그인에 실패했습니다.' };
    } catch (error: any) {
      console.error('[auth-store] Google sign in error:', error);
      const errorMessage = error?.message || 'Google 로그인 중 오류가 발생했습니다.';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await supabaseSignOut();
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      set({ isLoading: false });
    }
  },

  refreshSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        return;
      }
      if (session) {
        set({
          session,
          user: mapSupabaseUser(session.user),
        });
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
    }
  },
}));

// 에러 메시지 한글화
function getErrorMessage(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email not confirmed': '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
    'User already registered': '이미 등록된 이메일입니다.',
    'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
    'Unable to validate email address: invalid format': '올바른 이메일 형식이 아닙니다.',
  };

  return errorMap[message] || message;
}
