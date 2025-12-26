import { BookSearchResult } from '@/types';

const NAVER_BOOKS_API_URL = 'https://openapi.naver.com/v1/search/book.json';

interface NaverBookItem {
  title: string;
  link: string;
  image: string;
  author: string;
  discount: string;
  publisher: string;
  pubdate: string;
  isbn: string;
  description: string;
}

interface NaverBooksResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverBookItem[];
}

/**
 * HTML 엔티티 디코딩
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]*>/g, ''); // HTML 태그 제거
}

/**
 * Naver Books API를 사용하여 책 검색
 */
export async function searchBooks(
  query: string,
  clientId: string,
  clientSecret: string,
  options?: {
    display?: number; // 검색 결과 개수 (기본 10, 최대 100)
    start?: number; // 검색 시작 위치 (기본 1, 최대 1000)
    sort?: 'sim' | 'date'; // 정렬 방식 (유사도순/출간일순)
  }
): Promise<BookSearchResult[]> {
  const { display = 10, start = 1, sort = 'sim' } = options || {};

  try {
    const params = new URLSearchParams({
      query: query.trim(),
      display: display.toString(),
      start: start.toString(),
      sort,
    });

    const response = await fetch(`${NAVER_BOOKS_API_URL}?${params}`, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Naver API error:', errorText);
      throw new Error(`책 검색 실패: ${response.status}`);
    }

    const data: NaverBooksResponse = await response.json();

    return data.items.map((item) => ({
      isbn: item.isbn.split(' ')[1] || item.isbn.split(' ')[0] || '', // ISBN-13 우선
      title: decodeHtmlEntities(item.title),
      author: decodeHtmlEntities(item.author),
      publisher: decodeHtmlEntities(item.publisher),
      cover_url: item.image,
      description: decodeHtmlEntities(item.description),
      published_date: item.pubdate,
    }));
  } catch (error) {
    console.error('Book search failed:', error);
    throw error;
  }
}

/**
 * ISBN으로 책 검색
 */
export async function searchByISBN(
  isbn: string,
  clientId: string,
  clientSecret: string
): Promise<BookSearchResult | null> {
  try {
    const results = await searchBooks(`isbn:${isbn}`, clientId, clientSecret, {
      display: 1,
    });
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('ISBN search failed:', error);
    return null;
  }
}

/**
 * 책 제목으로 정확한 매칭 검색
 */
export async function searchByTitle(
  title: string,
  clientId: string,
  clientSecret: string
): Promise<BookSearchResult[]> {
  try {
    const results = await searchBooks(title, clientId, clientSecret, {
      display: 5,
      sort: 'sim',
    });
    return results;
  } catch (error) {
    console.error('Title search failed:', error);
    return [];
  }
}

/**
 * 저자로 책 검색
 */
export async function searchByAuthor(
  author: string,
  clientId: string,
  clientSecret: string
): Promise<BookSearchResult[]> {
  try {
    const results = await searchBooks(author, clientId, clientSecret, {
      display: 10,
      sort: 'date',
    });
    return results;
  } catch (error) {
    console.error('Author search failed:', error);
    return [];
  }
}
