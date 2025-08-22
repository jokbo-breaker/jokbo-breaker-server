# 🍜 다중 카테고리 AI 추천 시스템 사용 예시

## 개요
이제 AI 추천 시스템에서 여러 카테고리를 동시에 선택할 수 있습니다! 하나의 요청으로 다양한 음식 종류를 함께 추천받을 수 있어 더욱 편리합니다.

## 📱 사용 사례별 예시

### 1. 단일 카테고리 (기존 방식과 동일)
```json
{
  "categories": ["일식"],
  "maxPrice": 20000,
  "deliveryMethod": "all",
  "lat": 37.5665,
  "lng": 126.9780,
  "limit": 10
}
```

### 2. 아시아 음식 조합
```json
{
  "categories": ["일식", "한식", "중식"],
  "maxPrice": 25000,
  "deliveryMethod": "pickup",
  "lat": 37.5665,
  "lng": 126.9780,
  "limit": 15
}
```

### 3. 달콤한 것들 조합
```json
{
  "categories": ["디저트", "빵"],
  "maxPrice": 15000,
  "deliveryMethod": "delivery",
  "lat": 37.5665,
  "lng": 126.9780,
  "limit": 8
}
```

### 4. 서양 요리 조합
```json
{
  "categories": ["양식", "스페인 요리", "멕시코 요리"],
  "maxPrice": 30000,
  "deliveryMethod": "all",
  "lat": 37.5665,
  "lng": 126.9780,
  "limit": 12
}
```

### 5. 건강한 식단 조합
```json
{
  "categories": ["건강식", "비건", "할랄"],
  "maxPrice": 20000,
  "deliveryMethod": "pickup",
  "lat": 37.5665,
  "lng": 126.9780,
  "limit": 10
}
```

### 6. 간편한 음식 조합
```json
{
  "categories": ["패스트 푸드", "빵"],
  "maxPrice": 12000,
  "deliveryMethod": "delivery",
  "lat": 37.5665,
  "lng": 126.9780,
  "limit": 6
}
```

### 7. 전체 카테고리 (모든 음식 종류)
```json
{
  "categories": [
    "일식", "한식", "중식", "양식", "빵", "디저트",
    "스페인 요리", "멕시코 요리", "패스트 푸드",
    "건강식", "비건", "할랄", "인도음식"
  ],
  "maxPrice": 50000,
  "deliveryMethod": "all",
  "lat": 37.5665,
  "lng": 126.9780,
  "limit": 20
}
```

## 🧠 AI가 다중 카테고리를 처리하는 방법

### 1. 카테고리 매칭 점수 계산
- **완전 일치**: 선택한 카테고리 중 하나와 정확히 일치하는 메뉴는 30점
- **부분 매칭**: 여러 카테고리 선택 시 각 메뉴는 해당되는 카테고리에 따라 점수 계산

### 2. 선호도 분석 강화
- 사용자가 선택한 여러 카테고리와 과거 주문 이력의 교집합 분석
- 다양한 카테고리를 선택할수록 더 개인화된 추천 가능

### 3. ChatGPT 프롬프트 최적화
```
## 현재 요청
- 원하는 카테고리: 일식, 한식, 중식
- 최대 가격: 25,000원
- 수령 방법: all

사용자가 여러 카테고리를 선택했으므로, 각 카테고리의 특성을 고려하여
균형 잡힌 추천을 제공해주세요.
```

## 💡 실전 활용 팁

### 1. UI/UX 권장사항
```jsx
// 다중 선택 체크박스 예시
const [selectedCategories, setSelectedCategories] = useState(['일식']);

const categoryOptions = [
  '일식', '한식', '중식', '양식', '빵', '디저트',
  '스페인 요리', '멕시코 요리', '패스트 푸드',
  '건강식', '비건', '할랄', '인도음식'
];

const handleCategoryToggle = (category) => {
  setSelectedCategories(prev =>
    prev.includes(category)
      ? prev.filter(c => c !== category)
      : [...prev, category]
  );
};
```

### 2. 스마트 추천 로직
```javascript
// 사용자 선호도 기반 자동 카테고리 추가
const getSmartCategories = (userProfile) => {
  const baseCategory = userInput.category;
  const relatedCategories = userProfile.favoriteCategories
    .filter(cat => cat !== baseCategory)
    .slice(0, 2);

  return [baseCategory, ...relatedCategories];
};

// 시간대별 추천
const getTimeBasedCategories = () => {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 10) {
    return ['빵', '건강식']; // 아침
  } else if (hour >= 14 && hour < 17) {
    return ['디저트', '빵']; // 오후 간식
  } else if (hour >= 17 && hour < 21) {
    return ['한식', '일식', '중식']; // 저녁
  }

  return ['패스트 푸드', '디저트']; // 야식
};
```

### 3. 응답 처리 최적화
```javascript
const processMultiCategoryResponse = (response) => {
  const { recommendations } = response.data;

  // 카테고리별로 그룹화
  const byCategory = recommendations.reduce((acc, item) => {
    const category = item.category || '기타';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  // 카테고리별 최고 점수 추천
  const topByCategory = Object.keys(byCategory).map(category => ({
    category,
    topRecommendation: byCategory[category][0], // 이미 점수순 정렬됨
    count: byCategory[category].length
  }));

  return {
    all: recommendations,
    byCategory,
    topByCategory
  };
};
```

## 🎯 비즈니스 활용 시나리오

### 1. 테마별 추천
- **데이트 코스**: `["양식", "디저트"]`
- **가족 식사**: `["한식", "중식", "일식"]`
- **다이어트 중**: `["건강식", "비건"]`
- **늦은 밤**: `["패스트 푸드", "빵"]`

### 2. 이벤트 연동
- **랜치 타임**: `["한식", "중식", "일식", "양식"]`
- **애프터눈 티**: `["디저트", "빵"]`
- **해피 아워**: `["패스트 푸드", "양식"]`

### 3. 개인화 자동 설정
```javascript
// 사용자 선호도 기반 자동 다중 카테고리 설정
const autoCategories = user.favoriteCategories.slice(0, 3);
const suggestion = {
  categories: autoCategories,
  maxPrice: user.avgOrderPrice * 1.2,
  deliveryMethod: user.preferredOrderType,
  // ...
};
```

## 📊 성능 및 비용 최적화

### 1. 카테고리 수 제한
- **권장**: 1-3개 카테고리
- **최대**: 5개까지 (성능상 이유)
- **모든 카테고리 선택 시 주의**: ChatGPT API 비용 증가

### 2. 캐싱 전략
```javascript
// 다중 카테고리 조합별 캐싱
const cacheKey = `ai-recommend:${userId}:${categories.sort().join(',')}:${maxPrice}:${deliveryMethod}`;
const cachedResult = await redis.get(cacheKey);
if (cachedResult) {
  return JSON.parse(cachedResult);
}
```

## 🚀 향후 개선 방향

1. **카테고리 간 상관관계 분석**: 함께 주문되는 카테고리 패턴 학습
2. **지역별 인기 조합**: 지역마다 다른 카테고리 조합 선호도 반영
3. **시즌별 추천**: 계절에 따른 카테고리 가중치 조정
4. **소셜 추천**: 친구들이 선택한 카테고리 조합 제안

---

이제 사용자들이 더욱 다양하고 유연한 방식으로 AI 추천을 받을 수 있습니다! 🎉
