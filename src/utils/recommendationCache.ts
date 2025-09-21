import NodeCache from 'node-cache';

// 캐시 인스턴스 생성 (TTL: 1시간)
const cache = new NodeCache({ stdTTL: 3600 });

export interface CacheKey {
  userId: string;
  categories: string[];
  maxPrice: number;
  deliveryMethod: string;
  location: string; // "lat,lng" 형태로 반올림
}

/**
 * 캐시 키 생성
 */
export function generateCacheKey(
  userId: string,
  categories: string[],
  maxPrice: number,
  deliveryMethod: string,
  lat: number,
  lng: number
): string {
  // 위치는 소수점 2자리까지만 (약 1km 반경)
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;

  return `rec_${userId}_${categories.sort().join(',')}_${maxPrice}_${deliveryMethod}_${roundedLat},${roundedLng}`;
}

/**
 * 캐시에서 추천 결과 조회
 */
export function getCachedRecommendations(cacheKey: string): { [menuId: string]: { score: number; reason: string } } | null {
  return cache.get(cacheKey) || null;
}

/**
 * 추천 결과를 캐시에 저장
 */
export function setCachedRecommendations(
  cacheKey: string,
  recommendations: { [menuId: string]: { score: number; reason: string } },
  ttl: number = 3600 // 기본 1시간
): void {
  cache.set(cacheKey, recommendations, ttl);
}

/**
 * 사용자별 캐시 무효화 (주문 완료 시 호출)
 */
export function invalidateUserCache(userId: string): void {
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.startsWith(`rec_${userId}_`)) {
      cache.del(key);
    }
  });
}

/**
 * 캐시 통계 조회
 */
export function getCacheStats() {
  return cache.getStats();
}
