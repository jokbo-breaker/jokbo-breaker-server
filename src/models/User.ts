import mongoose, { Schema } from 'mongoose';
import { IUserDocument } from '../types/user.types';

// 유저 스키마 정의
const UserSchema = new Schema<IUserDocument>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    picture: {
      type: String,
      default: null,
    },
    totalPurchaseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFoodAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
    collection: 'users',
  }
);

// 인덱스는 unique: true로 이미 생성되므로 별도 인덱스 생성 불필요

// 가상 필드: 평균 주문 금액
UserSchema.virtual('averageOrderAmount').get(function () {
  if (this.totalPurchaseCount === 0) return 0;
  return this.totalFoodAmount / this.totalPurchaseCount;
});

// JSON 변환시 가상 필드 포함
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// 유저 모델 생성 및 내보내기
export const User = mongoose.model<IUserDocument>('User', UserSchema);

export default User;
