import { create } from 'zustand';
import { ImageAsset, OCRResult, Book, CaptureStep } from '@/types';

interface ExtractedSentence {
  id: string;
  content: string;
  imageId: string;
  selected: boolean;
}

interface CaptureState {
  // 상태
  step: CaptureStep;
  images: ImageAsset[];
  ocrResults: OCRResult[];
  extractedSentences: ExtractedSentence[];
  selectedBook: Book | null;
  isProcessing: boolean;

  // 이미지 관련 액션
  addImages: (images: ImageAsset[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;

  // OCR 관련 액션
  setOCRResults: (results: OCRResult[]) => void;
  setExtractedSentences: (sentences: ExtractedSentence[]) => void;
  toggleSentence: (id: string) => void;
  updateSentence: (id: string, content: string) => void;

  // 책 관련 액션
  setSelectedBook: (book: Book | null) => void;

  // 플로우 관련 액션
  setStep: (step: CaptureStep) => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;
}

const initialState = {
  step: 'idle' as CaptureStep,
  images: [] as ImageAsset[],
  ocrResults: [] as OCRResult[],
  extractedSentences: [] as ExtractedSentence[],
  selectedBook: null as Book | null,
  isProcessing: false,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,

  // 이미지 관련
  addImages: (newImages) =>
    set((state) => ({
      images: [...state.images, ...newImages],
      step: 'previewing',
    })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
    })),

  clearImages: () => set({ images: [] }),

  // OCR 관련
  setOCRResults: (results) =>
    set({
      ocrResults: results,
      step: 'editing',
    }),

  setExtractedSentences: (sentences) =>
    set({ extractedSentences: sentences }),

  toggleSentence: (id) =>
    set((state) => ({
      extractedSentences: state.extractedSentences.map((s) =>
        s.id === id ? { ...s, selected: !s.selected } : s
      ),
    })),

  updateSentence: (id, content) =>
    set((state) => ({
      extractedSentences: state.extractedSentences.map((s) =>
        s.id === id ? { ...s, content } : s
      ),
    })),

  // 책 관련
  setSelectedBook: (book) =>
    set({
      selectedBook: book,
      step: book ? 'saving' : 'matching',
    }),

  // 플로우 관련
  setStep: (step) => set({ step }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  reset: () => set(initialState),
}));
