import express from 'express';
import authRoutes from './auth';

const router = express.Router();

// 모든 라우트 통합
router.use('/auth', authRoutes);

// API 정보 라우트
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Jokbo Breaker API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /auth/google': 'Google OAuth 로그인 시작',
        'GET /auth/google/callback': 'Google OAuth 콜백',
        'GET /auth/me': '현재 사용자 정보 조회 (인증 필요)',
        'POST /auth/logout': '로그아웃 (인증 필요)',
        'PUT /auth/profile': '프로필 업데이트 (인증 필요)',
        'GET /auth/status': '인증 상태 확인',
      },
    },
    documentation: {
      authFlow: '1. /auth/google 접근 → 2. Google 로그인 → 3. 콜백으로 JWT 토큰 받기 → 4. Authorization 헤더에 Bearer 토큰으로 API 사용',
    },
  });
});

export default router;
