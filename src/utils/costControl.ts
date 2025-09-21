/**
 * 비용 제어 유틸리티
 */

// 일일 API 호출 제한
let dailyApiCalls = 0;
let lastResetDate = new Date().toDateString();

export interface CostControlConfig {
  maxDailyApiCalls: number;
  maxMenusForAI: number;
  aiThresholdScore: number; // 이 점수 이하일 때만 AI 사용
  enableAI: boolean;
}

export function getCostControlConfig(): CostControlConfig {
  return {
    maxDailyApiCalls: parseInt(process.env.MAX_DAILY_AI_CALLS || '100'),
    maxMenusForAI: parseInt(process.env.MAX_MENUS_FOR_AI || '20'),
    aiThresholdScore: parseInt(process.env.AI_THRESHOLD_SCORE || '70'),
    enableAI: process.env.ENABLE_AI_RECOMMENDATIONS === 'true'
  };
}

/**
 * API 호출 제한 확인
 */
export function canUseAI(): boolean {
  const config = getCostControlConfig();

  if (!config.enableAI) {
    return false;
  }

  // 날짜가 바뀌면 카운터 리셋
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyApiCalls = 0;
    lastResetDate = today;
  }

  return dailyApiCalls < config.maxDailyApiCalls;
}

/**
 * API 호출 카운터 증가
 */
export function incrementApiCall(): void {
  dailyApiCalls++;
  console.log(`일일 AI API 호출: ${dailyApiCalls}/${getCostControlConfig().maxDailyApiCalls}`);
}

/**
 * 스마트 AI 사용 결정 로직
 */
export function shouldUseAI(
  menuCount: number,
  avgLocalScore: number,
  isVipUser: boolean = false
): boolean {
  const config = getCostControlConfig();

  // VIP 사용자는 항상 AI 사용 (별도 제한)
  if (isVipUser) {
    return canUseAI();
  }

  // 기본 조건 확인
  if (!canUseAI()) {
    return false;
  }

  // 메뉴 수가 너무 많으면 AI 사용 안함 (비용 절약)
  if (menuCount > config.maxMenusForAI) {
    return false;
  }

  // 로컬 스코어링 평균이 낮을 때만 AI 사용
  if (avgLocalScore >= config.aiThresholdScore) {
    return false;
  }

  return true;
}

/**
 * 통계 조회
 */
export function getApiUsageStats() {
  return {
    dailyCalls: dailyApiCalls,
    maxCalls: getCostControlConfig().maxDailyApiCalls,
    remainingCalls: getCostControlConfig().maxDailyApiCalls - dailyApiCalls,
    lastReset: lastResetDate
  };
}


