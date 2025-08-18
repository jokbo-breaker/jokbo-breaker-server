import { Document, Types } from 'mongoose';

export interface IStore {
  name: string;
  place: string; // 예: "동작구"
  lat: number;   // 위도(lat) 대신 요청 스펙을 따름
  lng: number;   // 경도
  supportsDelivery: boolean;
  tags?: string[]; // 확장용
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreDocument extends IStore, Document {}
