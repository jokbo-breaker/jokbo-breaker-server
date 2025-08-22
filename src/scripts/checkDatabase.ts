import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { Store } from '../models/Store';
import { Menu } from '../models/Menu';

// 환경 변수 로드
dotenv.config();

async function checkDatabase() {
  try {
    console.log('🔄 MongoDB 연결 중...');
    await connectDatabase();

    console.log('📊 데이터베이스 상태 확인...');

    // 스토어 수 확인
    const storeCount = await Store.countDocuments();
    console.log(`🏪 총 스토어 수: ${storeCount}개`);

    // 메뉴 수 확인
    const menuCount = await Menu.countDocuments();
    console.log(`📋 총 메뉴 수: ${menuCount}개`);

    // 첫 번째 메뉴 확인
    const firstMenu = await Menu.findOne().populate('store').lean();
    if (firstMenu) {
      console.log('\n🔍 첫 번째 메뉴 정보:');
      console.log(`- 메뉴명: ${firstMenu.name}`);
      console.log(`- 스토어: ${(firstMenu.store as any)?.name}`);
      console.log(`- 카테고리: ${firstMenu.category}`);
      console.log(`- 푸드 타입: ${firstMenu.foodType}`);
      console.log(`- 이미지 수: ${firstMenu.imageUrls?.length || 0}개`);
      if (firstMenu.imageUrls && firstMenu.imageUrls.length > 0) {
        console.log(`- 첫 번째 이미지: ${firstMenu.imageUrls[0]}`);
      }
    }

    // 한식 카테고리 메뉴 수 확인
    const koreanFoodCount = await Menu.countDocuments({ category: '한식' });
    console.log(`\n🍚 한식 메뉴 수: ${koreanFoodCount}개`);

    // 메뉴명에 "밀박스" 포함된 메뉴 수 확인
    const mealBoxCount = await Menu.countDocuments({
      name: { $regex: '밀박스', $options: 'i' }
    });
    console.log(`📦 "밀박스" 포함 메뉴 수: ${mealBoxCount}개`);

    // 샘플 한식 메뉴들
    const koreanMenus = await Menu.find({ category: '한식' })
      .populate('store')
      .limit(3)
      .lean();

    if (koreanMenus.length > 0) {
      console.log('\n🍚 한식 메뉴 샘플:');
      koreanMenus.forEach((menu, index) => {
        console.log(`${index + 1}. ${menu.name} (${(menu.store as any)?.name})`);
      });
    }

  } catch (error) {
    console.error('❌ 데이터베이스 확인 실패:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
if (require.main === module) {
  checkDatabase();
}
