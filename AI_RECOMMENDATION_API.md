# 🤖 AI 추천 시스템 API 가이드

## 개요

ChatGPT API를 활용한 개인화 메뉴 추천 시스템입니다. 사용자의 과거 주문 이력을 분석하여 AI가 개인 맞춤형 메뉴를 추천합니다.

## 🚀 주요 기능

- **사용자 주문 이력 분석**: 최근 3개월 주문 데이터를 기반으로 선호도 파악
- **ChatGPT AI 추천**: 고도화된 AI 알고리즘으로 개인화 점수 계산
- **다양한 필터링**: 카테고리, 가격대, 수령방법 기반 필터링
- **실시간 위치 기반**: 사용자 위치에서 30km 이내 매장만 추천

## 📡 API 엔드포인트

### POST `/api/discover/ai-recommend`

**인증**: JWT 토큰 필요 (Bearer Token)

**요청 본문**:
```json
{
  "categories": ["일식", "한식"],
  "maxPrice": 20000,
  "deliveryMethod": "all",
  "lat": 37.5665,
  "lng": 126.9780,
  "limit": 10
}
```

**요청 필드**:
- `categories` (필수): 원하는 카테고리 배열 (여러 개 선택 가능)
  - 가능한 값: `['일식','한식','중식','양식','빵','디저트','스페인 요리','멕시코 요리','패스트 푸드','건강식','비건','할랄','인도음식']`
  - 예시: `["일식", "한식"]`, `["디저트"]`, `["일식", "중식", "양식"]`
- `maxPrice` (필수): 최대 가격 (원)
- `deliveryMethod` (필수): 수령 방법
  - `"all"`: 배달/픽업 모두
  - `"delivery"`: 배달만
  - `"pickup"`: 픽업만
- `lat` (필수): 위도 좌표
- `lng` (필수): 경도 좌표
- `limit` (선택): 추천 개수 (기본값: 10)

## 📋 응답 형식

```json
{
  "success": true,
  "message": "AI가 분석한 일식, 한식 카테고리 추천 결과입니다.",
  "userProfile": {
    "favoriteCategories": ["일식", "한식"],
    "avgOrderPrice": 15500,
    "preferredOrderType": "pickup",
    "totalOrders": 12,
    "recentOrders": [
      {
        "menuName": "스페셜 밀박스",
        "category": "일식",
        "price": 7500,
        "orderType": "pickup"
      }
    ]
  },
  "request": {
    "categories": ["일식", "한식"],
    "maxPrice": 20000,
    "deliveryMethod": "all",
    "limit": 10
  },
  "stats": {
    "totalFiltered": 25,
    "recommended": 10,
    "avgScore": 78
  },
  "recommendations": [
    {
      "storeId": "68a82e928bffc6b47fcda012",
      "storeName": "마루스시",
      "menuId": "68a82e938bffc6b47fcda04b",
      "menuName": "스페셜 밀박스",
      "menuImageUrls": [
        "https://no-janban-day.s3.eu-north-1.amazonaws.com/menu-images/해산물1.jpg"
      ],
      "stockLeft": 8,
      "originalMenuPrice": 18500,
      "discountedMenuPrice": 7500,
      "discountedPercentage": 60,
      "pickUpStartTime": "20250822 08:30:00",
      "pickUpEndTime": "20250822 10:30:00",
      "storeDistance": 7.29,
      "pickupPrice": 7000,
      "aiScore": 92,
      "aiReason": "사용자가 선호하는 일식 카테고리이며, 평균 주문 금액과 비슷한 가격대입니다. 높은 할인율로 가성비가 우수합니다."
    }
  ]
}
```

## 🧠 AI 추천 알고리즘

### 1. 사용자 선호도 분석
- **선호 카테고리**: 최근 3개월 주문에서 상위 3개 카테고리 추출
- **평균 주문 금액**: 사용자의 평균 결제 금액 계산
- **선호 주문 방식**: 배달/픽업 선호도 분석
- **주문 시간대**: 자주 주문하는 시간대 패턴 분석

### 2. ChatGPT AI 점수 계산 (100점 만점)
- **카테고리 매칭 (30점)**: 요청한 카테고리와의 일치도
- **가격 적정성 (25점)**: 사용자 평균 주문 금액 대비 적정성
- **선호도 일치 (25점)**: 과거 주문 패턴과의 일치성
- **가치 제안 (20점)**: 할인율, 특별함 등 추가 가치

### 3. 필터링 로직
1. **위치 기반**: 30km 이내 매장
2. **카테고리 필터**: 요청 카테고리와 정확히 일치
3. **가격 필터**: 최대 가격 이하
4. **재고 확인**: 재고가 있는 메뉴만
5. **수령 방법**: 배달/픽업 조건에 맞는 메뉴

