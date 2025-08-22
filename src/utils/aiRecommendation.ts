import OpenAI from 'openai';
import { Order } from '../models/Order';
import { Menu } from '../models/Menu';
import { Store } from '../models/Store';
import { haversineDistanceKm } from './geo';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 사용자 선호도 인터페이스
export interface UserPreference {
  favoriteCategories: string[];
  avgOrderPrice: number;
  preferredOrderType: 'pickup' | 'delivery' | 'both';
  frequentOrderTimes: string[];
  recentOrders: {
    menuName: string;
    category: string;
    price: number;
    orderType: string;
  }[];
  totalOrders: number;
}

// AI 추천 요청 인터페이스
export interface AIRecommendRequest {
  categories: string[]; // 단일 카테고리에서 배열로 변경
  maxPrice: number;
  deliveryMethod: 'all' | 'delivery' | 'pickup';
  lat: number;
  lng: number;
  limit?: number;
}

// 메뉴 추천 결과 인터페이스
export interface MenuRecommendation {
  storeId: string;
  storeName: string;
  menuId: string;
  menuName: string;
  menuImageUrls: string[];
  stockLeft: number;
  originalMenuPrice: number;
  discountedMenuPrice: number;
  discountedPercentage: number;
  pickUpStartTime: string;
  pickUpEndTime: string;
  storeDistance: number;
  pickupPrice: number;
  aiScore: number;
  aiReason: string;
}

/**
 * 사용자의 주문 이력을 분석하여 선호도를 추출합니다.
 */
export async function analyzeUserPreferences(userId: string): Promise<UserPreference> {
  try {
    // 사용자의 최근 3개월 주문 이력 조회
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const orders = await Order.find({
      userId,
      orderDate: { $gte: threeMonthsAgo },
      status: { $in: ['completed'] } // 완료된 주문만
    })
    .populate('items.menuId')
    .sort({ orderDate: -1 })
    .limit(50) // 최근 50개 주문
    .lean();

    if (orders.length === 0) {
      // 주문 이력이 없는 경우 기본값 반환
      return {
        favoriteCategories: [],
        avgOrderPrice: 15000,
        preferredOrderType: 'both',
        frequentOrderTimes: [],
        recentOrders: [],
        totalOrders: 0
      };
    }

    // 카테고리별 주문 횟수 계산
    const categoryCount: { [key: string]: number } = {};
    const orderTypeCount: { pickup: number; delivery: number } = { pickup: 0, delivery: 0 };
    const timeCount: { [key: string]: number } = {};
    let totalAmount = 0;
    const recentOrders: UserPreference['recentOrders'] = [];

    for (const order of orders) {
      totalAmount += order.finalAmount;
      orderTypeCount[order.orderType]++;

      // 주문 시간대 분석
      const hour = new Date(order.orderDate).getHours();
      const timeSlot = hour < 10 ? 'morning' : hour < 14 ? 'lunch' : hour < 18 ? 'afternoon' : 'evening';
      timeCount[timeSlot] = (timeCount[timeSlot] || 0) + 1;

      // 각 주문의 메뉴들 분석
      for (const item of order.items) {
        const menuId = typeof item.menuId === 'string' ? item.menuId : item.menuId?._id;

        // 메뉴 정보 조회
        const menu = await Menu.findById(menuId).lean();
        if (menu && menu.category) {
          categoryCount[menu.category] = (categoryCount[menu.category] || 0) + 1;

          // 최근 주문 정보 저장 (최대 10개)
          if (recentOrders.length < 10) {
            recentOrders.push({
              menuName: item.menuName,
              category: menu.category,
              price: item.unitPrice,
              orderType: order.orderType
            });
          }
        }
      }
    }

    // 선호 카테고리 추출 (상위 3개)
    const favoriteCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    // 선호 주문 방식
    const preferredOrderType = orderTypeCount.pickup > orderTypeCount.delivery
      ? 'pickup'
      : orderTypeCount.delivery > orderTypeCount.pickup
        ? 'delivery'
        : 'both';

    // 자주 주문하는 시간대 (상위 2개)
    const frequentOrderTimes = Object.entries(timeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([time]) => time);

    return {
      favoriteCategories,
      avgOrderPrice: Math.round(totalAmount / orders.length),
      preferredOrderType,
      frequentOrderTimes,
      recentOrders,
      totalOrders: orders.length
    };

  } catch (error) {
    console.error('사용자 선호도 분석 오류:', error);
    // 오류 시 기본값 반환
    return {
      favoriteCategories: [],
      avgOrderPrice: 15000,
      preferredOrderType: 'both',
      frequentOrderTimes: [],
      recentOrders: [],
      totalOrders: 0
    };
  }
}

