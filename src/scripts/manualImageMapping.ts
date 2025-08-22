// 이미지 파일명과 스토어명 매핑 가이드
//
// 1. 먼저 AWS S3에 수동으로 이미지들을 업로드하세요:
//    - AWS 콘솔 → S3 → 버킷 → menu-images 폴더 생성
//    - 각 이미지를 업로드하고 퍼블릭 URL을 복사
//
// 2. 아래 매핑 객체에 스토어명과 S3 URL 배열을 추가하세요:

export const storeImageMapping: { [key: string]: string[] } = {
  // 각 스토어별 다중 이미지 URL 배열 (실제 S3 URL로 교체하세요):
  "파동추야": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A84.jpg"
  ],
  "마루스시": [
        "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A2%E1%84%89%E1%85%A1%E1%86%AB%E1%84%86%E1%85%AE%E1%86%AF1.jpg",
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A2%E1%84%89%E1%85%A1%E1%86%AB%E1%84%86%E1%85%AE%E1%86%AF2.jpg",
  ],
  "불타는 소금구이": [
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A8-%E1%84%89%E1%85%A1%E1%86%B7%E1%84%80%E1%85%A7%E1%86%B8%E1%84%89%E1%85%A1%E1%86%AF.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A83.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A82.jpg"
  ],
  "명태촌": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A84.jpg"
  ],
  "상도곱창": [
          "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A8-%E1%84%89%E1%85%A1%E1%86%B7%E1%84%80%E1%85%A7%E1%86%B8%E1%84%89%E1%85%A1%E1%86%AF.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A83.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A82.jpg"
  ],
  "피자 파자": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%91%E1%85%B5%E1%84%8C%E1%85%A1.jpg"
  ],
  "해남식당": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A2%E1%84%89%E1%85%A1%E1%86%AB%E1%84%86%E1%85%AE%E1%86%AF1.jpg",
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A2%E1%84%89%E1%85%A1%E1%86%AB%E1%84%86%E1%85%AE%E1%86%AF2.jpg",
    ],
    "고고 스시": [
        "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A2%E1%84%89%E1%85%A1%E1%86%AB%E1%84%86%E1%85%AE%E1%86%AF1.jpg",
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A2%E1%84%89%E1%85%A1%E1%86%AB%E1%84%86%E1%85%AE%E1%86%AF2.jpg",
  ],
  "코끼리": [
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A84.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A8-%E1%84%89%E1%85%A1%E1%86%B7%E1%84%80%E1%85%A7%E1%86%B8%E1%84%89%E1%85%A1%E1%86%AF.jpg"
  ],
  "미스터 피자 숭실대점": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%91%E1%85%B5%E1%84%8C%E1%85%A1.jpg"
  ],
  "전주식당": [
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A81.jpg",
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A82.jpg"
  ],
  "대풍": [
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A83.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A82.jpg"
  ],
  "한도 곱창": [
          "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A8-%E1%84%89%E1%85%A1%E1%86%B7%E1%84%80%E1%85%A7%E1%86%B8%E1%84%89%E1%85%A1%E1%86%AF.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A83.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A82.jpg"
  ],
  "신촌설렁탕 숭실대점": [
    "https://jokbo-breaker-images.s3.ap-northeast-2.amazonaws.com/menu-images/한식4.jpg"
  ],
  "보들이족발 숭실대점": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%8C%E1%85%A9%E1%86%A8%E1%84%87%E1%85%A1%E1%86%AF.jpg"
  ],
  "일도곱창": [
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A8-%E1%84%89%E1%85%A1%E1%86%B7%E1%84%80%E1%85%A7%E1%86%B8%E1%84%89%E1%85%A1%E1%86%AF.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A83.jpg",
      "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A82.jpg"
  ],
  "삼백집 숭실대점": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%92%E1%85%A1%E1%86%AB%E1%84%89%E1%85%B5%E1%86%A84.jpg"
  ],
  "토속촌": [
    "https://jokbo-breaker-images.s3.ap-northeast-2.amazonaws.com/menu-images/한식3.jpg"
  ],
  "장수식당": [
    "https://jokbo-breaker-images.s3.ap-northeast-2.amazonaws.com/menu-images/한식4.jpg"
  ],
  "홍콩반점 숭실대점": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%8C%E1%85%AE%E1%86%BC%E1%84%89%E1%85%B5%E1%86%A8-%E1%84%8D%E1%85%A1%E1%84%8C%E1%85%A1%E1%86%BC%E1%84%86%E1%85%A7%E1%86%AB.jpg"
  ],
  "투썸플레이스 숭실대점": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%90%E1%85%AE%E1%84%8A%E1%85%A5%E1%86%B7-%E1%84%83%E1%85%B5%E1%84%8C%E1%85%A5%E1%84%90%E1%85%B3.jpg"
  ],
  "고씨네": [
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%80%E1%85%A9%E1%84%8A%E1%85%B5%E1%84%82%E1%85%A6-%E1%84%8F%E1%85%A1%E1%84%85%E1%85%A61.jpg",
    "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/%E1%84%80%E1%85%A9%E1%84%8A%E1%85%B5%E1%84%82%E1%85%A6-%E1%84%8F%E1%85%A1%E1%84%85%E1%85%A62.jpg"
  ],
};

// 3. 아래 함수를 실행하여 메뉴 데이터를 업데이트하세요:

import fs from 'fs';
import path from 'path';

export async function updateMenuDataWithImageUrls() {
  try {
    // 메뉴 데이터 읽기
    const menuDataPath = path.join(__dirname, '../data/menuData.json');
    const menuData = JSON.parse(fs.readFileSync(menuDataPath, 'utf8'));

    // 메뉴 데이터 업데이트 - 다중 이미지 지원
    const updatedMenuData = menuData.map((menu: any) => {
      const storeName = menu.storeInfo?.storeName;
      if (storeName && storeImageMapping[storeName]) {
        const imageUrls = storeImageMapping[storeName];

        // 1. 메뉴에 imageUrls 배열 추가 (여러 이미지)
        menu.imageUrls = imageUrls;

        // 2. storeInfo.mainImageUrl을 첫 번째 이미지로 설정
        menu.storeInfo.mainImageUrl = imageUrls[0];

        console.log(`✅ ${storeName}: ${imageUrls.length}개 이미지 업데이트 완료`);
        console.log(`   메인 이미지: ${imageUrls[0]}`);
        if (imageUrls.length > 1) {
          console.log(`   추가 이미지: ${imageUrls.slice(1).join(', ')}`);
        }
      } else {
        console.log(`⚠️  ${storeName} 이미지 매핑 없음`);
        // 기본값 설정
        menu.imageUrls = [];
      }
      return menu;
    });

    // 업데이트된 메뉴 데이터 저장
    fs.writeFileSync(menuDataPath, JSON.stringify(updatedMenuData, null, 4), 'utf8');

    console.log(`\n✅ 메뉴 데이터 이미지 URL 업데이트 완료!`);
    console.log(`📋 총 ${updatedMenuData.length}개 메뉴 처리됨`);

    // 통계 출력
    const totalImages = updatedMenuData.reduce((total: number, menu: any) => total + (menu.imageUrls?.length || 0), 0);
    const storesWithMultipleImages = updatedMenuData.filter((menu: any) => (menu.imageUrls?.length || 0) > 1).length;

    console.log(`📊 총 ${totalImages}개 이미지 URL 설정됨`);
    console.log(`🏪 다중 이미지를 가진 스토어: ${storesWithMultipleImages}개`);

  } catch (error) {
    console.error('❌ 업데이트 중 오류:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  updateMenuDataWithImageUrls();
}
