import express, { Request, Response } from 'express';
import passport from '../config/passport';
import { generateToken, authenticateToken } from '../middleware/auth';
import { AuthResponse } from '../types/user.types';
import { User } from '../models/User';

const router = express.Router();

/**
 * @route   GET /auth/google
 * @desc    Google OAuth 로그인 시작
 * @access  Public
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * @route   GET /auth/google/callback
 * @desc    Google OAuth 콜백 처리
 * @access  Public
 */
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
    session: false
  }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        console.error('❌ OAuth 콜백에서 유저 정보를 찾을 수 없습니다.');
        return res.redirect(`${process.env.CLIENT_URL}/login?error=user_not_found`);
      }

      // JWT 토큰 생성
      const token = generateToken(user._id.toString(), user.email);

      console.log('🚀 ===== OAUTH 콜백 처리 완료 =====');
      console.log('👤 유저:', user.name, '(', user.email, ')');
      console.log('🎫 JWT 토큰 생성 완료');
      console.log('📍 클라이언트 리다이렉트 준비...');
      console.log('=====================================');

      // 성공 시 클라이언트로 토큰과 함께 리다이렉트
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/auth/success?token=${token}`);

    } catch (error) {
      console.error('❌ OAuth 콜백 오류:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

/**
 * @route   GET /auth/me
 * @desc    현재 로그인한 사용자 정보 조회
 * @access  Private
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const response: AuthResponse = {
      success: true,
      message: '사용자 정보 조회 성공',
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        name: user.name,
        totalPurchaseCount: user.totalPurchaseCount,
        totalFoodAmount: user.totalFoodAmount,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('❌ 사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * @route   POST /auth/logout
 * @desc    로그아웃 (클라이언트에서 토큰 삭제 안내)
 * @access  Private
 */
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '로그아웃 성공. 클라이언트에서 토큰을 삭제해주세요.',
  });
});

/**
 * @route   PUT /auth/profile
 * @desc    사용자 프로필 업데이트 (취향 정보 등)
 * @access  Private
 */
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { preferences } = req.body;

    if (preferences) {
      // 취향 정보 업데이트
      if (preferences.favoriteCategories) {
        user.preferences.favoriteCategories = preferences.favoriteCategories;
      }
      if (preferences.allergens) {
        user.preferences.allergens = preferences.allergens;
      }
      if (preferences.dietaryRestrictions) {
        user.preferences.dietaryRestrictions = preferences.dietaryRestrictions;
      }

      await user.save();
    }

    const response: AuthResponse = {
      success: true,
      message: '프로필 업데이트 성공',
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        name: user.name,
        totalPurchaseCount: user.totalPurchaseCount,
        totalFoodAmount: user.totalFoodAmount,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('❌ 프로필 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * @route   GET /auth/status
 * @desc    인증 상태 확인 (토큰 유효성 검사)
 * @access  Public
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.json({
        success: true,
        authenticated: false,
        message: '토큰이 없습니다.',
      });
      return;
    }

    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.json({
        success: true,
        authenticated: false,
        message: 'JWT 설정 오류',
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.json({
        success: true,
        authenticated: false,
        message: '유효하지 않은 토큰입니다.',
      });
      return;
    }

    res.json({
      success: true,
      authenticated: true,
      message: '인증된 사용자입니다.',
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        name: user.name,
      },
    });

  } catch (error) {
    res.json({
      success: true,
      authenticated: false,
      message: '토큰 검증 실패',
    });
  }
});

export default router;
