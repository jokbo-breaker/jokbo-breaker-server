import mongoose, { Schema } from 'mongoose';
import { IStoreDocument } from '../types/store.types';

const StoreSchema = new Schema<IStoreDocument>(
  {
    name: { type: String, required: true, trim: true },
    place: { type: String, required: true, index: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    supportsDelivery: { type: Boolean, default: false, index: true },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
    collection: 'stores',
  }
);

export const Store = mongoose.model<IStoreDocument>('Store', StoreSchema);

export default Store;
