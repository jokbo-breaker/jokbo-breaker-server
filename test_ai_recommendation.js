/**
 * AI 추천 시스템 테스트 스크립트
 *
 * 사용 방법:
 * 1. 서버 실행: npm run dev
 * 2. 테스트 실행: node test_ai_recommendation.js
 */

const axios = require('axios');

// 설정
const BASE_URL = 'http://localhost:8000/api';
const TEST_USER = {
  email: 'test@example.com',
  name: 'AI 테스트 사용자'
};

// 테스트 데이터
const TEST_REQUESTS = [
  {
    name: '일식 단일 카테고리 추천',
    data: {
      categories: ['일식'],
      maxPrice: 20000,
      deliveryMethod: 'all',
      lat: 37.5665, // 서울 중심가
      lng: 126.9780,
      limit: 5
    }
  },
  {
    name: '한식+일식 다중 카테고리 배달 전용',
    data: {
      categories: ['한식', '일식'],
      maxPrice: 15000,
      deliveryMethod: 'delivery',
      lat: 37.5665,
      lng: 126.9780,
      limit: 3
    }
  },
  {
    name: '디저트+빵 카테고리 픽업 전용',
    data: {
      categories: ['디저트', '빵'],
      maxPrice: 12000,
      deliveryMethod: 'pickup',
      lat: 37.5665,
      lng: 126.9780,
      limit: 8
    }
  },
  {
    name: '다양한 카테고리 조합 테스트',
    data: {
      categories: ['일식', '중식', '양식'],
      maxPrice: 25000,
      deliveryMethod: 'all',
      lat: 37.5665,
      lng: 126.9780,
      limit: 10
    }
  }
];

let authToken = '';

// 색상 출력을 위한 유틸
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. 로그인 (실제 구현에서는 실제 사용자 토큰을 사용하세요)
async function login() {
  try {
    log('cyan', '\n🔐 로그인 중...');

    // 실제 환경에서는 Google OAuth나 Apple 로그인을 사용하세요
    // 여기서는 테스트용으로 API 상태만 확인
    const response = await axios.get(`${BASE_URL}/auth/status`);

    if (response.data.success) {
      log('green', '✅ 서버 연결 성공');
      return true;
    }

    return false;
  } catch (error) {
    log('red', `❌ 로그인 실패: ${error.message}`);
    return false;
  }
}

