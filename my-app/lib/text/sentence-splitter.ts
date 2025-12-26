/**
 * 한국어 문장 분리 유틸리티
 *
 * OCR로 추출된 텍스트를 의미 있는 문장 단위로 분리합니다.
 */

// 문장 종결 패턴
const SENTENCE_ENDINGS = /([.!?。！？])\s*/g;

// 줄바꿈 패턴
const LINE_BREAK = /\n+/g;

// 따옴표 안의 문장 종결은 무시하기 위한 패턴
const QUOTED_TEXT = /"[^"]*"|'[^']*'|"[^"]*"|'[^']*'/g;

/**
 * 텍스트를 문장 단위로 분리
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 1. 줄바꿈을 공백으로 변환 (단, 여러 줄바꿈은 문단 구분으로 유지)
  let normalizedText = text
    .replace(/\n{2,}/g, '<<PARAGRAPH>>')
    .replace(/\n/g, ' ')
    .replace(/<<PARAGRAPH>>/g, '\n');

  // 2. 연속된 공백 정리
  normalizedText = normalizedText.replace(/\s+/g, ' ').trim();

  // 3. 문장 분리
  const sentences: string[] = [];

  // 문단별로 먼저 분리
  const paragraphs = normalizedText.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) continue;

    // 문장 종결 패턴으로 분리
    const parts = paragraph.split(SENTENCE_ENDINGS);

    let currentSentence = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // 종결 부호인 경우
      if (/^[.!?。！？]$/.test(part)) {
        currentSentence += part;
        if (currentSentence.trim().length > 0) {
          sentences.push(currentSentence.trim());
        }
        currentSentence = '';
      } else {
        currentSentence += part;
      }
    }

    // 마지막 문장 처리 (종결 부호 없이 끝난 경우)
    if (currentSentence.trim().length > 0) {
      sentences.push(currentSentence.trim());
    }
  }

  // 4. 너무 짧은 문장 필터링 (최소 5자 이상)
  return sentences.filter(s => s.length >= 5);
}

/**
 * 문장 정제 (불필요한 문자 제거)
 */
export function cleanSentence(sentence: string): string {
  return sentence
    // 앞뒤 공백 제거
    .trim()
    // 연속된 공백을 하나로
    .replace(/\s+/g, ' ')
    // 특수문자 정리 (따옴표, 괄호 등은 유지)
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ.,!?;:'"""''()[\]{}~@#$%&*\-_=+/\\<>]/g, '');
}

/**
 * 문장이 인용문인지 확인
 */
export function isQuotation(sentence: string): boolean {
  const trimmed = sentence.trim();

  // 따옴표로 시작하고 끝나는지 확인
  return (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  );
}

/**
 * 문장 병합 (짧은 문장들을 하나로)
 */
export function mergeSentences(sentences: string[], minLength: number = 20): string[] {
  const merged: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    if (buffer.length === 0) {
      buffer = sentence;
    } else if (buffer.length + sentence.length < minLength) {
      buffer += ' ' + sentence;
    } else {
      if (buffer.length >= minLength / 2) {
        merged.push(buffer);
      }
      buffer = sentence;
    }
  }

  if (buffer.length > 0) {
    merged.push(buffer);
  }

  return merged;
}

/**
 * 전체 텍스트 처리 파이프라인
 */
export function processOCRText(text: string): string[] {
  // 1. 문장 분리
  const sentences = splitIntoSentences(text);

  // 2. 각 문장 정제
  const cleanedSentences = sentences.map(cleanSentence);

  // 3. 빈 문장 필터링
  const filteredSentences = cleanedSentences.filter(s => s.length >= 5);

  // 4. 너무 짧은 문장 병합 (선택적)
  // return mergeSentences(filteredSentences);

  return filteredSentences;
}
