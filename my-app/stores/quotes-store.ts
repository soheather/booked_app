import { create } from 'zustand';
import { Note } from '@/types';
import * as db from '@/services/supabase/database';

type SortOption = 'recent' | 'random' | 'book';

interface QuotesState {
  quotes: Note[];
  isLoading: boolean;
  error: string | null;
  sortBy: SortOption;
  isSyncing: boolean;

  // Actions
  setQuotes: (quotes: Note[]) => void;
  addQuote: (quote: Note) => void;
  addQuotes: (quotes: Note[]) => void;
  updateQuote: (id: string, updates: Partial<Note>) => void;
  removeQuote: (id: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Supabase 연동
  fetchQuotes: (userId: string, bookId?: string) => Promise<void>;
  saveQuote: (userId: string, quote: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Note>;
  saveQuotes: (userId: string, quotes: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => Promise<Note[]>;
  syncUpdateQuote: (id: string, updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;

  // Selectors
  getQuotesByBook: (bookId: string) => Note[];
  getRandomQuote: () => Note | null;
}

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: [],
  isLoading: false,
  error: null,
  sortBy: 'recent',
  isSyncing: false,

  setQuotes: (quotes) => set({ quotes, isLoading: false }),

  addQuote: (quote) =>
    set((state) => ({
      quotes: [quote, ...state.quotes],
    })),

  addQuotes: (newQuotes) =>
    set((state) => ({
      quotes: [...newQuotes, ...state.quotes],
    })),

  updateQuote: (id, updates) =>
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === id ? { ...q, ...updates, updated_at: new Date().toISOString() } : q
      ),
    })),

  removeQuote: (id) =>
    set((state) => ({
      quotes: state.quotes.filter((q) => q.id !== id),
    })),

  setSortBy: (sortBy) => set({ sortBy }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Supabase 연동 Actions
  fetchQuotes: async (userId, bookId) => {
    set({ isLoading: true, error: null });
    try {
      const quotes = await db.fetchNotes(userId, { bookId });
      set({ quotes, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      set({ error: '문장을 불러오는데 실패했습니다.', isLoading: false });
    }
  },

  saveQuote: async (userId, quoteData) => {
    set({ isSyncing: true });
    try {
      const note = await db.createNote({
        ...quoteData,
        user_id: userId,
        is_favorite: quoteData.is_favorite ?? false,
      });
      set((state) => ({
        quotes: [note, ...state.quotes],
        isSyncing: false,
      }));
      return note;
    } catch (error) {
      console.error('Failed to save quote:', error);
      set({ error: '문장 저장에 실패했습니다.', isSyncing: false });
      throw error;
    }
  },

  saveQuotes: async (userId, quotesData) => {
    set({ isSyncing: true });
    try {
      console.log('===== saveQuotes 시작 =====');
      console.log('userId:', userId);
      console.log('quotesData 개수:', quotesData.length);
      console.log('첫 번째 데이터:', quotesData[0]);
      
      const notesToSave = quotesData.map((q) => ({
        ...q,
        user_id: userId,
        is_favorite: q.is_favorite ?? false,
      }));
      
      console.log('변환 후 데이터:', notesToSave[0]);
      
      const notes = await db.createNotes(notesToSave);
      
      console.log('✅ 저장 성공:', notes.length, '개');
      
      set((state) => ({
        quotes: [...notes, ...state.quotes],
        isSyncing: false,
      }));
      return notes;
    } catch (error: any) {
      console.error('❌ saveQuotes 실패');
      console.error('에러:', error);
      console.error('에러 메시지:', error?.message);
      console.error('에러 코드:', error?.code);
      console.error('에러 상세:', error?.details);
      set({ error: '문장 저장에 실패했습니다.', isSyncing: false });
      throw error;
    }
  },

  syncUpdateQuote: async (id, updates) => {
    set({ isSyncing: true });
    try {
      const updatedNote = await db.updateNote(id, updates);
      set((state) => ({
        quotes: state.quotes.map((q) => (q.id === id ? updatedNote : q)),
        isSyncing: false,
      }));
    } catch (error) {
      console.error('Failed to update quote:', error);
      set({ error: '문장 수정에 실패했습니다.', isSyncing: false });
      throw error;
    }
  },

  deleteQuote: async (id) => {
    // 먼저 로컬 상태에서 즉시 제거 (optimistic update)
    const currentQuotes = get().quotes;
    set({
      quotes: currentQuotes.filter((q) => q.id !== id),
      isSyncing: true
    });

    try {
      await db.deleteNote(id);
      set({ isSyncing: false });
    } catch (error) {
      // 실패 시 원래 상태로 복구
      console.error('Failed to delete quote:', error);
      set({
        quotes: currentQuotes,
        error: '문장 삭제에 실패했습니다.',
        isSyncing: false
      });
      throw error;
    }
  },

  // Selectors
  getQuotesByBook: (bookId) => {
    return get().quotes.filter((q) => q.book_id === bookId);
  },

  getRandomQuote: () => {
    const quotes = get().quotes;
    if (quotes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  },
}));
