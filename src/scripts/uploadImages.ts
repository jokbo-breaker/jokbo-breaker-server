import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const bucketName = process.env.S3_BUCKET_NAME || '';

// 이미지 파일을 S3에 업로드하는 함수
async function uploadImageToS3(filePath: string, fileName: string): Promise<string> {
  try {
    const fileContent = fs.readFileSync(filePath);
    const key = `menu-images/${fileName}`;

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: `image/${path.extname(fileName).substring(1)}`,
    };

    const result = await s3.upload(params).promise();
    console.log(`✅ 업로드 성공: ${fileName} -> ${result.Location}`);
    return result.Location;
  } catch (error) {
    console.error(`❌ 업로드 실패: ${fileName}`, error);
    throw error;
  }
}

// 메뉴 데이터의 이미지 URL을 업데이트하는 함수
async function updateMenuDataWithS3Urls() {
  try {
    // 메뉴 데이터 읽기
    const menuDataPath = path.join(__dirname, '../data/menuData.json');
    const menuData = JSON.parse(fs.readFileSync(menuDataPath, 'utf8'));

    // 이미지 폴더 경로
    const imagesDir = path.join(__dirname, '../data/images');

    // 이미지 파일들을 S3에 업로드하고 URL 매핑 생성
    const imageFiles = fs.readdirSync(imagesDir);
    const uploadPromises = imageFiles.map(async (fileName) => {
      const filePath = path.join(imagesDir, fileName);
      const s3Url = await uploadImageToS3(filePath, fileName);
      return { fileName, s3Url };
    });

    console.log(`📤 ${imageFiles.length}개 이미지 업로드 시작...`);
    const uploadResults = await Promise.all(uploadPromises);

    // 파일명을 키로 하는 URL 매핑 객체 생성
    const imageUrlMap: { [key: string]: string } = {};
    uploadResults.forEach(({ fileName, s3Url }) => {
      imageUrlMap[fileName] = s3Url;
    });

        // 메뉴 데이터 업데이트 - 다중 이미지 지원
    const updatedMenuData = menuData.map((menu: any) => {
      if (menu.storeInfo && menu.storeInfo.storeName) {
        const storeName = menu.storeInfo.storeName;

        // 스토어명과 관련된 모든 이미지 파일 찾기
        const matchedFileNames: string[] = [];
        for (const fileName of Object.keys(imageUrlMap)) {
          const baseName = fileName.replace(/\.[^/.]+$/, ""); // 확장자 제거
          if (
            storeName.includes(baseName) ||
            baseName.includes(storeName) ||
            menu.category.includes(baseName) ||
            fileName.includes(menu.category)
          ) {
            matchedFileNames.push(fileName);
          }
        }

        // 매칭되는 파일들이 있으면 S3 URL들로 설정
        if (matchedFileNames.length > 0) {
          const imageUrls = matchedFileNames.map(fileName => imageUrlMap[fileName]);

          // 1. 메뉴에 imageUrls 배열 설정
          menu.imageUrls = imageUrls;

          // 2. storeInfo.mainImageUrl을 첫 번째 이미지로 설정
          menu.storeInfo.mainImageUrl = imageUrls[0];

          console.log(`🔄 ${storeName}: ${imageUrls.length}개 이미지 매칭`);
          console.log(`   파일들: ${matchedFileNames.join(', ')}`);
        } else {
          console.log(`⚠️  ${storeName}: 매칭되는 이미지 없음`);
          menu.imageUrls = [];
        }
      }
      return menu;
    });

    // 업데이트된 메뉴 데이터 저장
    fs.writeFileSync(menuDataPath, JSON.stringify(updatedMenuData, null, 4), 'utf8');

    console.log(`\n✅ 이미지 업로드 및 메뉴 데이터 업데이트 완료!`);
    console.log(`📊 총 ${uploadResults.length}개 이미지 업로드됨`);
    console.log(`📋 총 ${updatedMenuData.length}개 메뉴 데이터 처리됨`);

  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  updateMenuDataWithS3Urls();
}
