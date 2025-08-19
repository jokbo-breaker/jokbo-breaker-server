import { Document, Types } from 'mongoose';

export type FoodTimeType = 'breakfast' | 'lunch' | 'dinner';

export type FoodCategory =
  | '일식'
  | '한식'
  | '중식'
  | '양식'
  | '빵'
  | '디저트'
  | '스페인 요리'
  | '멕시코 요리'
  | '패스트 푸드'
  | '건강식'
  | '비건'
  | '할랄'
  | '인도 음식'
  | '직접입력';

export interface IMenu {
  store: Types.ObjectId;
  name: string;
  imageUrls: string[]; // 여러 이미지 지원
  stockLeft: number;
  originalPrice: number;
  discountedPrice: number;
  discountedPercentage: number;
  pickupStartTime: Date;
  pickupEndTime: Date;
  isDeliveryAvailable: boolean; // 기본적으로 store.supportsDelivery 상속 가능
  foodTimeType?: FoodTimeType; // 아침/런치/디너
  category?: FoodCategory; // 카테고리(디저트/빵 등)
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuDocument extends IMenu, Document {}