## 🔧 설정 방법

### 1. 환경 변수 추가
```env
# .env 파일에 추가
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. OpenAI API 키 발급
1. [OpenAI Platform](https://platform.openai.com/)에서 계정 생성
2. API Keys 메뉴에서 새 키 생성
3. 환경 변수에 설정

### 3. 의존성 설치
```bash
npm install openai
```

## 📱 사용 예시

### cURL 예시
```bash
curl -X POST http://localhost:8000/api/discover/ai-recommend \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categories": ["일식", "한식"],
    "maxPrice": 20000,
    "deliveryMethod": "pickup",
    "lat": 37.5665,
    "lng": 126.9780,
    "limit": 5
  }'
```

### JavaScript 예시
```javascript
const response = await fetch('/api/discover/ai-recommend', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    categories: ['한식', '일식'],
    maxPrice: 15000,
    deliveryMethod: 'all',
    lat: 37.5665,
    lng: 126.9780,
    limit: 10
  })
});

const data = await response.json();
console.log('AI 추천 결과:', data.recommendations);
```

### React 예시
```jsx
const [recommendations, setRecommendations] = useState([]);
const [loading, setLoading] = useState(false);

const getAIRecommendations = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/discover/ai-recommend', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        categories: ['디저트', '빵'],
        maxPrice: 12000,
        deliveryMethod: 'delivery',
        lat: userLocation.lat,
        lng: userLocation.lng,
        limit: 8
      })
    });

    const data = await response.json();
    if (data.success) {
      setRecommendations(data.recommendations);
    }
  } catch (error) {
    console.error('AI 추천 오류:', error);
  } finally {
    setLoading(false);
  }
};
```

## 🎯 활용 시나리오

### 1. 개인화 홈 화면
```javascript
// 사용자의 평소 선호도를 바탕으로 추천
{
  "categories": userProfile.favoriteCategories.slice(0, 2), // 상위 2개 선호 카테고리
  "maxPrice": userProfile.avgOrderPrice * 1.2,
  "deliveryMethod": userProfile.preferredOrderType,
  "lat": currentLocation.lat,
  "lng": currentLocation.lng
}
```

### 2. 카테고리별 스마트 추천
```javascript
// 여러 카테고리 동시 선택 시 개인화 추천
{
  "categories": ["일식", "중식", "양식"], // 여러 카테고리 동시 선택
  "maxPrice": 25000,
  "deliveryMethod": "all",
  "lat": currentLocation.lat,
  "lng": currentLocation.lng,
  "limit": 15
}
```

### 3. 예산 기반 추천
```javascript
// 예산 설정 후 최적화 추천
{
  "categories": selectedCategories, // 사용자가 선택한 여러 카테고리
  "maxPrice": budgetSlider.value,
  "deliveryMethod": deliveryPreference,
  "lat": currentLocation.lat,
  "lng": currentLocation.lng
}
```

## ⚠️ 주의사항

1. **인증 필수**: JWT 토큰이 반드시 필요합니다
2. **API 키 필수**: OpenAI API 키가 설정되어 있어야 합니다
3. **위치 권한**: 사용자의 현재 위치 정보가 필요합니다
4. **주문 이력**: 추천 품질은 사용자의 주문 이력에 따라 달라집니다
5. **API 비용**: ChatGPT API 호출로 인한 비용이 발생합니다

## 🚨 오류 처리

### 인증 오류 (401)
```json
{
  "success": false,
  "message": "인증이 필요합니다."
}
```

### 유효성 검사 오류 (400)
```json
{
  "success": false,
  "message": "categories, maxPrice, deliveryMethod, lat, lng는 필수 항목입니다.",
  "required": {
    "categories": "카테고리 배열 ([\"일식\", \"한식\"] 형태)",
    "maxPrice": "최대 가격 (숫자)",
    "deliveryMethod": "수령 방법 (all, delivery, pickup)",
    "lat": "위도 (숫자)",
    "lng": "경도 (숫자)"
  }
}
```

### 서버 오류 (500)
```json
{
  "success": false,
  "message": "AI 추천 시스템에 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
}
```

## 📊 성능 최적화

1. **캐싱**: 사용자 선호도는 1시간 캐싱 권장
2. **배치 처리**: 여러 카테고리 동시 요청 시 병렬 처리
3. **로딩 상태**: AI 분석에 2-5초 소요되므로 로딩 UI 필수
4. **오류 대응**: ChatGPT API 오류 시 기본 알고리즘으로 fallback

---

이 AI 추천 시스템으로 사용자에게 맞춤형 메뉴를 제공하여 사용자 만족도와 주문 전환율을 높일 수 있습니다! 🎉
