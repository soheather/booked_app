import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { OCRResult } from '@/types';

// Gemini API 설정
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// 이미지 최대 크기 (토큰 절약)
const MAX_IMAGE_SIZE = 1024;

// 구조화된 OCR 응답 인터페이스
export interface OCRStructuredResult {
  paragraphs: string[];
  underlinedSentences: string[];
  bookTitle: string | null;
  pageNumber: number | null;
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * 이미지 리사이즈 (토큰 절약)
 */
async function resizeImage(uri: string): Promise<string> {
  try {
    console.log('이미지 리사이즈 시작...');
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_SIZE } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    console.log('리사이즈 완료:', result.uri.substring(0, 50));
    return result.uri;
  } catch (error) {
    console.warn('이미지 리사이즈 실패, 원본 사용:', error);
    return uri;
  }
}

/**
 * 온디바이스 OCR (ML Kit) - 무료, 빠름
 */
async function performOnDeviceOCR(uri: string): Promise<string | null> {
  // 웹에서는 ML Kit 사용 불가
  if (Platform.OS === 'web') {
    console.log('웹 환경: 온디바이스 OCR 불가');
    return null;
  }

  try {
    console.log('온디바이스 OCR 시작 (ML Kit)...');
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const result = await TextRecognition.recognize(uri);

    if (result?.text && result.text.trim().length > 0) {
      console.log('온디바이스 OCR 성공, 텍스트 길이:', result.text.length);
      return result.text.trim();
    }

    console.log('온디바이스 OCR: 텍스트 없음');
    return null;
  } catch (error) {
    console.warn('온디바이스 OCR 실패:', error);
    return null;
  }
}

/**
 * 웹에서 이미지를 Base64로 변환
 */
async function imageToBase64Web(uri: string): Promise<string> {
  try {
    if (uri.startsWith('data:')) {
      return uri.split(',')[1];
    }

    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Web: Failed to convert image to base64:', error);
    throw new Error('이미지를 읽을 수 없습니다.');
  }
}

/**
 * 네이티브에서 이미지를 Base64로 인코딩
 */
async function imageToBase64Native(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    const base64 = await file.base64();
    return base64;
  } catch (error) {
    console.error('Native: Failed to convert image to base64:', error);
    throw new Error('이미지를 읽을 수 없습니다.');
  }
}

/**
 * 이미지를 Base64로 인코딩 (플랫폼별 분기)
 */
async function imageToBase64(uri: string): Promise<string> {
  console.log('imageToBase64 시작, Platform:', Platform.OS, 'URI:', uri.substring(0, 50));

  if (Platform.OS === 'web') {
    return imageToBase64Web(uri);
  }
  return imageToBase64Native(uri);
}

// 시스템 프롬프트 (구조화된 JSON 출력)
const SYSTEM_PROMPT = `당신은 책 이미지에서 텍스트를 추출하는 OCR 전문가입니다.
이미지를 분석하고 아래 JSON 형식으로만 응답하세요:

{
  "paragraphs": ["첫 번째 문단", "두 번째 문단", ...],
  "underlinedSentences": ["밑줄 친 문장1", ...],
  "bookTitle": "감지된 책 제목 또는 null",
  "pageNumber": 감지된 페이지 번호 또는 null
}

규칙:
1. paragraphs: 이미지 속에서 읽을 수 있는 모든 텍스트를 자연스러운 읽기 순서와 흐름을 유지하여 추출하세요. 같은 문단 또는 같은 생각을 이루는 문장들은 하나의 연결된 문장으로 합쳐서 구성하세요. 줄바꿈이나 들여쓰기로 구분된 단락을 하나의 문단으로 그룹화합니다.
2. underlinedSentences: 밑줄이 그어진 문장만 별도로 추출합니다. 밑줄이 없으면 빈 배열 []을 반환합니다.
3. bookTitle: 이미지 상단이나 하단에 책 제목이 보이면 추출합니다. 없으면 null.
4. pageNumber: 페이지 번호가 보이면 숫자로 추출합니다. 없으면 null.

JSON만 출력하고 다른 설명은 하지 마세요.`;

/**
 * 사용자 프롬프트 생성 (밑줄 감지 ON/OFF)
 */
function createUserPrompt(detectUnderline: boolean): string {
  if (detectUnderline) {
    return '이 책 페이지 이미지를 분석해주세요. 밑줄 감지: ON - 밑줄 친 문장을 반드시 찾아주세요.';
  }
  return '이 책 페이지 이미지를 분석해주세요. 밑줄 감지: OFF - underlinedSentences는 빈 배열로 반환하세요.';
}

/**
 * Gemini API OCR (구조화된 JSON 응답)
 */
