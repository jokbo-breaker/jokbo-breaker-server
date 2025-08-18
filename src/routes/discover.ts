import express, { Request, Response } from 'express';
import { Menu } from '../models/Menu';
import { Store } from '../models/Store';
import { haversineDistanceKm, formatKm } from '../utils/geo';

const router = express.Router();

type DiscoverType = 'pickup' | 'delivery';

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
      return res.status(400).json({ success: false, message: 'lag, lng 좌표가 필요합니다.' });
    }

    const type = parseType(req.query.type);
    const place = typeof req.query.place === 'string' ? req.query.place : undefined;

    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));

    const storeQuery: any = {};
    if (place) {
      storeQuery.place = { $regex: place, $options: 'i' };
    }
    if (type === 'delivery') {
      storeQuery.supportsDelivery = true;
    }

    const stores = await Store.find(storeQuery).lean();
    const storeIds = stores.map(s => s._id);

    const menuQuery: any = { store: { $in: storeIds } };
    if (type === 'delivery') {
      menuQuery.isDeliveryAvailable = true;
    }

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
      menuImageUrl: string | null;
      stockLeft: number;
      originalMenuPrice: number;
      discountedMenuPrice: number;
      discountedPercentage: number;
      pickUpStartTime: string;
      pickUpEndTime: string;
      storeDistance: number;
    };

    const toItem = (m: any): Item | null => {
      const s = storeMap.get(String(m.store));
      if (!s) return null;
      const dist = formatKm(haversineDistanceKm(latInput, lngInput, s.lat, s.lng));
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
      return {
        storeId: String(s._id),
        storeName: s.name,
        menuId: String(m._id),
        menuName: m.name,
        menuImageUrl: m.imageUrl || null,
        stockLeft: m.stockLeft,
        originalMenuPrice: m.originalPrice,
        discountedMenuPrice: m.discountedPrice,
        discountedPercentage: m.discountedPercentage,
        pickUpStartTime: fmt(new Date(m.pickupStartTime)),
        pickUpEndTime: fmt(new Date(m.pickupEndTime)),
        storeDistance: dist,
      };
    };

    // 섹션 구성
    const itemsAll = menus.map(toItem).filter((v): v is Item => v !== null);

    // nearBy: 거리순
    const nearBy = [...itemsAll]
      .sort((a, b) => a.storeDistance - b.storeDistance)
      .slice(0, limit);

    // brandNew: 최근 생성순(메뉴 생성일 기준)
    const brandNew = [...itemsAll]
      .sort((a, b) => {
        const ma = menus.find(m => String(m._id) === a.menuId)!;
        const mb = menus.find(m => String(m._id) === b.menuId)!;
        return new Date(mb.createdAt).getTime() - new Date(ma.createdAt).getTime();
      })
      .slice(0, limit);

    // lowInStock: stockLeft가 각 메뉴 기준 자체 임계값이 없다면 작은 값 순서(상위 limit)
    const lowInStock = [...itemsAll]
      .filter(x => x.stockLeft > 0)
      .sort((a, b) => a.stockLeft - b.stockLeft)
      .slice(0, limit);

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
        .filter((v): v is Item => v !== null)
        .slice(0, limit);
    }

    // sweet: 카테고리 기준 '디저트' 또는 '빵'
    const sweet = menus
      .filter(m => m.category === '디저트' || m.category === '빵')
      .map(toItem)
      .filter((v): v is Item => v !== null)
      .slice(0, limit);

    // pickUpRightNow: 지금 수령 가능 시간대이고 재고가 있는 메뉴
    const pickUpRightNow = menus
      .filter(m => m.stockLeft > 0 && isWithinTimeRange(now, new Date(m.pickupStartTime), new Date(m.pickupEndTime)))
      .map(toItem)
      .filter((v): v is Item => v !== null)
      .slice(0, limit);

    return res.json({
      success: true,
      nearBy,
      brandNew,
      lowInStock,
      mealTime,
      sweet,
      pickUpRightNow,
    });
  } catch (error) {
    console.error('❌ /discover 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
