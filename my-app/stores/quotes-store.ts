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
  toggleFavorite: (id: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Supabase 연동
  fetchQuotes: (userId: string, bookId?: string) => Promise<void>;
  saveQuote: (userId: string, quote: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Note>;
  saveQuotes: (userId: string, quotes: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => Promise<Note[]>;
  deleteQuote: (id: string) => Promise<void>;
  syncToggleFavorite: (id: string) => Promise<void>;

  // Selectors
  getQuotesByBook: (bookId: string) => Note[];
  getFavorites: () => Note[];
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

  toggleFavorite: (id) =>
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === id ? { ...q, is_favorite: !q.is_favorite } : q
      ),
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
      const notes = await db.createNotes(
        quotesData.map((q) => ({
          ...q,
          user_id: userId,
          is_favorite: q.is_favorite ?? false,
        }))
      );
      set((state) => ({
        quotes: [...notes, ...state.quotes],
        isSyncing: false,
      }));
      return notes;
    } catch (error) {
      console.error('Failed to save quotes:', error);
      set({ error: '문장 저장에 실패했습니다.', isSyncing: false });
      throw error;
    }
  },

  deleteQuote: async (id) => {
    set({ isSyncing: true });
    try {
      await db.deleteNote(id);
      set((state) => ({
        quotes: state.quotes.filter((q) => q.id !== id),
        isSyncing: false,
      }));
    } catch (error) {
      console.error('Failed to delete quote:', error);
      set({ error: '문장 삭제에 실패했습니다.', isSyncing: false });
      throw error;
    }
  },

  syncToggleFavorite: async (id) => {
    const quote = get().quotes.find((q) => q.id === id);
    if (!quote) return;

    // Optimistic update
    get().toggleFavorite(id);

    try {
      await db.toggleNoteFavorite(id, !quote.is_favorite);
    } catch (error) {
      // Rollback on error
      get().toggleFavorite(id);
      console.error('Failed to toggle favorite:', error);
      set({ error: '즐겨찾기 변경에 실패했습니다.' });
    }
  },

  // Selectors
  getQuotesByBook: (bookId) => {
    return get().quotes.filter((q) => q.book_id === bookId);
  },

  getFavorites: () => {
    return get().quotes.filter((q) => q.is_favorite);
  },

  getRandomQuote: () => {
    const quotes = get().quotes;
    if (quotes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  },
}));
