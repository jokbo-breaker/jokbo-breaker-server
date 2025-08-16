import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { JWTPayload } from '../types/user.types';

// JWT 토큰 생성
export const generateToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET가 설정되지 않았습니다.');
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

// JWT 토큰 검증 미들웨어
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(401).json({
        success: false,
        message: 'JWT 설정 오류입니다.',
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;

    // 사용자 존재 확인
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.',
      });
      return;
    }

    // req 객체에 사용자 정보 추가
    (req as any).user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.',
      });
      return;
    }

    console.error('❌ 토큰 검증 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
};

// 선택적 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;
    const user = await User.findById(decoded.userId);

    if (user) {
      (req as any).user = user;
    }

    next();
  } catch (error) {
    // 토큰이 유효하지 않아도 통과
    next();
  }
};
