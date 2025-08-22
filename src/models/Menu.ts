import mongoose, { Schema, Types } from 'mongoose';
import { IMenuDocument } from '../types/menu.types';

const MenuSchema = new Schema<IMenuDocument>(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    imageUrls: { type: [String], default: [] },
    stockLeft: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, required: true, min: 0 },
    discountedPercentage: { type: Number, required: true, min: 0, max: 100 },
    pickupStartTime: { type: Date, required: true },
    pickupEndTime: { type: Date, required: true },
    isDeliveryAvailable: { type: Boolean, default: false, index: true },
    deliveryStartTime: { type: Date, default: null },
    deliveryPrice: { type: Number, default: null, min: 0 },
    gramPerUnit: { type: Number, required: true, min: 0 }, // 메뉴 1개당 그램수
    pickupPrice: { type: Number, required: true, min: 0 }, // 픽업시 금액 (배달비 제외)
    totalSoldCount: { type: Number, default: 0, min: 0, index: true }, // 총 판매된 수량 (인기도 측정용)
    foodType: { type: String, enum: ['식사', '디저트'], default: null },
    category: {
      type: String,
      enum: [
        '일식','한식','중식','양식','빵','디저트','스페인 요리','멕시코 요리','패스트 푸드','건강식','비건','할랄','인도 음식','직접입력'
      ],
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'menus',
  }
);

export const Menu = mongoose.model<IMenuDocument>('Menu', MenuSchema);

export default Menu;
