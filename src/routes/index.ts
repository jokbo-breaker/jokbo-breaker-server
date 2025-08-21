import express from 'express';
import authRoutes from './auth';
import discoverRoutes from './discover';
import orderRoutes from './order';

const router = express.Router();

// 모든 라우트 통합
router.use('/auth', authRoutes);
router.use('/discover', discoverRoutes);
router.use('/order', orderRoutes);

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
      discover: {
        'POST /discover': '위치 기반 음식 탐색 (위도/경도 필수)',
        'GET /discover/menu/:menuId': '특정 메뉴 상세 정보 조회',
      },
      order: {
        'POST /order': '새 주문 생성 (인증 필요)',
        'GET /order': '사용자 주문 내역 조회 (인증 필요)',
        'GET /order/:orderId': '특정 주문 상세 정보 조회 (인증 필요)',
      },
      system: {
        'GET /': 'API 정보 및 문서',
        'GET /health': '서버 상태 확인',
      },
    },
    documentation: {
      authFlow: '1. /auth/google 접근 → 2. Google 로그인 → 3. 콜백으로 JWT 토큰 받기 → 4. Authorization 헤더에 Bearer 토큰으로 API 사용',
      discoverFlow: 'POST /discover에 lat, lng 좌표를 전송하면 6개 섹션(nearBy, brandNew, lowInStock, mealTime, sweet, pickUpRightNow)으로 구성된 음식 목록 반환',
      discoverParams: '?type=pickup|delivery (기본값: pickup), ?place=장소명 (매장 검색)',
      orderFlow: '1. GET /discover/menu/:menuId로 메뉴 정보 확인 → 2. POST /order로 주문 생성 → 3. GET /order로 주문 내역 확인',
      orderFields: 'menuId(필수), quantity(필수), orderType(pickup|delivery), paymentMethod(card|onsite), deliveryAddress(선택사항)',
    },
  });
});

export default router;
