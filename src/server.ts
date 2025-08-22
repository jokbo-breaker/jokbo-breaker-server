// 환경 변수를 가장 먼저 로드
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { connectDatabase } from './config/database';
import passport from './config/passport';
import indexRoutes from './routes/index';
import uploadRoutes from './routes/upload';
// import testAuthRoutes from './routes/test-auth'; // 제거

// ====== server.ts 상단 app 선언 직후에 추가 ======
const app = express();

// 1) 프록시 신뢰(HTTPS 뒤에서도 secure 쿠키 동작)
app.set('trust proxy', 1);

// 2) 환경 플래그(프로덕션/크로스사이트 여부)
const isProd = process.env.NODE_ENV === 'production';
const crossSite = process.env.CROSS_SITE_COOKIES === 'true';

// 3) 복수 오리진 허용(콤마 구분)
const ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  process.env.CLIENT_URL ||                 // 하위 호환
  'http://localhost:5173'
).split(',').map(o => o.trim()).filter(Boolean);

// ====== CORS 설정 교체 ======
app.use(cors({
  origin(origin, callback) {
    // 서버-서버/로컬 툴링 등 origin이 없는 경우 허용
    if (!origin) return callback(null, true);
    if (ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ====== 세션 설정 교체 ======
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    secure: isProd,                       // 프로덕션(HTTPS)에서만 Secure
    sameSite: crossSite ? 'none' : 'lax', // 크로스도메인 통신이면 none
  },
}));

const PORT = process.env.PORT || 8000;

// 데이터베이스 연결
connectDatabase();

// 기본 미들웨어
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 라우트 설정
app.use('/api', indexRoutes);
app.use('/api/upload', uploadRoutes);

// 기본 라우트는 이제 indexRoutes에서 처리됨

// 헬스체크 라우트
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 처리
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl,
  });
});

// 에러 핸들링 미들웨어
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ 서버 에러:', error);

  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? '서버 내부 오류가 발생했습니다.'
      : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행중입니다.`);
  console.log(`📍 로컬 주소: http://localhost:${PORT}`);
  console.log(`🔐 Google OAuth: http://localhost:${PORT}/auth/google`);
  console.log(`📖 API 문서: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM 신호를 받았습니다. 서버를 종료합니다...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT 신호를 받았습니다. 서버를 종료합니다...');
  process.exit(0);
});

export default app;
