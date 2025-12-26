import { supabase } from './client';
import { Book, Note, Upload } from '@/types';

// ============ Books ============

export async function fetchBooks(userId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching books:', error);
    throw error;
  }

  return data || [];
}

export async function fetchBookById(bookId: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) {
    console.error('Error fetching book:', error);
    return null;
  }

  return data;
}

export async function createBook(book: Omit<Book, 'id' | 'created_at'>): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .insert(book)
    .select()
    .single();

  if (error) {
    console.error('Error creating book:', error);
    throw error;
  }

  return data;
}

export async function updateBook(
  bookId: string,
  updates: Partial<Omit<Book, 'id' | 'user_id' | 'created_at'>>
): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .update(updates)
    .eq('id', bookId)
    .select()
    .single();

  if (error) {
    console.error('Error updating book:', error);
    throw error;
  }

  return data;
}

export async function deleteBook(bookId: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', bookId);

  if (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
}

export async function findBookByISBN(userId: string, isbn: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .eq('isbn', isbn)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No rows found
    }
    console.error('Error finding book by ISBN:', error);
    return null;
  }

  return data;
}

// ============ Notes (Quotes) ============

export async function fetchNotes(userId: string, options?: {
  bookId?: string;
  limit?: number;
  offset?: number;
}): Promise<Note[]> {
  let query = supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.bookId) {
    query = query.eq('book_id', options.bookId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }

  return data || [];
}

export async function fetchNoteById(noteId: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (error) {
    console.error('Error fetching note:', error);
    return null;
  }

  return data;
}

export async function createNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select()
    .single();

  if (error) {
    console.error('Error creating note:', error);
    throw error;
  }

  return data;
}

export async function createNotes(notes: Omit<Note, 'id' | 'created_at' | 'updated_at'>[]): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .insert(notes)
    .select();

  if (error) {
    console.error('Error creating notes:', error);
    throw error;
  }

  return data || [];
}

export async function updateNote(
  noteId: string,
  updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at'>>
): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating note:', error);
    throw error;
  }

  return data;
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', noteId);

  if (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
}

export async function toggleNoteFavorite(noteId: string, isFavorite: boolean): Promise<Note> {
  return updateNote(noteId, { is_favorite: isFavorite });
}

export async function fetchFavoriteNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_favorite', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorite notes:', error);
    throw error;
  }

  return data || [];
}

export async function fetchNoteCountByBook(userId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('notes')
    .select('book_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching note counts:', error);
    throw error;
  }

  const counts = new Map<string, number>();
  data?.forEach((note) => {
    if (note.book_id) {
      counts.set(note.book_id, (counts.get(note.book_id) || 0) + 1);
    }
  });

  return counts;
}

// ============ Uploads ============

export async function fetchUploads(userId: string, bookId?: string): Promise<Upload[]> {
  let query = supabase
    .from('uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (bookId) {
    query = query.eq('book_id', bookId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching uploads:', error);
    throw error;
  }

  return data || [];
}

export async function createUpload(upload: Omit<Upload, 'id' | 'created_at'>): Promise<Upload> {
  const { data, error } = await supabase
    .from('uploads')
    .insert(upload)
    .select()
    .single();

  if (error) {
    console.error('Error creating upload:', error);
    throw error;
  }

  return data;
}

export async function updateUpload(
  uploadId: string,
  updates: Partial<Omit<Upload, 'id' | 'user_id' | 'created_at'>>
): Promise<Upload> {
  const { data, error } = await supabase
    .from('uploads')
    .update(updates)
    .eq('id', uploadId)
    .select()
    .single();

  if (error) {
    console.error('Error updating upload:', error);
    throw error;
  }

  return data;
}

export async function deleteUpload(uploadId: string): Promise<void> {
  const { error } = await supabase.from('uploads').delete().eq('id', uploadId);

  if (error) {
    console.error('Error deleting upload:', error);
    throw error;
  }
}

// ============ Storage ============

export async function uploadImage(
  userId: string,
  uri: string,
  fileName: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from('uploads')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function deleteImage(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from('uploads').remove([filePath]);

  if (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

// ============ Stats ============

export async function fetchUserStats(userId: string): Promise<{
  totalBooks: number;
  totalNotes: number;
  favoriteNotes: number;
}> {
  const [booksResult, notesResult, favoritesResult] = await Promise.all([
    supabase.from('books').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_favorite', true),
  ]);

  return {
    totalBooks: booksResult.count || 0,
    totalNotes: notesResult.count || 0,
    favoriteNotes: favoritesResult.count || 0,
  };
}
