import { UserPreference, AIRecommendRequest } from './aiRecommendation';

/**
 * 로컬 스코어링 알고리즘 - AI API 없이 추천 점수 계산
 */
export function calculateLocalScore(
  menu: any,
  userPreference: UserPreference,
  request: AIRecommendRequest
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. 카테고리 매칭 (0-30점)
  if (request.categories.includes(menu.category)) {
    score += 30;
    reasons.push('요청 카테고리 일치');

    // 선호 카테고리 보너스
    if (userPreference.favoriteCategories.includes(menu.category)) {
      score += 10;
      reasons.push('선호 카테고리');
    }
  } else if (userPreference.favoriteCategories.includes(menu.category)) {
    score += 15;
    reasons.push('과거 선호 카테고리');
  }

  // 2. 가격 적정성 (0-25점)
  const priceRatio = menu.discountedPrice / userPreference.avgOrderPrice;
  if (priceRatio <= 0.7) {
    score += 25; // 평균보다 훨씬 저렴
    reasons.push('매우 저렴한 가격');
  } else if (priceRatio <= 1.0) {
    score += 20; // 평균 이하
    reasons.push('적정 가격');
  } else if (priceRatio <= 1.3) {
    score += 15; // 평균보다 약간 비쌈
    reasons.push('합리적 가격');
  } else if (priceRatio <= 1.5) {
    score += 10; // 비쌈
  } else {
    score += 5; // 매우 비쌈
  }

  // 3. 할인율 보너스 (0-20점)
  const discountPercent = menu.discountedPercentage;
  if (discountPercent >= 70) {
    score += 20;
    reasons.push(`초대형 할인 ${discountPercent}%`);
  } else if (discountPercent >= 50) {
    score += 15;
    reasons.push(`대형 할인 ${discountPercent}%`);
  } else if (discountPercent >= 30) {
    score += 10;
    reasons.push(`할인 ${discountPercent}%`);
  } else if (discountPercent >= 10) {
    score += 5;
    reasons.push(`소형 할인 ${discountPercent}%`);
  }

  // 4. 거리 보너스 (0-15점)
  if (menu.distance <= 1) {
    score += 15;
    reasons.push('매우 가까운 거리');
  } else if (menu.distance <= 3) {
    score += 12;
    reasons.push('가까운 거리');
  } else if (menu.distance <= 5) {
    score += 8;
    reasons.push('적당한 거리');
  } else if (menu.distance <= 10) {
    score += 5;
    reasons.push('보통 거리');
  }

  // 5. 재고량 보너스 (0-10점)
  if (menu.stockLeft >= 10) {
    score += 10;
    reasons.push('재고 충분');
  } else if (menu.stockLeft >= 5) {
    score += 7;
    reasons.push('재고 양호');
  } else if (menu.stockLeft >= 2) {
    score += 5;
    reasons.push('재고 부족');
  } else {
    score += 2;
    reasons.push('재고 매우 부족');
  }

  // 6. 시간대 매칭 (0-10점)
  const currentHour = new Date().getHours();
  const timeSlot = currentHour < 10 ? 'morning' :
                   currentHour < 14 ? 'lunch' :
                   currentHour < 18 ? 'afternoon' : 'evening';

  if (userPreference.frequentOrderTimes.includes(timeSlot)) {
    score += 10;
    reasons.push('선호 시간대');
  }

  // 7. 최근 주문 패턴 보너스 (0-10점)
  const recentMenus = userPreference.recentOrders.map(o => o.menuName.toLowerCase());
  if (recentMenus.some(recent => menu.name.toLowerCase().includes(recent.split(' ')[0]))) {
    score += 5;
    reasons.push('유사한 메뉴 경험');
  }

  // 8. 주문 방식 선호도 (0-5점)
  if (request.deliveryMethod === userPreference.preferredOrderType ||
      userPreference.preferredOrderType === 'both') {
    score += 5;
    reasons.push('선호 주문 방식');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: reasons.join(', ') || '기본 추천'
  };
}

/**
 * 개선된 추천 시스템 - AI 없이 로컬 계산만 사용
 */
export function getLocalRecommendationScores(
  menus: any[],
  userPreference: UserPreference,
  request: AIRecommendRequest
): { [menuId: string]: { score: number; reason: string } } {
  const scores: { [menuId: string]: { score: number; reason: string } } = {};

  menus.forEach(menu => {
    const result = calculateLocalScore(menu, userPreference, request);
    scores[menu._id] = result;
  });

  return scores;
}