async function performGeminiOCR(
  imageUri: string,
  apiKey: string,
  detectUnderline: boolean = true
): Promise<OCRStructuredResult> {
  try {
    // 이미지 리사이즈로 토큰 절약
    const resizedUri = await resizeImage(imageUri);
    const base64Image = await imageToBase64(resizedUri);

    const userPrompt = createUserPrompt(detectUnderline);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT + '\n\n' + userPrompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    console.log('Gemini API 요청 시작 (구조화된 JSON)...');

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    console.log('Gemini API 응답 상태:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', JSON.stringify(errorData, null, 2));
      throw new Error(`OCR 요청 실패: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini 응답:', responseText.substring(0, 200));

    // JSON 파싱
    const result = parseGeminiResponse(responseText);
    console.log('파싱된 결과 - 문단 수:', result.paragraphs.length, ', 밑줄 문장 수:', result.underlinedSentences.length);
    return result;
  } catch (error) {
    console.error('Gemini OCR failed:', error);
    throw error;
  }
}

/**
 * Gemini 응답을 OCRStructuredResult로 파싱
 */
function parseGeminiResponse(responseText: string): OCRStructuredResult {
  const defaultResult: OCRStructuredResult = {
    paragraphs: [],
    underlinedSentences: [],
    bookTitle: null,
    pageNumber: null,
  };

  try {
    // JSON 블록 추출 (```json ... ``` 형식 처리)
    let jsonStr = responseText.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else if (jsonStr.startsWith('```') && jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(3, -3).trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      paragraphs: Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [],
      underlinedSentences: Array.isArray(parsed.underlinedSentences) ? parsed.underlinedSentences : [],
      bookTitle: typeof parsed.bookTitle === 'string' ? parsed.bookTitle : null,
      pageNumber: typeof parsed.pageNumber === 'number' ? parsed.pageNumber : null,
    };
  } catch (error) {
    console.warn('JSON 파싱 실패, 텍스트로 폴백:', error);
    // 파싱 실패 시 전체 텍스트를 하나의 문단으로
    if (responseText.trim()) {
      return {
        ...defaultResult,
        paragraphs: [responseText.trim()],
      };
    }
    return defaultResult;
  }
}

/**
 * 구조화된 OCR 수행 (Gemini API 사용)
 */
export async function performStructuredOCR(
  imageUri: string,
  apiKey: string,
  detectUnderline: boolean = true
): Promise<OCRStructuredResult> {
  console.log('=== 구조화된 OCR 시작 ===');
  return performGeminiOCR(imageUri, apiKey, detectUnderline);
}

/**
 * 하이브리드 OCR 수행 (온디바이스 우선, Gemini 폴백)
 * 하위 호환성을 위해 문자열 반환
 */
export async function performOCR(
  imageUri: string,
  apiKey: string
): Promise<string> {
  console.log('=== 하이브리드 OCR 시작 ===');

  // 1단계: 이미지 리사이즈
  const resizedUri = await resizeImage(imageUri);

  // 2단계: 온디바이스 OCR 시도 (무료)
  const onDeviceResult = await performOnDeviceOCR(resizedUri);

  if (onDeviceResult && onDeviceResult.length > 10) {
    console.log('온디바이스 OCR 결과 사용 (API 호출 절약)');
    return onDeviceResult;
  }

  // 3단계: Gemini 폴백 (텍스트가 없거나 너무 짧은 경우)
  console.log('Gemini API 폴백 사용');
  const result = await performGeminiOCR(resizedUri, apiKey, false);
  // 문단들을 합쳐서 반환
  return result.paragraphs.join('\n\n');
}

/**
 * 밑줄 문장만 추출 (Gemini 전용)
 */
export async function extractUnderlinedText(
  imageUri: string,
  apiKey: string
): Promise<string[]> {
  console.log('=== 밑줄 텍스트 추출 시작 ===');
  const result = await performGeminiOCR(imageUri, apiKey, true);
  return result.underlinedSentences;
}

/**
 * 여러 이미지에 대해 배치 OCR 수행 (구조화된 결과)
 */
export async function performBatchStructuredOCR(
  imageUris: string[],
  apiKey: string,
  detectUnderline: boolean = true,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, OCRStructuredResult>> {
  const results = new Map<string, OCRStructuredResult>();

  for (let i = 0; i < imageUris.length; i++) {
    const uri = imageUris[i];
    try {
      onProgress?.(i + 1, imageUris.length);
      const result = await performStructuredOCR(uri, apiKey, detectUnderline);
      results.set(uri, result);
    } catch (error) {
      console.error(`OCR failed for image ${i + 1}:`, error);
      results.set(uri, {
        paragraphs: [],
        underlinedSentences: [],
        bookTitle: null,
        pageNumber: null,
      });
    }
  }

  return results;
}

/**
 * 여러 이미지에 대해 배치 OCR 수행 (문자열 결과 - 하위 호환성)
 */
export async function performBatchOCR(
  imageUris: string[],
  apiKey: string,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < imageUris.length; i++) {
    const uri = imageUris[i];
    try {
      onProgress?.(i + 1, imageUris.length);
      const text = await performOCR(uri, apiKey);
      results.set(uri, text);
    } catch (error) {
      console.error(`OCR failed for image ${i + 1}:`, error);
      results.set(uri, '');
    }
  }

  return results;
}

/**
 * OCR 결과를 OCRResult 형태로 변환
 */
export function createOCRResult(
  imageId: string,
  text: string,
  splitSentences: (text: string) => string[]
): OCRResult {
  const sentences = splitSentences(text);
  return {
    imageId,
    text,
    sentences,
    confidence: text.length > 0 ? 0.9 : 0,
  };
}

/**
 * 구조화된 OCR 결과를 OCRResult 형태로 변환
 */
export function createOCRResultFromStructured(
  imageId: string,
  structured: OCRStructuredResult
): OCRResult {
  const text = structured.paragraphs.join('\n\n');
  return {
    imageId,
    text,
    sentences: structured.paragraphs,
    confidence: structured.paragraphs.length > 0 ? 0.9 : 0,
  };
}
