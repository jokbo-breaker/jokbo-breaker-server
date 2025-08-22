// config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';

// ─────────────────────────────────────────────────────────────
// 필수 ENV 점검
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
// ─────────────────────────────────────────────────────────────
const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

if (!clientID || !clientSecret || !callbackURL) {
  console.warn('⚠️ Google OAuth 환경변수 누락: GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL');
  console.warn('   Google OAuth를 비활성화합니다. (JWT 등 다른 로그인만 동작)');
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL, // ★ 반드시 env 기반 절대 URL (배포 주소)
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // email이 없으면 거절
          const email = profile.emails?.[0]?.value;
          if (!email) return done(null, false);

          // googleId로 먼저 조회
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // 변경 가능 필드 갱신
            user.name = profile.displayName || user.name;
            user.picture = profile.photos?.[0]?.value || user.picture;
            await user.save();
            return done(null, user);
          }

          // 신규 생성
          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName || email.split('@')[0],
            picture: profile.photos?.[0]?.value,
            totalPurchaseCount: 0,
            totalFoodAmount: 0,
            preferences: {
              favoriteCategories: [],
              allergens: [],
              dietaryRestrictions: [],
            },
          });

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

// 세션을 쓰지 않아도 안전하게 남겨둠(라우터에서 session:false 사용 중)
passport.serializeUser((user: any, done) => done(null, user._id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || null);
  } catch (e) {
    done(e as Error, null);
  }
});

export default passport;
