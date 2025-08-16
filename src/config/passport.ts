import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import { IUserDocument } from '../types/user.types';

// Google OAuth 전략 설정
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
  console.warn('⚠️ Google OAuth 설정이 누락되었습니다.');
  console.warn('🔧 ./setup-google-oauth.sh 실행하여 설정을 완료하세요.');
  console.warn('📝 임시로 JWT 기반 인증만 사용됩니다.');
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:8000/auth/google/callback',
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 기존 유저 확인
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // 기존 유저라면 정보 업데이트 (이름, 사진 등이 변경될 수 있음)
          user.name = profile.displayName || user.name;
          user.picture = profile.photos?.[0]?.value || user.picture;
          await user.save();

          console.log('🎉 ===== GOOGLE OAUTH 기존 유저 로그인 성공 =====');
          console.log('📧 이메일:', user.email);
          console.log('👤 이름:', user.name);
          console.log('🆔 Google ID:', user.googleId);
          console.log('🛒 총 구매횟수:', user.totalPurchaseCount);
          console.log('💰 총 구매금액:', user.totalFoodAmount);
          console.log('❤️ 선호 카테고리:', user.preferences.favoriteCategories);
          console.log('🚫 알레르기:', user.preferences.allergens);
          console.log('🥗 식단 제한:', user.preferences.dietaryRestrictions);
          console.log('⏰ 가입일:', user.createdAt);
          console.log('⏰ 마지막 업데이트:', user.updatedAt);
          console.log('===============================================');
          return done(null, user);
        }

        // 새 유저 생성
        user = new User({
          googleId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
          totalPurchaseCount: 0,
          totalFoodAmount: 0,
          preferences: {
            favoriteCategories: [],
            allergens: [],
            dietaryRestrictions: [],
          },
        });

        await user.save();

        console.log('🎊 ===== GOOGLE OAUTH 신규 유저 회원가입 성공 =====');
        console.log('📧 이메일:', user.email);
        console.log('👤 이름:', user.name);
        console.log('🖼️ 프로필 사진:', user.picture);
        console.log('🆔 Google ID:', user.googleId);
        console.log('🛒 초기 구매횟수:', user.totalPurchaseCount);
        console.log('💰 초기 구매금액:', user.totalFoodAmount);
        console.log('❤️ 초기 선호 카테고리:', user.preferences.favoriteCategories);
        console.log('🚫 초기 알레르기:', user.preferences.allergens);
        console.log('🥗 초기 식단 제한:', user.preferences.dietaryRestrictions);
        console.log('⏰ 생성일:', user.createdAt);
        console.log('🎯 회원가입 완료! 이제 해커톤 서비스를 이용할 수 있습니다!');
        console.log('====================================================');
        return done(null, user);

      } catch (error) {
        console.error('❌ Google OAuth 인증 오류:', error);
        return done(error, undefined);
      }
    }
    )
  );
}

// 사용자 직렬화 (세션에 저장할 정보)
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// 사용자 역직렬화 (세션에서 사용자 정보 복원)
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
