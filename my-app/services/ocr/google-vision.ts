import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { OCRResult } from '@/types';

// Gemini API 설정
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// 바운딩 박스 OCR 결과 인터페이스 (직접 추출용)
export interface OCRBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRTextBlock {
  id: string;
  text: string;
  boundingBox: OCRBoundingBox;
  lines: OCRTextLine[];
}

export interface OCRTextLine {
  id: string;
  text: string;
  boundingBox: OCRBoundingBox;
}

export interface OCRWithBoundingBoxResult {
  blocks: OCRTextBlock[];
  imageWidth: number;
  imageHeight: number;
}

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
const SYSTEM_PROMPT = `당신은 책 이미지에서 텍스트를 읽기 좋은 의미 단위로 추출하는 OCR 전문가입니다.
이미지를 분석하고 아래 JSON 형식으로만 응답하세요:

{
  "paragraphs": ["의미 단위 1", "의미 단위 2", ...],
  "underlinedSentences": ["밑줄 친 문장1", ...],
  "bookTitle": "감지된 책 제목 또는 null",
  "pageNumber": 감지된 페이지 번호 또는 null
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
paragraphs 추출 핵심 원칙:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 하나의 완전한 이야기/주제가 끝날 때까지 절대 자르지 마세요!
🎯 여러 문장이어도 같은 맥락이면 하나로 유지하세요!
🎯 문장부호(마침표, 따옴표)는 분리 기준이 아닙니다!

분리하는 경우 (이 경우에만):
✓ 완전히 다른 주제로 전환될 때
✓ 새로운 이야기/에피소드가 시작될 때
✓ 시간이나 장면이 바뀔 때
✓ 설명이 끝나고 새로운 논점이 시작될 때

반드시 함께 유지 (절대 분리 금지):
✗ 인용문 + 그 설명 ("그는 말했다. '내용'" → 하나로!)
✗ 예시 + 그에 대한 해석
✗ 질문 + 답변
✗ 이어지는 대화
✗ 원인 + 결과
✗ 나열된 항목 + 설명

예시:
❌ 나쁜 분리: ["그는 말했다.", "'좋은 생각이야.'", "나도 동의했다."]
✅ 좋은 분리: ["그는 말했다. '좋은 생각이야.' 나도 동의했다."]

길이:
• 최소 50자 이상 (짧게 자르지 마세요!)
• 평균 150-300자 권장
• 최대 500자까지 허용 (맥락이 이어지면 길어도 좋음)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. underlinedSentences: 
   - 밑줄이 그어진 문장만 정확히 추출합니다
   - 밑줄 친 부분만 추출하고, 앞뒤 맥락은 포함하지 마세요
   - 밑줄이 없으면 빈 배열 []을 반환합니다
   - ⚠️ 중요: underlinedSentences에 포함된 내용은 paragraphs에서 제외하세요

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
 * Gemini로 텍스트를 맥락 기반으로 분리
 * (이미지 없이 텍스트만 분석하므로 토큰 절약)
 */
async function analyzeContextWithGemini(text: string, apiKey: string): Promise<string[]> {
  const contextPrompt = `당신은 책 텍스트를 독자가 읽기 편한 단위로 분리하는 전문가입니다.
다음 텍스트를 자연스러운 의미 덩어리로 분리하세요.

핵심 원칙:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 하나의 완전한 이야기나 주제가 끝날 때까지 절대 자르지 마세요
2. 여러 문장이어도 같은 맥락이면 하나로 유지하세요
3. 문장부호(마침표, 따옴표)는 분리 기준이 아닙니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

분리 기준 (이 경우에만 분리):
✓ 완전히 다른 주제로 전환될 때
✓ 새로운 이야기/에피소드가 시작될 때  
✓ 시간이나 장면이 바뀔 때
✓ 설명이 끝나고 새로운 논점이 시작될 때

유지해야 할 것 (절대 분리하지 마세요):
✗ 인용문과 그 설명
✗ 예시와 그에 대한 해석
✗ 질문과 답변
✗ 대화가 이어지는 부분
✗ 원인과 결과
✗ 나열된 항목들과 그 설명

예시로 배우기:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 나쁜 분리 (너무 짧게 자름):
["뇌과학자 장동선 박사는 한 팟캐스트에 출연해 사람이 행복하기 위한 세 가지 조건을 이렇게 말한 적 있다.", "내가 스스로 선택한다는 자율성, 어떤 것을 배워가면서 더 나아진다고 느끼는 성취감, 마음 맞는 사람이 나를 알아주는 연결감.", "그러니까 지금의 삶은 이 세 가지를 가지런히 놓고 나를 조율해 보는 시간인지도 모르겠다."]

✅ 좋은 분리 (하나의 주제로 유지):
["뇌과학자 장동선 박사는 한 팟캐스트에 출연해 사람이 행복하기 위한 세 가지 조건을 이렇게 말한 적 있다. 내가 스스로 선택한다는 자율성, 어떤 것을 배워가면서 더 나아진다고 느끼는 성취감, 마음 맞는 사람이 나를 알아주는 연결감. 그러니까 지금의 삶은 이 세 가지를 가지런히 놓고 나를 조율해 보는 시간인지도 모르겠다."]

