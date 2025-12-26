import { create } from 'zustand';
import { Book } from '@/types';
import * as db from '@/services/supabase/database';

interface BooksState {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  isSyncing: boolean;
  noteCountByBook: Map<string, number>;

  // Actions
  setBooks: (books: Book[]) => void;
  addBook: (book: Book) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  removeBook: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Supabase 연동
  fetchBooks: (userId: string) => Promise<void>;
  fetchBookWithNoteCount: (userId: string) => Promise<void>;
  saveBook: (userId: string, book: Omit<Book, 'id' | 'user_id' | 'created_at'>) => Promise<Book>;
  deleteBook: (id: string) => Promise<void>;
  findOrCreateBook: (userId: string, bookData: Omit<Book, 'id' | 'user_id' | 'created_at'>) => Promise<Book>;

  // Selectors
  getBookById: (id: string) => Book | undefined;
  getBookByISBN: (isbn: string) => Book | undefined;
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [],
  isLoading: false,
  error: null,
  isSyncing: false,
  noteCountByBook: new Map(),

  setBooks: (books) => set({ books, isLoading: false }),

  addBook: (book) =>
    set((state) => ({
      books: [book, ...state.books],
    })),

  updateBook: (id, updates) =>
    set((state) => ({
      books: state.books.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),

  removeBook: (id) =>
    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Supabase 연동 Actions
  fetchBooks: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const books = await db.fetchBooks(userId);
      set({ books, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch books:', error);
      set({ error: '책 목록을 불러오는데 실패했습니다.', isLoading: false });
    }
  },

  fetchBookWithNoteCount: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const [books, noteCountByBook] = await Promise.all([
        db.fetchBooks(userId),
        db.fetchNoteCountByBook(userId),
      ]);
      set({ books, noteCountByBook, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch books with note count:', error);
      set({ error: '책 목록을 불러오는데 실패했습니다.', isLoading: false });
    }
  },

  saveBook: async (userId, bookData) => {
    set({ isSyncing: true });
    try {
      const book = await db.createBook({
        ...bookData,
        user_id: userId,
      });
      set((state) => ({
        books: [book, ...state.books],
        isSyncing: false,
      }));
      return book;
    } catch (error) {
      console.error('Failed to save book:', error);
      set({ error: '책 저장에 실패했습니다.', isSyncing: false });
      throw error;
    }
  },

  deleteBook: async (id) => {
    set({ isSyncing: true });
    try {
      await db.deleteBook(id);
      set((state) => ({
        books: state.books.filter((b) => b.id !== id),
        isSyncing: false,
      }));
    } catch (error) {
      console.error('Failed to delete book:', error);
      set({ error: '책 삭제에 실패했습니다.', isSyncing: false });
      throw error;
    }
  },

  findOrCreateBook: async (userId, bookData) => {
    // 이미 저장된 책인지 확인 (ISBN으로)
    if (bookData.isbn) {
      const existingBook = get().books.find((b) => b.isbn === bookData.isbn);
      if (existingBook) {
        return existingBook;
      }

      // Supabase에서도 확인
      const dbBook = await db.findBookByISBN(userId, bookData.isbn);
      if (dbBook) {
        // 로컬 스토어에 추가
        set((state) => ({
          books: [dbBook, ...state.books.filter((b) => b.id !== dbBook.id)],
        }));
        return dbBook;
      }
    }

    // 새 책 저장
    return get().saveBook(userId, bookData);
  },

  // Selectors
  getBookById: (id) => {
    return get().books.find((b) => b.id === id);
  },

  getBookByISBN: (isbn) => {
    return get().books.find((b) => b.isbn === isbn);
  },
}));
