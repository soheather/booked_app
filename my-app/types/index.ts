// User
export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

// Book
export interface Book {
  id: string;
  user_id: string;
  isbn?: string;
  title: string;
  author?: string;
  publisher?: string;
  cover_url?: string;
  created_at: string;
}

// Upload (원본 이미지)
export interface Upload {
  id: string;
  user_id: string;
  book_id?: string;
  image_url: string;
  thumbnail_url?: string;
  ocr_text?: string;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
  source: 'camera' | 'gallery' | 'screenshot';
  created_at: string;
}

// Note (문장)
export interface Note {
  id: string;
  user_id: string;
  book_id?: string;
  upload_id?: string;
  content: string;
  page_number?: number;
  is_favorite: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// 캡처 플로우 상태
export type CaptureStep =
  | 'idle'
  | 'capturing'
  | 'previewing'
  | 'processing'
  | 'editing'
  | 'matching'
  | 'saving';

export interface ImageAsset {
  id: string;
  uri: string;
  width: number;
  height: number;
  source: 'camera' | 'gallery';
}

export interface OCRResult {
  imageId: string;
  text: string;
  sentences: string[];
  confidence?: number;
}

// Book Search API 응답
export interface BookSearchResult {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  cover_url: string;
  description?: string;
  published_date?: string;
}

// Navigation 파라미터
export type RootStackParamList = {
  '(tabs)': undefined;
  '(capture)/camera': undefined;
  '(capture)/preview': undefined;
  '(capture)/ocr-result': undefined;
  'book/search': { returnTo?: string };
  'book/[id]': { id: string };
  'note/[id]': { id: string };
};
