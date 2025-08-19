import { Document, Types } from 'mongoose';

export interface IStore {
  name: string;
  place: string; // 예: "동작구"
  lat: number;   // 위도
  lng: number;   // 경도
  supportsDelivery: boolean;
  address: string; // 상세 주소
  phoneNumber: string; // 전화번호
  openTime: Date; // 영업 시작 시간
  closeTime: Date; // 영업 종료 시간
  tags?: string[]; // 확장용
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreDocument extends IStore, Document {}
