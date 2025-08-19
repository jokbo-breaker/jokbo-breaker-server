import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const envUriRaw = process.env.MONGODB_URI;
    const envUri = envUriRaw && envUriRaw.trim().length > 0 ? envUriRaw.trim() : undefined;
    const mongoUri = envUri || 'mongodb://localhost:27017/jokbo-breaker';

    if (envUri) {
      console.log('🔌 MongoDB: 환경변수 MONGODB_URI 사용 중');
    } else {
      console.warn('ℹ️ MongoDB: MONGODB_URI 미설정, 로컬 기본값으로 접속 시도');
    }

    await mongoose.connect(mongoUri, {
      // 최신 MongoDB 드라이버에서 자동으로 처리되는 옵션들은 제거
      serverSelectionTimeoutMS: 5000, // 5초 타임아웃
      maxPoolSize: 5, // 연결 풀 크기 제한
    });

    console.log('✅ MongoDB 연결 성공');

    // 연결 이벤트 리스너
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB 연결 오류:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB 연결이 끊어졌습니다.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB 재연결 성공');
    });

  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    console.error('💡 MongoDB가 실행되지 않은 것 같습니다.');
    console.error('🐳 Docker: docker run -d -p 27017:27017 --name mongodb mongo');
    console.error('🔧 또는 로컬 MongoDB를 설치하여 실행하세요.');
    console.error('⚠️ 서버는 계속 실행되지만 DB 기능이 제한됩니다.');

    // MongoDB 없이도 서버가 계속 실행되도록 process.exit(1) 제거
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ MongoDB 연결 종료 실패:', error);
  }
};
