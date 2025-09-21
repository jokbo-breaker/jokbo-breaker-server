import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { Store } from '../models/Store';
import { Menu } from '../models/Menu';
import { User } from '../models/User';
import { Order } from '../models/Order';
import fs from 'fs';
import path from 'path';

// 환경 변수 로드
dotenv.config();

interface MenuData {
  category: string;
  foodType: string;
  menuName: string;
  originalPrice: number;
  discountRate: string;
  discountedPrice: number;
  pickupPrice: number;
  deliveryAvailable: boolean;
  pickupStartTime: string;
  pickupEndTime: string;
  deliveryTime: string | null;
  stock: number;
  description: string;
  weight: number;
  imageUrls: string[];
  storeInfo: {
    storeName: string;
    latitude: number;
    longitude: number;
    phoneNumber: string | null;
    address: string;
    mainImageUrl: string;
  };
}

async function resetAndSeedDatabase() {
  try {
    console.log('🔄 MongoDB 연결 중...');
    await connectDatabase();

    console.log('🗑️  기존 데이터 삭제 중...');

    // 모든 컬렉션 데이터 삭제
    await Promise.all([
      Order.deleteMany({}),
      Menu.deleteMany({}),
      Store.deleteMany({}),
      // User.deleteMany({}) // 유저 데이터는 보존할지 선택
    ]);

    console.log('✅ 기존 데이터 삭제 완료');

    // 메뉴 데이터 읽기 (절대 경로 사용)
    const menuDataPath = path.join(process.cwd(), 'src/data/menuData.json');
    const menuDataArray: MenuData[] = JSON.parse(fs.readFileSync(menuDataPath, 'utf8'));

    console.log(`📄 총 ${menuDataArray.length}개의 메뉴 데이터 로드됨`);

    // 고유한 스토어들 추출
    const uniqueStores = new Map<string, MenuData['storeInfo']>();
    menuDataArray.forEach(menu => {
      const storeName = menu.storeInfo.storeName;
      if (!uniqueStores.has(storeName)) {
        uniqueStores.set(storeName, menu.storeInfo);
      }
    });

    console.log(`🏪 총 ${uniqueStores.size}개의 고유 스토어 발견`);

    // 스토어 생성
    const storeMap = new Map<string, any>();

    for (const [storeName, storeInfo] of uniqueStores) {
      try {
        // 현재 시간을 기준으로 영업시간 설정 (임시)
        const today = new Date();
        const openTime = new Date(today);
        openTime.setHours(9, 0, 0, 0); // 오전 9시

        const closeTime = new Date(today);
        closeTime.setHours(22, 0, 0, 0); // 오후 10시

        const store = new Store({
          name: storeName,
          place: '동작구', // 모든 스토어가 동작구에 위치
          lat: storeInfo.latitude,
          lng: storeInfo.longitude,
          supportsDelivery: true, // 기본적으로 배달 지원
          address: storeInfo.address,
          phoneNumber: storeInfo.phoneNumber || '010-0000-0000',
          openTime: openTime,
          closeTime: closeTime,
          tags: [storeName.includes('한식') ? '한식' : '기타']
        });

        const savedStore = await store.save();
        storeMap.set(storeName, savedStore);

        console.log(`✅ 스토어 생성: ${storeName} (ID: ${savedStore._id})`);
      } catch (error) {
        console.error(`❌ 스토어 생성 실패: ${storeName}`, error);
      }
    }

    console.log(`🏪 ${storeMap.size}개 스토어 생성 완료`);

    // 메뉴 생성
    let menuCreatedCount = 0;
    let menuFailedCount = 0;

    for (const menuData of menuDataArray) {
      try {
        const store = storeMap.get(menuData.storeInfo.storeName);
        if (!store) {
          console.error(`❌ 스토어를 찾을 수 없음: ${menuData.storeInfo.storeName}`);
          menuFailedCount++;
          continue;
        }

        // 시간 파싱 (HH:MM 형식을 오늘 날짜의 Date 객체로 변환)
        const parseTimeToDate = (timeStr: string): Date => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date;
        };

        // 할인율에서 숫자만 추출
        const discountPercentage = parseInt(menuData.discountRate.replace('%', ''));

        const menu = new Menu({
          store: store._id,
          name: menuData.menuName,
          description: menuData.description,
          imageUrls: menuData.imageUrls || [],
          stockLeft: menuData.stock,
          originalPrice: menuData.originalPrice,
          discountedPrice: menuData.discountedPrice,
          discountedPercentage: discountPercentage,
          pickupStartTime: parseTimeToDate(menuData.pickupStartTime),
          pickupEndTime: parseTimeToDate(menuData.pickupEndTime),
          isDeliveryAvailable: menuData.deliveryAvailable,
          deliveryStartTime: menuData.deliveryTime ? parseTimeToDate(menuData.deliveryTime) : null,
          deliveryPrice: menuData.deliveryAvailable ? 3000 : null, // 기본 배달비 3000원
          gramPerUnit: menuData.weight,
          pickupPrice: menuData.pickupPrice,
          totalSoldCount: Math.floor(Math.random() * 100), // 랜덤 판매량
          foodType: menuData.foodType as '식사' | '디저트',
          category: menuData.category as any
        });

        await menu.save();
        menuCreatedCount++;

        console.log(`✅ 메뉴 생성: ${menuData.menuName} (${menuData.storeInfo.storeName})`);
      } catch (error) {
        console.error(`❌ 메뉴 생성 실패: ${menuData.menuName}`, error);
        menuFailedCount++;
      }
    }

    console.log('\n🎉 데이터베이스 리셋 및 시딩 완료!');
    console.log(`📊 생성된 스토어: ${storeMap.size}개`);
    console.log(`📊 생성된 메뉴: ${menuCreatedCount}개`);
    if (menuFailedCount > 0) {
      console.log(`⚠️  실패한 메뉴: ${menuFailedCount}개`);
    }
    console.log(`📊 총 이미지 URL: ${menuDataArray.reduce((total, menu) => total + (menu.imageUrls?.length || 0), 0)}개`);

  } catch (error) {
    console.error('❌ 데이터베이스 리셋 및 시딩 실패:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
if (require.main === module) {
  console.log('🚀 MongoDB 데이터베이스 리셋 및 시딩 시작...');
  resetAndSeedDatabase();
}
