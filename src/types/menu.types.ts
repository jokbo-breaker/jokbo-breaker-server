import { Document, Types } from 'mongoose';

export type FoodType = '식사' | '디저트';

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
  description: string; // 메뉴 설명
  imageUrls: string[]; // 여러 이미지 지원
  stockLeft: number;
  originalPrice: number;
  discountedPrice: number;
  discountedPercentage: number;
  pickupStartTime: Date;
  pickupEndTime: Date;
  isDeliveryAvailable: boolean; // 기본적으로 store.supportsDelivery 상속 가능
  deliveryStartTime?: Date; // 배달 시간
  deliveryPrice?: number; // 배달비 (배달 가능한 메뉴에만)
  gramPerUnit: number; // 메뉴 1개당 그램수
  pickupPrice: number; // 픽업시 금액 (배달비 제외)
  totalSoldCount: number; // 총 판매된 수량 (인기도 측정용)
  foodType?: FoodType; // 식사/디저트
  category?: FoodCategory; // 카테고리(디저트/빵 등)
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuDocument extends IMenu, Document {}
