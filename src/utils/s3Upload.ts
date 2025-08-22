import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Multer S3 설정
export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3 as any,
    bucket: process.env.S3_BUCKET_NAME || '',
    key: function (req, file, cb) {
      // 파일명을 타임스탬프와 함께 생성하여 중복 방지
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `${timestamp}${extension}`;
      cb(null, `menu-images/${filename}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});

// S3에서 파일 삭제
export const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    // URL에서 Key 추출
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // 맨 앞의 '/' 제거

    const params = {
      Bucket: process.env.S3_BUCKET_NAME || '',
      Key: key,
    };

    await s3.deleteObject(params).promise();
    console.log(`S3 파일 삭제 성공: ${key}`);
  } catch (error) {
    console.error('S3 파일 삭제 실패:', error);
    throw error;
  }
};

// S3 URL 생성 헬퍼
export const getS3Url = (key: string): string => {
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