// 2. AI 추천 API 테스트
async function testAIRecommendation(testCase) {
  try {
    log('yellow', `\n🤖 테스트: ${testCase.name}`);
    log('blue', `요청 데이터: ${JSON.stringify(testCase.data, null, 2)}`);

    const response = await axios.post(
      `${BASE_URL}/discover/ai-recommend`,
      testCase.data,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;

    if (data.success) {
      log('green', '✅ AI 추천 성공!');
      log('cyan', `📊 통계:`);
      log('cyan', `  - 필터링된 메뉴: ${data.stats?.totalFiltered || 0}개`);
      log('cyan', `  - 추천된 메뉴: ${data.stats?.recommended || 0}개`);
      log('cyan', `  - 평균 AI 점수: ${data.stats?.avgScore || 0}점`);

      log('magenta', `👤 사용자 프로필:`);
      log('magenta', `  - 선호 카테고리: ${data.userProfile?.favoriteCategories?.join(', ') || '없음'}`);
      log('magenta', `  - 평균 주문 금액: ${data.userProfile?.avgOrderPrice?.toLocaleString() || 0}원`);
      log('magenta', `  - 총 주문 횟수: ${data.userProfile?.totalOrders || 0}회`);

      if (data.recommendations && data.recommendations.length > 0) {
        log('green', '\n🍜 추천 메뉴:');
        data.recommendations.slice(0, 3).forEach((menu, index) => {
          log('green', `${index + 1}. ${menu.menuName} (${menu.storeName})`);
          log('green', `   💰 ${menu.discountedMenuPrice.toLocaleString()}원 (${menu.discountedPercentage}% 할인)`);
          log('green', `   🤖 AI 점수: ${menu.aiScore}점`);
          log('green', `   💡 추천 이유: ${menu.aiReason}`);
          log('green', `   📍 거리: ${menu.storeDistance}km`);
          console.log('');
        });
      } else {
        log('yellow', '⚠️ 추천된 메뉴가 없습니다.');
      }

      return true;
    } else {
      log('red', `❌ AI 추천 실패: ${data.message}`);
      return false;
    }

  } catch (error) {
    if (error.response) {
      log('red', `❌ API 오류 (${error.response.status}): ${error.response.data.message}`);
      if (error.response.status === 401) {
        log('yellow', '💡 힌트: JWT 토큰이 필요합니다. 실제 로그인을 통해 토큰을 얻어주세요.');
      }
    } else {
      log('red', `❌ 네트워크 오류: ${error.message}`);
    }
    return false;
  }
}

// 3. 서버 상태 확인
async function checkServerStatus() {
  try {
    log('cyan', '\n🚀 서버 상태 확인 중...');

    const response = await axios.get(`${BASE_URL}`);

    if (response.data.success) {
      log('green', '✅ 서버 정상 작동');
      log('blue', `📄 API 버전: ${response.data.version}`);

      // AI 추천 엔드포인트 확인
      if (response.data.endpoints?.discover?.['POST /api/discover/ai-recommend']) {
        log('green', '✅ AI 추천 엔드포인트 등록됨');
        return true;
      } else {
        log('red', '❌ AI 추천 엔드포인트가 등록되지 않음');
        return false;
      }
    }

    return false;
  } catch (error) {
    log('red', `❌ 서버 연결 실패: ${error.message}`);
    log('yellow', '💡 서버가 실행 중인지 확인해주세요: npm run dev');
    return false;
  }
}

// 메인 테스트 함수
async function runTests() {
  log('bright', '🎯 AI 추천 시스템 테스트 시작\n');

  // 1. 서버 상태 확인
  const serverOk = await checkServerStatus();
  if (!serverOk) {
    log('red', '\n❌ 테스트 중단: 서버 문제');
    return;
  }

  // 2. 로그인 (실제로는 유효한 JWT 토큰이 필요)
  const loginOk = await login();
  if (!loginOk) {
    log('yellow', '\n⚠️ 로그인 없이 테스트 계속 (인증 오류 예상)');
  }

  // 3. AI 추천 테스트 실행
  let successCount = 0;
  for (const testCase of TEST_REQUESTS) {
    const success = await testAIRecommendation(testCase);
    if (success) successCount++;

    // 테스트 간 간격
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 4. 결과 요약
  log('bright', `\n📋 테스트 결과 요약:`);
  log('green', `✅ 성공: ${successCount}/${TEST_REQUESTS.length}`);
  log('red', `❌ 실패: ${TEST_REQUESTS.length - successCount}/${TEST_REQUESTS.length}`);

  if (successCount === 0) {
    log('yellow', '\n💡 테스트 실행 가이드:');
    log('yellow', '1. 서버 실행: npm run dev');
    log('yellow', '2. .env 파일에 OPENAI_API_KEY 설정');
    log('yellow', '3. 실제 사용자로 로그인하여 JWT 토큰 획득');
    log('yellow', '4. 토큰을 authToken 변수에 설정 후 재실행');
  }

  log('bright', '\n🎉 테스트 완료!');
}

// 실제 토큰으로 테스트하는 함수 (수동 설정 필요)
function setTestToken(token) {
  authToken = token;
  log('green', '✅ 테스트 토큰 설정됨');
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(error => {
    log('red', `\n💥 예상치 못한 오류: ${error.message}`);
    process.exit(1);
  });
}

// 모듈로 사용할 수 있도록 내보내기
module.exports = {
  runTests,
  setTestToken,
  testAIRecommendation,
  checkServerStatus
};
