import mongoose, { Schema, Types } from 'mongoose';
import { IOrderDocument } from '../types/order.types';

const OrderItemSchema = new Schema({
  menuId: { type: Schema.Types.ObjectId, ref: 'Menu', required: true },
  menuName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  gramPerUnit: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  totalGrams: { type: Number, required: true, min: 0 },
}, { _id: false });

const OrderSchema = new Schema<IOrderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    storeName: { type: String, required: true, trim: true },
    items: { type: [OrderItemSchema], required: true },
    orderType: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'onsite'],
      required: true,
      index: true
    },

    // 주문 금액 정보
    totalQuantity: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    totalGrams: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    finalAmount: { type: Number, required: true, min: 0 },

    // 주문 상태 및 시간
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    orderDate: { type: Date, required: true, default: Date.now, index: true },
    pickupStartTime: { type: Date, default: null },
    pickupEndTime: { type: Date, default: null },
    deliveryStartTime: { type: Date, default: null },

    // 추가 정보
    phoneNumber: { type: String, trim: true, default: null },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

// 인덱스 설정
OrderSchema.index({ userId: 1, orderDate: -1 }); // 사용자별 최신 주문 조회용
OrderSchema.index({ storeId: 1, orderDate: -1 }); // 매장별 주문 조회용
OrderSchema.index({ status: 1, orderDate: -1 }); // 상태별 주문 조회용

export const Order = mongoose.model<IOrderDocument>('Order', OrderSchema);

export default Order;
