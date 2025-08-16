import { Document } from 'mongoose';

// 유저 기본 인터페이스
export interface IUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  totalPurchaseCount: number;
  totalFoodAmount: number;
  preferences: {
    favoriteCategories: string[];
    allergens: string[];
    dietaryRestrictions: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Document와 함께 사용할 인터페이스
export interface IUserDocument extends IUser, Document {}

// 로그인 응답 타입
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    totalPurchaseCount: number;
    totalFoodAmount: number;
    preferences: IUser['preferences'];
  };
  token?: string;
}

// JWT 페이로드 타입
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}