✅ 대화 포함 예시 (하나의 에피소드):
["좀 더 자본주의적으로 말하자면, 나는 이 시간을 돈으로 샀다고 생각한다. 내 동생이 번 돈이다. 지난여름 남쪽으로 휴가를 떠나는 차 안에서 문득 감격스러워져 말한 적 있다. 아, 일 걱정 없이 떠나는 여행이 얼마 만인지 모르겠어? 운전을 하던 강이 말했다. '그게 다 지금껏 열심히 일한 동생 덕분인 줄 알아. 고마워해야 돼.' 강의 논리는 이랬다. 과거의 나는 동생이고, 미래의 나는 언니인데..."]

길이 가이드:
• 최소 50자 이상 (짧게 자르지 마세요)
• 평균 150-300자 권장
• 최대 500자까지 허용 (맥락이 이어지면 길어도 좋음)
• 의미가 완결되는 것이 길이보다 중요

JSON 배열로만 응답하세요:
["단위1", "단위2", ...]

텍스트:
${text}`;

  try {
    const requestBody = {
      contents: [{ parts: [{ text: contextPrompt }] }],
      generationConfig: {
        temperature: 0.2, // 더 일관성 있게
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    console.log('Gemini로 맥락 분석 시작...');
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Gemini API 실패: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('맥락 분석 완료:', responseText.substring(0, 100));
    
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log('맥락 기반 분리 성공:', parsed.length, '개 단위');
      // 각 단위의 평균 길이 로깅
      const avgLength = parsed.reduce((sum, item) => sum + item.length, 0) / parsed.length;
      console.log('평균 단위 길이:', Math.round(avgLength), '자');
      return parsed;
    }
    
    // 배열이 아니거나 비어있으면 원본 반환
    throw new Error('유효하지 않은 응답');
  } catch (error) {
    console.warn('Gemini 맥락 분석 실패, 기본 분리로 폴백:', error);
    // 파싱 실패시 기존 방식으로 폴백 (문장부호 기준)
    return text.split(/[.!?。！？]\s+/).filter(s => s.trim().length > 5);
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
    console.log('온디바이스 OCR 성공, Gemini로 맥락 분석 중...');
    // ML Kit 결과를 Gemini로 맥락 분석 (이미지 없이 텍스트만 전송 - 토큰 절약)
    const contextualSentences = await analyzeContextWithGemini(onDeviceResult, apiKey);
    return contextualSentences.join('\n\n');
  }

  // 3단계: Gemini 폴백 (텍스트가 없거나 너무 짧은 경우)
  console.log('Gemini API 폴백 사용 (이미지 분석)');
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

/**
 * 바운딩 박스 OCR 수행 (직접 추출용 - ML Kit 온디바이스 OCR)
 * AI 분석 없이 순수 텍스트 인식 + 좌표만 반환
 * Development Build에서만 작동
 */
export async function performOCRWithBoundingBox(
  imageUri: string
): Promise<OCRWithBoundingBoxResult> {
  console.log('=== 바운딩 박스 OCR 시작 (ML Kit 온디바이스) ===');

  // 웹에서는 지원하지 않음
  if (Platform.OS === 'web') {
    throw new Error('웹 환경에서는 온디바이스 OCR을 지원하지 않습니다.');
  }

  try {
    // 이미지 리사이즈
    const resizedUri = await resizeImage(imageUri);

    // ML Kit 텍스트 인식
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const result = await TextRecognition.recognize(resizedUri);

    if (!result || !result.blocks || result.blocks.length === 0) {
      console.log('바운딩 박스 OCR: 텍스트 없음');
      return { blocks: [], imageWidth: MAX_IMAGE_SIZE, imageHeight: 0 };
    }

    console.log('ML Kit 블록 수:', result.blocks.length);

    // ML Kit 결과를 OCRWithBoundingBoxResult 형태로 변환
    const blocks: OCRTextBlock[] = result.blocks.map((block: any, blockIndex: number) => {
      const lines: OCRTextLine[] = (block.lines || []).map((line: any, lineIndex: number) => ({
        id: `line-${blockIndex}-${lineIndex}`,
        text: line.text || '',
        boundingBox: {
          x: line.frame?.x || 0,
          y: line.frame?.y || 0,
          width: line.frame?.width || 0,
          height: line.frame?.height || 0,
        },
      }));

      return {
        id: `block-${blockIndex}`,
        text: block.text || '',
        boundingBox: {
          x: block.frame?.x || 0,
          y: block.frame?.y || 0,
          width: block.frame?.width || 0,
          height: block.frame?.height || 0,
        },
        lines,
      };
    });

    console.log('바운딩 박스 OCR 완료 - 블록:', blocks.length);

    return {
      blocks,
      imageWidth: MAX_IMAGE_SIZE,
      imageHeight: 0,
    };
  } catch (error: any) {
    console.error('ML Kit OCR 실패:', error?.message || error);
    throw new Error('온디바이스 OCR 실패. Development Build가 필요합니다.');
  }
}
