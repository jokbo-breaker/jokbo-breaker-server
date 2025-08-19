import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Store } from '../models/Store';
import { Menu } from '../models/Menu';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const now = new Date();

const createStoresAndMenus = async () => {
  await Store.deleteMany({});
  await Menu.deleteMany({});

  // 동작구 중심 좌표(대략적) - 네이버 지도 연동 전 임시
  const baseLat = 37.496;
  const baseLng = 126.953;

  const places = ['동작구', '동작구', '동작구', '동작구', '동작구', '동작구'];
  const stores = await Store.insertMany(
    Array.from({ length: 8 }).map((_, i) => ({
      name: `스토어 ${i + 1}`,
      place: places[i % places.length] || '동작구',
      lat: baseLat + (Math.random() - 0.5) * 0.02,
      lng: baseLng + (Math.random() - 0.5) * 0.02,
      supportsDelivery: Math.random() > 0.4,
      address: `서울특별시 동작구 상도로 ${100 + i}길 ${randomInt(1, 50)}`,
      phoneNumber: `02-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      openTime: (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; })(),
      closeTime: (() => { const d = new Date(); d.setHours(22, 0, 0, 0); return d; })(),
      tags: [],
    }))
  );

  const makePickupWindow = (startHour: number, endHour: number) => {
    const s = new Date(now);
    s.setHours(startHour, randomInt(0, 30), 0, 0);
    const e = new Date(now);
    e.setHours(endHour, randomInt(0, 30), 0, 0);
    return { s, e };
  };

  const categories = ['일식','한식','중식','양식','빵','디저트','스페인 요리','멕시코 요리','패스트 푸드','건강식','비건','할랄','인도 음식','직접입력'];

  const menus = await Menu.insertMany(
    stores.flatMap((store, si) => {
      const arr = Array.from({ length: 6 }).map((_, mi) => {
        const discountBase = randomInt(10, 50);
        const original = randomInt(6000, 18000);
        const discounted = Math.max(1000, Math.floor(original * (1 - discountBase / 100)));

        // 다양한 시간대 생성: 아침/점심/저녁 분산
        const windows = [
          makePickupWindow(7, 9), // 아침
          makePickupWindow(11, 13), // 점심
          makePickupWindow(18, 20), // 저녁
        ];
        const w = windows[(si + mi) % windows.length];

        // sweet 섹션 충족을 위해 일부는 카테고리를 빵/디저트로 지정
        const category = (si + mi) % 4 === 0 ? '디저트' : ((si + mi) % 7 === 0 ? '빵' : categories[(si + mi) % categories.length]);

                 const isDeliveryAvailable = (store as any).supportsDelivery && Math.random() > 0.3;
         const deliveryPrice = isDeliveryAvailable ? randomInt(2000, 5000) : null;
         const deliveryStart = isDeliveryAvailable ? (() => {
           const d = new Date(w.s);
           d.setMinutes(d.getMinutes() + 30); // 배달은 픽업보다 30분 늦게
           return d;
         })() : null;

         return {
           store: store._id,
           name: `메뉴 ${si + 1}-${mi + 1}`,
           description: `맛있는 ${category} 요리입니다. 신선한 재료로 만든 특별한 메뉴를 즐겨보세요.`,
           imageUrls: [
             `https://picsum.photos/seed/${si + 1}-${mi + 1}-1/400/300`,
             `https://picsum.photos/seed/${si + 1}-${mi + 1}-2/400/300`,
           ],
           stockLeft: randomInt(0, 20),
           originalPrice: original,
           discountedPrice: discounted,
           discountedPercentage: Math.round(100 - (discounted / original) * 100),
           pickupStartTime: w.s,
           pickupEndTime: w.e,
           isDeliveryAvailable,
           deliveryStartTime: deliveryStart,
           deliveryPrice,
           foodTimeType: ['breakfast','lunch','dinner'][(si + mi) % 3] as any,
           category,
         };
      });
      return arr;
    })
  );

  console.log(`✅ 시드 완료: stores=${stores.length}, menus=${menus.length}`);
};

(async () => {
  try {
    await connectDatabase();
    await createStoresAndMenus();
  } catch (e) {
    console.error('❌ 시드 실패:', e);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
})();
