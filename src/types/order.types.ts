import { Document, Types } from 'mongoose';

export type OrderType = 'pickup' | 'delivery';
export type PaymentMethod = 'card' | 'onsite'; // 카드, 현장결제
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface IOrderItem {
  menuId: Types.ObjectId;
  menuName: string;
  quantity: number;
  gramPerUnit: number; // 메뉴 1개당 그램수
  unitPrice: number; // 주문 당시의 단가 (픽업 또는 배달 가격)
  totalPrice: number; // quantity * unitPrice
  totalGrams: number; // quantity * gramPerUnit
  // 메뉴 상세 정보 (주문내역 조회시 표시용)
  menuImageUrls?: string[]; // 메뉴 이미지들
  originalMenuPrice?: number; // 원래 메뉴 가격
  discountedMenuPrice?: number; // 할인된 메뉴 가격
  discountedPercentage?: number; // 할인 퍼센트
  pickupPrice?: number; // 픽업 가격 (픽업 주문일 때)
}

export interface IOrder {
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  storeName: string;
  items: IOrderItem[];
  orderType: OrderType; // 'pickup' | 'delivery'
  paymentMethod: PaymentMethod; // 'card' | 'onsite'

  // 주문 금액 정보
  totalQuantity: number; // 총 주문 수량
  totalAmount: number; // 총 주문 금액
  totalGrams: number; // 총 주문 그램수
  deliveryFee: number; // 배달비 (픽업의 경우 0)
  finalAmount: number; // 최종 결제 금액 (totalAmount + deliveryFee)

  // 주문 상태 및 시간
  status: OrderStatus;
  orderDate: Date;
  pickupStartTime?: Date; // 픽업 가능 시작 시간
  pickupEndTime?: Date; // 픽업 가능 종료 시간
  deliveryStartTime?: Date; // 배달 시작 시간 (배달의 경우)

  // 추가 정보
  phoneNumber?: string; // 연락처

  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDocument extends IOrder, Document {}

// API 요청/응답 타입들
export interface CreateOrderRequest {
  menuId: string;
  quantity: number;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  order?: {
    orderId: string;
    storeName: string;
    items: IOrderItem[];
    orderType: OrderType;
    paymentMethod: PaymentMethod;
    totalQuantity: number;
    totalAmount: number;
    totalGrams: number;
    deliveryFee: number;
    finalAmount: number;
    status: OrderStatus;
    orderDate: string;
    pickupStartTime?: string;
    pickupEndTime?: string;
    deliveryStartTime?: string;
    phoneNumber?: string;
  };
}

export interface OrderListResponse {
  success: boolean;
  message: string;
  orders: Array<{
    orderId: string;
    storeId: string;
    storeName: string;
    items: IOrderItem[];
    orderType: OrderType;
    paymentMethod: PaymentMethod;
    totalQuantity: number;
    totalAmount: number; // 순 주문 금액 (배달비 제외)
    totalGrams: number;
    deliveryFee?: number; // 배달 주문일 때만 존재
    finalAmount: number; // 최종 결제 금액 (totalAmount + deliveryFee)
    status: OrderStatus;
    orderDate: string;
  }>;
  totalCount: number;
}
