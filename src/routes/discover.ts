import express, { Request, Response } from 'express';
import { IUserDocument } from '../types/user.types';
import { Menu } from '../models/Menu';
import { Store } from '../models/Store';
import { haversineDistanceKm, formatKm } from '../utils/geo';
import { authenticateToken } from '../middleware/auth';
import {
  analyzeUserPreferences,
  getAIRecommendationScores,
  filterMenusForRecommendation,
  formatMenuRecommendation,
  AIRecommendRequest,
  MenuRecommendation
} from '../utils/aiRecommendation';

const router = express.Router();

type DiscoverType = 'pickup' | 'delivery';

// Request 인터페이스 확장
interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
}

const parseType = (value: any): DiscoverType => {
  return value === 'delivery' ? 'delivery' : 'pickup';
};

const isWithinTimeRange = (now: Date, start: Date, end: Date): boolean => {
  return now >= start && now <= end;
};

const isMealTimeWindow = (now: Date): 'breakfast' | 'lunch' | 'dinner' | null => {
  const hour = now.getHours();
  if (hour >= 6 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return null;
};

router.post('/', async (req: Request, res: Response) => {
  try {
    const { lag, lat, lng } = req.body || {};
    const latInput: number | undefined = typeof lag === 'number' ? lag : (typeof lat === 'number' ? lat : undefined);
    const lngInput: number | undefined = typeof lng === 'number' ? lng : undefined;

    if (latInput === undefined || lngInput === undefined) {
      return res.status(400).json({ success: false, message: 'lat, lng 좌표가 필요합니다.' });
    }

    const type = parseType(req.query.type);
    const place = typeof req.query.place === 'string' ? req.query.place : undefined;

    // limit 제거 - 모든 해당 데이터 반환

    const storeQuery: any = {};
    if (place) {
      storeQuery.place = { $regex: place, $options: 'i' };
    }
    // delivery 타입일 때만 배달 지원 매장으로 제한
    if (type === 'delivery') {
      storeQuery.supportsDelivery = true;
    }
    // pickup 타입일 때는 모든 매장 포함 (배달 지원 여부 상관없음)

    const stores = await Store.find(storeQuery).lean();
    const storeIds = stores.map(s => s._id);

    const menuQuery: any = { store: { $in: storeIds } };
    // delivery 타입일 때만 배달 가능한 메뉴로 제한
    if (type === 'delivery') {
      menuQuery.isDeliveryAvailable = true;
    }
    // pickup 타입일 때는 모든 메뉴 포함 (배달 가능 여부 상관없음)

    const menus = await Menu.find(menuQuery).lean();

    const storeMap = new Map<string, typeof stores[number]>();
    for (const s of stores) storeMap.set(String(s._id), s as any);

    const now = new Date();
    const currentMealWindow = isMealTimeWindow(now);

    type Item = {
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
      storeDistance: number; // km 단위
      pickupPrice?: number; // pickup일 때만 포함
    };

                const toItem = (m: any): Item | null => {
      const s = storeMap.get(String(m.store));
      if (!s) return null;

      // 거리 계산
      const dist = formatKm(haversineDistanceKm(latInput, lngInput, s.lat, s.lng));

      // 시간 포맷팅 함수
      const fmt = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const HH = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
      };

      const item: Item = {
        storeId: String(s._id),
        storeName: s.name,
        menuId: String(m._id),
        menuName: m.name,
        menuImageUrls: m.imageUrls || [],
        stockLeft: m.stockLeft,
        originalMenuPrice: m.originalPrice,
        discountedMenuPrice: m.discountedPrice,
        discountedPercentage: m.discountedPercentage,
        pickUpStartTime: fmt(new Date(m.pickupStartTime)),
        pickUpEndTime: fmt(new Date(m.pickupEndTime)),
        storeDistance: dist,
      };

      // pickup 타입일 때만 pickupPrice 포함
      if (type === 'pickup') {
        item.pickupPrice = m.pickupPrice;
      }

      return item;
    };

    // 섹션 구성
    const itemsAll = menus.map(toItem).filter((v): v is Item => v !== null);

    // nearBy: 거리순 정렬
    const nearBy = [...itemsAll]
      .sort((a, b) => a.storeDistance - b.storeDistance);

    // brandNew: 최근 생성순(메뉴 생성일 기준)
    const brandNew = [...itemsAll]
      .sort((a, b) => {
        const ma = menus.find(m => String(m._id) === a.menuId)!;
        const mb = menus.find(m => String(m._id) === b.menuId)!;
        return new Date(mb.createdAt).getTime() - new Date(ma.createdAt).getTime();
      });

    // lowInStock: stockLeft가 작은 순서
    const lowInStock = [...itemsAll]
      .filter(x => x.stockLeft > 0)
      .sort((a, b) => a.stockLeft - b.stockLeft);

    // mealTime: 현재 시간대가 아니면 빈 배열
    let mealTime: Item[] = [];
    if (currentMealWindow) {
      const [startHour, endHour] =
        currentMealWindow === 'breakfast' ? [6, 10] :
        currentMealWindow === 'lunch' ? [10, 14] : [17, 21];

      const start = new Date(now);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(now);
      end.setHours(endHour, 0, 0, 0);

      mealTime = menus
        .filter(m => {
          const s = new Date(m.pickupStartTime);
          const e = new Date(m.pickupEndTime);
          return (s <= end && e >= start); // 시간대와 교집합
        })
        .map(toItem)
        .filter((v): v is Item => v !== null);
    }

    // sweet: 카테고리 기준 '디저트' 또는 '빵'
    const sweet = menus
      .filter(m => m.category === '디저트' || m.category === '빵')
      .map(toItem)
      .filter((v): v is Item => v !== null);

    // pickUpRightNow: 지금 수령 가능 시간대이고 재고가 있는 메뉴
    const pickUpRightNow = menus
      .filter(m => m.stockLeft > 0 && isWithinTimeRange(now, new Date(m.pickupStartTime), new Date(m.pickupEndTime)))
      .map(toItem)
      .filter((v): v is Item => v !== null);

    return res.json({
      success: true,
      totalMenus: itemsAll.length,
      nearBy: nearBy.slice(0, 10), // 처음 3개만
      brandNew: brandNew.slice(0, 10),
      lowInStock: lowInStock.slice(0, 10),
      mealTime: mealTime.slice(0, 10),
      sweet: sweet.slice(0, 10),
      pickUpRightNow: pickUpRightNow.slice(0, 10),
    });
  } catch (error) {
    console.error('❌ /discover 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * @route   GET /discover/store/:storeId/menus
 * @desc    특정 스토어의 모든 메뉴 조회
 * @access  Public
 */
router.get('/store/:storeId/menus', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { lat, lng } = req.query;

    // storeId로 스토어 정보 조회
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return res.status(404).json({ success: false, message: '스토어를 찾을 수 없습니다.' });
    }

    // 해당 스토어의 모든 메뉴 조회
    const menus = await Menu.find({ store: storeId }).lean();

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    // 거리 계산 (위도/경도가 제공된 경우)
    let storeDistance = 0;
    if (lat && lng && typeof lat === 'string' && typeof lng === 'string') {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        storeDistance = formatKm(haversineDistanceKm(latNum, lngNum, store.lat, store.lng));
      }
    }

    // 메뉴 정보 변환
    const menuItems = menus.map(menu => ({
      storeId: String(store._id),
      storeName: store.name,
      menuId: String(menu._id),
      menuName: menu.name,
      menuImageUrls: menu.imageUrls || [],
      stockLeft: menu.stockLeft,
      originalMenuPrice: menu.originalPrice,
      discountedMenuPrice: menu.discountedPrice,
      discountedPercentage: menu.discountedPercentage,
      pickUpStartTime: fmt(new Date(menu.pickupStartTime)),
      pickUpEndTime: fmt(new Date(menu.pickupEndTime)),
      storeDistance: storeDistance,
      pickupPrice: menu.pickupPrice,
    }));

    return res.json({
      success: true,
      storeId: String(store._id),
      storeName: store.name,
      storeAddress: store.address,
      storePhoneNumber: store.phoneNumber,
      storeDistance: storeDistance,
      totalMenus: menuItems.length,
      menus: menuItems,
    });

  } catch (error) {
    console.error('❌ /discover/store/:storeId/menus 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * @route   GET /discover/menu/:menuId
 * @desc    메뉴 상세 정보 조회
 * @access  Public
 */
router.get('/menu/:menuId', async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;

    const menu = await Menu.findById(menuId).populate('store').lean();
    if (!menu) {
      return res.status(404).json({ success: false, message: '메뉴를 찾을 수 없습니다.' });
    }

    const store = menu.store as any;

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    const response = {
      success: true,
      storeId: String(store._id),
      storeName: store.name,
      storeOpenTime: fmt(new Date(store.openTime)),
      storeCloseTime: fmt(new Date(store.closeTime)),
      storeAddress: store.address,
      storeLat: store.lat,
      storeLng: store.lng,
      storePhoneNumber: store.phoneNumber,
      menuId: String(menu._id),
      menuName: menu.name,
      menuImageUrls: menu.imageUrls || [],
      menuDescription: menu.description,
      stockLeft: menu.stockLeft,
      originalMenuPrice: menu.originalPrice,
      discountedMenuPrice: menu.discountedPrice,
      discountedPercentage: menu.discountedPercentage,
      gramPerUnit: menu.gramPerUnit, // 메뉴 1개당 그램수
      pickupPrice: menu.pickupPrice, // 픽업시 금액
      deliveryPrice: menu.deliveryPrice || null, // 배달비
      totalSoldCount: menu.totalSoldCount, // 총 판매 수량
      pickUpStartTime: fmt(new Date(menu.pickupStartTime)),
      pickUpEndTime: fmt(new Date(menu.pickupEndTime)),
      deliveryStartTime: menu.deliveryStartTime ? fmt(new Date(menu.deliveryStartTime)) : null,
      isDeliveryAvailable: menu.isDeliveryAvailable, // 배달 가능 여부
      supportsDelivery: store.supportsDelivery, // 매장 배달 지원 여부
    };

    return res.json(response);
  } catch (error) {
    console.error('❌ /discover/menu/:menuId 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * @route   GET /discover/search
 * @desc    메뉴명과 매장명에서 검색어가 포함된 결과 반환
 * @access  Public
 * @query   query (필수)
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'query 파라미터가 필요합니다.'
      });
    }

    const searchText = query.trim();

    // 매장명에서 검색어가 포함된 매장들을 찾음
    const stores = await Store.find({
      name: { $regex: searchText, $options: 'i' }
    }).lean();
    const storeIds = stores.map(s => s._id);

    // 메뉴명 또는 해당 매장의 메뉴들을 찾음
    const menus = await Menu.find({
      $or: [
        { name: { $regex: searchText, $options: 'i' } }, // 메뉴명에 검색어 포함
        { store: { $in: storeIds } } // 매장명에 검색어가 포함된 매장의 모든 메뉴
      ]
    }).populate('store').lean();

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    const results = menus.map(menu => {
      const store = menu.store as any;
      return {
        storeId: String(store._id),
        storeName: store.name,
        menuId: String(menu._id),
        menuName: menu.name,
        menuImageUrls: menu.imageUrls || [],
        stockLeft: menu.stockLeft,
        originalMenuPrice: menu.originalPrice,
        discountedMenuPrice: menu.discountedPrice,
        discountedPercentage: menu.discountedPercentage,
        pickUpStartTime: fmt(new Date(menu.pickupStartTime)),
        pickUpEndTime: fmt(new Date(menu.pickupEndTime)),
        storeDistance: 0, // 검색에서는 거리 정보 없음
        category: menu.category || null,
        foodType: menu.foodType || null,
        supportsDelivery: store.supportsDelivery,
        gramPerUnit: menu.gramPerUnit,
        pickupPrice: menu.pickupPrice,
        totalSoldCount: menu.totalSoldCount,
      };
    });

    return res.json({
      success: true,
      query: searchText,
      count: results.length,
      results,
    });

  } catch (error) {
    console.error('❌ /discover/search 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * @route   POST /discover/filter
 * @desc    복합 필터링으로 메뉴 검색
 * @access  Public
 * @body    query, foodType, category, priceRange, deliveryMethod, sortBy, lat, lng
 */
router.post('/filter', async (req: Request, res: Response) => {
  try {
    const {
      query,
      foodType,
      category,
      priceRange,
      deliveryMethod,
      sortBy,
      lat,
      lng
    } = req.body;

    // 메뉴 검색 조건 구성
    const menuQuery: any = {};

    // 텍스트 검색 (선택사항)
    if (query && typeof query === 'string') {
      const searchText = query.trim();
      // 매장명에서 검색어가 포함된 매장들을 찾음
      const stores = await Store.find({
        name: { $regex: searchText, $options: 'i' }
      }).lean();
      const storeIds = stores.map(s => s._id);

      menuQuery.$or = [
        { name: { $regex: searchText, $options: 'i' } }, // 메뉴명에 검색어 포함
        { store: { $in: storeIds } } // 매장명에 검색어가 포함된 매장의 모든 메뉴
      ];
    }

    // 음식 타입 필터
    if (foodType && ['식사', '디저트'].includes(foodType)) {
      menuQuery.foodType = foodType;
    }

    // 카테고리 필터
    if (category && typeof category === 'string') {
      menuQuery.category = category;
    }

    // 가격대 필터
    if (priceRange && typeof priceRange === 'string') {
      const priceRanges: { [key: string]: any } = {
        '4,000원 이하': { $lte: 4000 },
        '6,000원 이하': { $lte: 6000 },
        '8,000원 이하': { $lte: 8000 },
        '10,000원 이하': { $lte: 10000 },
        '12,000원 이하': { $lte: 12000 },
        '12,000원 이상': { $gte: 12000 }
      };

      if (priceRanges[priceRange]) {
        menuQuery.discountedPrice = priceRanges[priceRange];
      }
    }

    // 배달 필터 (deliveryMethod가 '배달'인 경우)
    if (deliveryMethod === '배달') {
      menuQuery.isDeliveryAvailable = true;
    }

    // 메뉴 검색 수행
    const menus = await Menu.find(menuQuery).populate('store').lean();

    const now = new Date();

    // 수령방법 필터 적용 (지금바로/나중에)
    let filteredMenus = menus;
    if (deliveryMethod === '지금바로') {
      filteredMenus = menus.filter(menu => {
        const pickupStart = new Date(menu.pickupStartTime);
        const pickupEnd = new Date(menu.pickupEndTime);
        const isPickupNow = now >= pickupStart && now <= pickupEnd;

        // 배달 가능한 메뉴의 경우 배달 시간도 확인
        let isDeliveryNow = false;
        if (menu.isDeliveryAvailable && menu.deliveryStartTime) {
          const deliveryStart = new Date(menu.deliveryStartTime);
          isDeliveryNow = now >= deliveryStart && now <= pickupEnd; // 픽업 종료시간까지
        }

        return isPickupNow || isDeliveryNow;
      });
    } else if (deliveryMethod === '나중에') {
      filteredMenus = menus.filter(menu => {
        const pickupStart = new Date(menu.pickupStartTime);
        const pickupEnd = new Date(menu.pickupEndTime);
        const isPickupNow = now >= pickupStart && now <= pickupEnd;

        // 배달 가능한 메뉴의 경우 배달 시간도 확인
        let isDeliveryNow = false;
        if (menu.isDeliveryAvailable && menu.deliveryStartTime) {
          const deliveryStart = new Date(menu.deliveryStartTime);
          isDeliveryNow = now >= deliveryStart && now <= pickupEnd;
        }

        return !isPickupNow && !isDeliveryNow;
      });
    }

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    // 결과 변환
    let results = filteredMenus.map(menu => {
      const store = menu.store as any;

      // 거리 계산 (좌표가 있는 경우에만)
      let storeDistance = 0;
      if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
        storeDistance = formatKm(haversineDistanceKm(lat, lng, store.lat, store.lng));
      }

      return {
        storeId: String(store._id),
        storeName: store.name,
        menuId: String(menu._id),
        menuName: menu.name,
        menuImageUrls: menu.imageUrls || [],
        stockLeft: menu.stockLeft,
        originalMenuPrice: menu.originalPrice,
        discountedMenuPrice: menu.discountedPrice,
        discountedPercentage: menu.discountedPercentage,
        pickUpStartTime: fmt(new Date(menu.pickupStartTime)),
        pickUpEndTime: fmt(new Date(menu.pickupEndTime)),
        storeDistance,
        category: menu.category || null,
        foodType: menu.foodType || null,
        supportsDelivery: store.supportsDelivery,
        gramPerUnit: menu.gramPerUnit,
        pickupPrice: menu.pickupPrice,
        totalSoldCount: menu.totalSoldCount,
      };
    });

    // 정렬 적용
    if (sortBy === '인기순') {
      results.sort((a, b) => b.totalSoldCount - a.totalSoldCount);
    } else if (sortBy === '가격낮은순') {
      results.sort((a, b) => a.discountedMenuPrice - b.discountedMenuPrice);
    } else if (sortBy === '가격높은순') {
      results.sort((a, b) => b.discountedMenuPrice - a.discountedMenuPrice);
    } else if (sortBy === '거리순') {
      results.sort((a, b) => a.storeDistance - b.storeDistance);
    }
    // 기본값은 정렬하지 않음

    return res.json({
      success: true,
      filters: {
        query: query || null,
        foodType: foodType || null,
        category: category || null,
        priceRange: priceRange || null,
        deliveryMethod: deliveryMethod || null,
        sortBy: sortBy || null,
      },
      count: results.length,
      results,
    });

  } catch (error) {
    console.error('❌ /discover/filter 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * @route   POST /discover/ai-recommend
 * @desc    ChatGPT AI를 활용한 개인화 메뉴 추천
 * @access  Private (JWT 토큰 필요)
 */
router.post('/ai-recommend', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const userIdString = String(userId);

    const { categories, maxPrice, deliveryMethod, lat, lng, limit = 10 } = req.body;

    // 필수 파라미터 검증
    if (!categories || !maxPrice || !deliveryMethod || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'categories, maxPrice, deliveryMethod, lat, lng는 필수 항목입니다.',
        required: {
          categories: '카테고리 배열 (["일식", "한식"] 형태)',
          maxPrice: '최대 가격 (숫자)',
          deliveryMethod: '수령 방법 (all, delivery, pickup)',
          lat: '위도 (숫자)',
          lng: '경도 (숫자)',
          limit: '추천 개수 (선택사항, 기본값: 10)'
        }
      });
    }

    // 카테고리 배열 유효성 검증
    const validCategories = [
      '일식','한식','중식','양식','빵','디저트','스페인 요리','멕시코 요리','패스트 푸드','건강식','비건','할랄','인도음식'
    ];

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'categories는 최소 하나 이상의 카테고리를 포함한 배열이어야 합니다.',
        validCategories
      });
    }

    const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
    if (invalidCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: `유효하지 않은 카테고리가 포함되어 있습니다: ${invalidCategories.join(', ')}`,
        validCategories
      });
    }

    // 수령 방법 유효성 검증
    if (!['all', 'delivery', 'pickup'].includes(deliveryMethod)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 수령 방법입니다. 사용 가능한 값: all, delivery, pickup'
      });
    }

    const request: AIRecommendRequest = {
      categories,
      maxPrice: Number(maxPrice),
      deliveryMethod,
      lat: Number(lat),
      lng: Number(lng),
      limit: Number(limit)
    };

    console.log(`🤖 AI 추천 시작 - 사용자: ${userIdString}, 카테고리: ${categories.join(', ')}, 최대가격: ${maxPrice}원`);

    // 1. 사용자 선호도 분석
    console.log('📊 사용자 주문 이력 분석 중...');
    const userPreference = await analyzeUserPreferences(userIdString);

    // 2. 조건에 맞는 메뉴 필터링
    console.log('🔍 메뉴 필터링 중...');
    const filteredMenus = await filterMenusForRecommendation(request);

    if (filteredMenus.length === 0) {
      return res.json({
        success: true,
        message: '조건에 맞는 메뉴가 없습니다.',
        userProfile: {
          favoriteCategories: userPreference.favoriteCategories,
          avgOrderPrice: userPreference.avgOrderPrice,
          totalOrders: userPreference.totalOrders
        },
        request,
        recommendations: []
      });
    }

    // 3. ChatGPT AI 점수 계산
    console.log(`🤖 ChatGPT AI 분석 중... (${filteredMenus.length}개 메뉴)`);
    const aiScores = await getAIRecommendationScores(filteredMenus, userPreference, request);

    // 4. 점수 기반 정렬 및 포맷팅
    const recommendations: MenuRecommendation[] = filteredMenus
      .map(menu => {
        const menuId = String(menu._id);
        const scoreData = aiScores[menuId] || { score: 50, reason: '기본 추천' };
        return formatMenuRecommendation(menu, scoreData.score, scoreData.reason);
      })
      .sort((a, b) => b.aiScore - a.aiScore) // AI 점수 내림차순
      .slice(0, request.limit); // 요청한 개수만큼 제한

    console.log(`✅ AI 추천 완료 - ${recommendations.length}개 추천`);

    return res.json({
      success: true,
      message: `AI가 분석한 ${categories.join(', ')} 카테고리 추천 결과입니다.`,
      userProfile: {
        favoriteCategories: userPreference.favoriteCategories,
        avgOrderPrice: userPreference.avgOrderPrice,
        preferredOrderType: userPreference.preferredOrderType,
        totalOrders: userPreference.totalOrders,
        recentOrders: userPreference.recentOrders.slice(0, 3) // 최근 3개만 반환
      },
      request: {
        categories: request.categories,
        maxPrice: request.maxPrice,
        deliveryMethod: request.deliveryMethod,
        limit: request.limit
      },
      stats: {
        totalFiltered: filteredMenus.length,
        recommended: recommendations.length,
        avgScore: Math.round(recommendations.reduce((sum, r) => sum + r.aiScore, 0) / recommendations.length) || 0
      },
      recommendations
    });

  } catch (error) {
    console.error('❌ AI 추천 시스템 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'AI 추천 시스템에 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
});

export default router;