/**
 * ChatGPT를 사용하여 메뉴 추천 점수를 계산합니다.
 */
export async function getAIRecommendationScores(
  menus: any[],
  userPreference: UserPreference,
  request: AIRecommendRequest
): Promise<{ [menuId: string]: { score: number; reason: string } }> {
  try {
    if (menus.length === 0) {
      return {};
    }

    // 메뉴 정보를 ChatGPT에 전달할 형태로 변환
    const menuInfo = menus.map(menu => ({
      id: menu._id,
      name: menu.name,
      category: menu.category,
      price: menu.discountedPrice,
      originalPrice: menu.originalPrice,
      discountPercent: menu.discountedPercentage,
      description: menu.description
    }));

    const prompt = `
당신은 음식 추천 전문 AI입니다. 사용자의 과거 주문 이력과 현재 요청을 바탕으로 각 메뉴의 추천 점수를 매겨주세요.

## 사용자 프로필
- 선호 카테고리: ${userPreference.favoriteCategories.join(', ') || '없음'}
- 평균 주문 금액: ${userPreference.avgOrderPrice.toLocaleString()}원
- 선호 주문 방식: ${userPreference.preferredOrderType}
- 총 주문 횟수: ${userPreference.totalOrders}회
- 최근 주문한 메뉴: ${userPreference.recentOrders.map(o => `${o.menuName}(${o.category})`).join(', ') || '없음'}

## 현재 요청
- 원하는 카테고리: ${request.categories.join(', ')}
- 최대 가격: ${request.maxPrice.toLocaleString()}원
- 수령 방법: ${request.deliveryMethod}

## 평가 기준 (100점 만점)
1. 카테고리 매칭 (30점): 요청한 카테고리와 일치도
2. 가격 적정성 (25점): 사용자 평균 주문 금액 대비 적정성
3. 선호도 일치 (25점): 과거 주문 패턴과의 일치성
4. 가치 제안 (20점): 할인율, 특별함 등

## 메뉴 목록
${menuInfo.map((menu, index) =>
  `${index + 1}. ${menu.name} (${menu.category}) - ${menu.price.toLocaleString()}원 (${menu.discountPercent}% 할인)`
).join('\n')}

각 메뉴에 대해 다음 JSON 형식으로 점수와 추천 이유를 제공해주세요:
{
  "menu_id": {
    "score": 85,
    "reason": "사용자가 선호하는 일식 카테고리이며, 평균 주문 금액과 비슷한 가격대입니다. 높은 할인율로 가성비가 우수합니다."
  }
}

중요: 반드시 유효한 JSON 형식으로만 응답하고, 다른 텍스트는 포함하지 마세요.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 음식 추천 전문가입니다. 사용자의 선호도를 분석하여 정확한 점수와 추천 이유를 제공해야 합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('ChatGPT 응답이 비어있습니다.');
    }

    // JSON 파싱
    const scores = JSON.parse(responseText);

    // 메뉴 ID를 실제 ObjectId로 매핑
    const result: { [menuId: string]: { score: number; reason: string } } = {};
    menuInfo.forEach((menu, index) => {
      const key = `menu_${index + 1}` in scores ? `menu_${index + 1}` : menu.id;
      if (scores[key] || scores[menu.id]) {
        const scoreData = scores[key] || scores[menu.id];
        result[menu.id] = {
          score: Math.min(100, Math.max(0, scoreData.score)),
          reason: scoreData.reason || '추천 이유 없음'
        };
      }
    });

    return result;

  } catch (error) {
    console.error('ChatGPT API 호출 오류:', error);

    // 오류 시 기본 점수 반환 (카테고리 매칭과 가격 기반)
    const fallbackScores: { [menuId: string]: { score: number; reason: string } } = {};

    menus.forEach(menu => {
      let score = 50; // 기본 점수
      let reason = '기본 추천';

      // 카테고리 매칭
      if (request.categories.includes(menu.category)) {
        score += 30;
        reason = '요청하신 카테고리와 일치합니다';
      }

      // 가격 적정성
      if (menu.discountedPrice <= request.maxPrice) {
        score += 20;
        if (menu.discountedPrice <= userPreference.avgOrderPrice) {
          score += 10;
          reason += ', 적정한 가격대입니다';
        }
      }

      // 할인율 보너스
      if (menu.discountedPercentage > 50) {
        score += 10;
        reason += ', 높은 할인율로 가성비가 좋습니다';
      }

      fallbackScores[menu._id] = {
        score: Math.min(100, Math.max(0, score)),
        reason
      };
    });

    return fallbackScores;
  }
}

/**
 * 위치, 카테고리, 가격, 수령방법에 따라 메뉴를 필터링합니다.
 */
export async function filterMenusForRecommendation(
  request: AIRecommendRequest
): Promise<any[]> {
  try {
    // 매장 필터링
    const storeQuery: any = {};
    if (request.deliveryMethod === 'delivery') {
      storeQuery.supportsDelivery = true;
    }

    const stores = await Store.find(storeQuery).lean();
    const storeIds = stores.map(s => s._id);

    // 메뉴 필터링
    const menuQuery: any = {
      store: { $in: storeIds },
      stockLeft: { $gt: 0 }, // 재고가 있는 것만
      category: { $in: request.categories }, // 요청한 카테고리들 (배열로 변경)
      discountedPrice: { $lte: request.maxPrice } // 최대 가격 이하
    };

    // 배달 방식에 따른 추가 필터링
    if (request.deliveryMethod === 'delivery') {
      menuQuery.isDeliveryAvailable = true;
    }

    const menus = await Menu.find(menuQuery).lean();

    // 매장 정보와 함께 메뉴 정보 조합
    const storeMap = new Map<string, any>();
    stores.forEach(store => {
      storeMap.set(String(store._id), store);
    });

    const menusWithStore = menus.map(menu => {
      const store = storeMap.get(String(menu.store));
      if (!store) return null;

      // 거리 계산
      const distance = haversineDistanceKm(
        request.lat,
        request.lng,
        store.lat,
        store.lng
      );

      return {
        ...menu,
        storeInfo: store,
        distance
      };
    }).filter(Boolean);

    // 거리순으로 정렬 (30km 이내만)
    return menusWithStore
      .filter((menu): menu is NonNullable<typeof menu> => menu !== null && menu.distance <= 30)
      .sort((a, b) => a.distance - b.distance);

  } catch (error) {
    console.error('메뉴 필터링 오류:', error);
    return [];
  }
}

/**
 * 메뉴 데이터를 응답 형식으로 변환합니다.
 */
export function formatMenuRecommendation(
  menu: any,
  aiScore: number,
  aiReason: string
): MenuRecommendation {
  return {
    storeId: String(menu.store),
    storeName: menu.storeInfo.name,
    menuId: String(menu._id),
    menuName: menu.name,
    menuImageUrls: menu.imageUrls || [],
    stockLeft: menu.stockLeft,
    originalMenuPrice: menu.originalPrice,
    discountedMenuPrice: menu.discountedPrice,
    discountedPercentage: menu.discountedPercentage,
    pickUpStartTime: menu.pickupStartTime.toISOString().replace('T', ' ').slice(0, 19),
    pickUpEndTime: menu.pickupEndTime.toISOString().replace('T', ' ').slice(0, 19),
    storeDistance: Math.round(menu.distance * 100) / 100,
    pickupPrice: menu.pickupPrice,
    aiScore: Math.round(aiScore),
    aiReason: aiReason
  };
}
