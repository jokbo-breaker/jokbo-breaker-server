# 주문 API 응답 필드 가이드

## 📋 주문 조회 API 응답 필드 설명

### 🏪 **주문 레벨 필드**

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `orderId` | string | 주문 고유 ID | "68a85220ddda59d90a443260" |
| `storeId` | string | 매장 고유 ID | "68a82e928bffc6b47fcda012" |
| `storeName` | string | 매장명 | "파동추야" |
| `orderType` | string | 주문 유형 | "pickup" \| "delivery" |
| `paymentMethod` | string | 결제 방법 | "card" \| "onsite" |
| `totalQuantity` | number | 전체 주문 수량 | 2 |
| `totalAmount` | number | **순 주문 금액** (배달비 제외) | 19000 |
| `totalGrams` | number | 전체 음식량 (그램) | 1040 |
| `deliveryFee` | number? | **배달비** (배달 주문일 때만) | 3000 |
| `finalAmount` | number | **최종 결제 금액** (totalAmount + deliveryFee) | 22000 |
| `status` | string | 주문 상태 | "pending" \| "confirmed" \| "preparing" \| "ready" \| "completed" \| "cancelled" |
| `orderDate` | string | 주문 일시 | "20250822 11:18:56" |

---

### 🍔 **주문 아이템 레벨 필드**

#### **💰 가격 관련 필드 (헷갈리기 쉬운 필드들!)**

| 필드명 | 타입 | 설명 | 계산식 | 예시 |
|--------|------|------|---------|------|
| `originalMenuPrice` | number | **할인 전 개당 원가** | 메뉴의 원래 가격 | 18500 |
| `originalTotalPrice` | number | **할인 전 총 원가** | originalMenuPrice × quantity | 37000 |
| `discountedMenuPrice` | number | **할인 후 개당 가격** | 실제 판매 가격 | 7500 |
| `unitPrice` | number | **주문 당시 적용된 단가** | 픽업/배달에 따른 실제 결제 가격 | 9500 |
| `totalPrice` | number | **실제 결제된 총 가격** | unitPrice × quantity | 19000 |
| `pickupPrice` | number? | **픽업 전용 가격** (픽업 주문일 때만) | 픽업시 할인가 | 7000 |

#### **📊 수량 및 정보 필드**

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `menuId` | string | 메뉴 고유 ID | "68a82e928bffc6b47fcda049" |
| `menuName` | string | 메뉴명 | "시크릿 밀박스" |
| `quantity` | number | 주문 수량 | 2 |
| `gramPerUnit` | number | 메뉴 1개당 그램수 | 520 |
| `totalGrams` | number | 총 그램수 | 1040 |
| `menuImageUrls` | string[] | 메뉴 이미지 URL 배열 | ["https://...jpg"] |
| `discountedPercentage` | number | 할인율 (%) | 60 |
| `currentStockLeft` | number | **현재 재고량** (조회 시점 기준) | 8 |

---

## 🔍 **헷갈리기 쉬운 가격 필드 정리**

### **시나리오 예시:**
- **원래 메뉴 가격**: 18,500원 (`originalMenuPrice`)
- **할인율**: 60% (`discountedPercentage`)
- **할인 후 가격**: 7,500원 (`discountedMenuPrice`)
- **픽업 가격**: 7,000원 (`pickupPrice` - 픽업 주문일 때만)
- **주문 수량**: 2개 (`quantity`)
- **주문 유형**: 픽업 (`orderType`)

### **계산 결과:**
```json
{
  "originalMenuPrice": 18500,        // 할인 전 개당 원가
  "originalTotalPrice": 37000,       // 18500 × 2 = 37,000원
  "discountedMenuPrice": 7500,       // 할인 후 개당 가격
  "pickupPrice": 7000,               // 픽업 전용 가격 (픽업일 때만)
  "unitPrice": 7000,                 // 실제 적용된 단가 (픽업가격)
  "totalPrice": 14000,               // 7000 × 2 = 14,000원
  "quantity": 2,
  "currentStockLeft": 8              // 현재 남은 재고
}
```

---

## 📱 **조건부 필드 표시 규칙**

### 1. **픽업 주문인 경우**
- ✅ `pickupPrice` 포함
- ❌ `deliveryFee` 제외 (또는 0)

### 2. **배달 주문인 경우**
- ❌ `pickupPrice` 제외
- ✅ `deliveryFee` 포함

### 3. **주문 상태별 표시**
- **진행 중**: `currentStockLeft` 표시 (재주문 가능 여부 확인용)
- **완료/취소**: 모든 정보 유지

---

## 🚀 **주요 사용 사례**

### **1. 주문 내역 화면에 표시할 정보**
```javascript
// 메뉴 이미지
item.menuImageUrls[0]

// 메뉴명 + 수량
`${item.menuName} x${item.quantity}`

// 할인 정보 표시
`${item.discountedPercentage}% 할인`
`원가 ${item.originalTotalPrice}원 → ${item.totalPrice}원`

// 현재 재고 (재주문 버튼 활성화 여부)
item.currentStockLeft > 0 ? "재주문 가능" : "품절"
```

### **2. 가격 계산 검증**
```javascript
// 할인 금액 계산
const discountAmount = item.originalTotalPrice - item.totalPrice;

// 최종 주문 금액 = 모든 아이템의 totalPrice 합계
const orderTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);

// 배달비 포함 최종 금액
const finalTotal = orderTotal + (order.deliveryFee || 0);
```

이 명세서를 참고하시면 각 필드의 의미와 사용 목적이 명확해질 것입니다! 🎯
