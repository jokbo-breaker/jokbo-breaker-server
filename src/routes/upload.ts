import express, { Request, Response } from 'express';
import { uploadToS3, deleteFromS3 } from '../utils/s3Upload';

const router = express.Router();

/**
 * @route   POST /upload/image
 * @desc    단일 이미지를 S3에 업로드
 * @access  Public (나중에 인증 추가 가능)
 */
router.post('/image', uploadToS3.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '업로드할 이미지가 없습니다.'
      });
    }

    const file = req.file as Express.MulterS3.File;

    return res.json({
      success: true,
      message: '이미지 업로드 성공',
      data: {
        filename: file.key,
        url: file.location,
        size: file.size
      }
    });
  } catch (error) {
    console.error('이미지 업로드 에러:', error);
    return res.status(500).json({
      success: false,
      message: '이미지 업로드 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @route   POST /upload/images
 * @desc    여러 이미지를 S3에 업로드
 * @access  Public
 */
router.post('/images', uploadToS3.array('images', 10), (req: Request, res: Response) => {
  try {
    if (!req.files || (req.files as Express.MulterS3.File[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: '업로드할 이미지가 없습니다.'
      });
    }

    const files = req.files as Express.MulterS3.File[];
    const uploadedFiles = files.map(file => ({
      filename: file.key,
      url: file.location,
      size: file.size
    }));

    return res.json({
      success: true,
      message: `${files.length}개 이미지 업로드 성공`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('이미지 업로드 에러:', error);
    return res.status(500).json({
      success: false,
      message: '이미지 업로드 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @route   DELETE /upload/image
 * @desc    S3에서 이미지 삭제
 * @access  Public
 */
router.delete('/image', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: '삭제할 이미지 URL이 필요합니다.'
      });
    }

    await deleteFromS3(url);

    return res.json({
      success: true,
      message: '이미지 삭제 성공'
    });
  } catch (error) {
    console.error('이미지 삭제 에러:', error);
    return res.status(500).json({
      success: false,
      message: '이미지 삭제 중 오류가 발생했습니다.'
    });
  }
});

export default router;
