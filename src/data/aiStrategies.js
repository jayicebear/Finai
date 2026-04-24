export const AI_MODELS = [
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    maker: 'OpenAI',
    color: '#10a37f',
    desc: '균형잡힌 판단. 기술적 분석과 뉴스를 종합해 안정적인 신호를 생성.',
    interval: 4000,
    buyBias: 0.52,
    winRate: 60,
    confidenceRange: [68, 88],
    style: 'balanced',
  },
  {
    id: 'claude',
    name: 'Claude',
    maker: 'Anthropic',
    color: '#c9601a',
    desc: '신중하고 보수적. 확신이 높을 때만 매매. 리스크 관리에 강점.',
    interval: 6000,
    buyBias: 0.45,
    winRate: 64,
    confidenceRange: [74, 95],
    style: 'conservative',
  },
  {
    id: 'grok',
    name: 'Grok',
    maker: 'xAI',
    color: '#1d1d1d',
    desc: '공격적이고 빠름. 소셜 트렌드에 민감. 고수익·고위험 성향.',
    interval: 2500,
    buyBias: 0.60,
    winRate: 55,
    confidenceRange: [58, 85],
    style: 'aggressive',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    maker: 'Google',
    color: '#4285f4',
    desc: '데이터 중심. 대량 지표를 종합 분석. 중립적이고 꼼꼼한 판단.',
    interval: 5000,
    buyBias: 0.50,
    winRate: 58,
    confidenceRange: [65, 90],
    style: 'analytical',
  },
]

export const STRATEGIES = [
  {
    id: 'momentum',
    name: '모멘텀',
    desc: '상승 추세 종목을 추종. 강한 방향성이 있을 때 유리.',
  },
  {
    id: 'mean_reversion',
    name: '평균 회귀',
    desc: '과매도 종목 매수, 과매수 종목 매도. 횡보장에서 유리.',
  },
  {
    id: 'sentiment',
    name: '감성 분석',
    desc: '뉴스·소셜 데이터 기반 신호 생성. 이벤트 전후 강점.',
  },
  {
    id: 'ensemble',
    name: '앙상블',
    desc: '3가지 전략을 결합해 신호 생성. 안정성 최우선.',
  },
  {
    id: 'custom',
    name: '커스텀',
    desc: '직접 프롬프트를 입력해 나만의 전략을 정의하세요.',
  },
]

export const RISK_LEVELS = [
  { id: 'conservative', label: '보수적', color: '#2563eb', maxPerTrade: 0.05 },
  { id: 'neutral',      label: '중립',   color: '#d97706', maxPerTrade: 0.10 },
  { id: 'aggressive',   label: '공격적', color: '#dc2626', maxPerTrade: 0.20 },
]

const REASONS = {
  momentum: {
    balanced:      ['RSI 60 돌파 + 거래량 150% 급증', '20일 이평선 골든크로스 확인', 'MACD 시그널선 상향 돌파', '52주 신고가 근접, 돌파 가능성'],
    conservative:  ['다중 타임프레임 모멘텀 일치 확인', '저변동성 구간에서 강한 상방 이탈', '기관 매집 패턴 감지 후 모멘텀 확인', '3개월 고점 돌파, 추세 전환 신호'],
    aggressive:    ['급등 모멘텀 초기 진입 포착', '거래량 폭발 + 가격 급등 동반', '단기 모멘텀 극강 구간', '매수세 쏠림 현상 감지'],
    analytical:    ['모멘텀 팩터 Z-score 2.1 기록', '12/26 EMA 정배열 + ADX 28 돌파', '롤링 베타 기준 시장 대비 초과 모멘텀', '다중 지표 복합 모멘텀 점수 87점'],
  },
  mean_reversion: {
    balanced:      ['RSI 28 과매도 구간 진입', 'Bollinger Band 하단 이탈 후 반등', '3일 연속 하락 후 거래량 감소', '지지선 근처 매집 신호 감지'],
    conservative:  ['RSI 22 극단 과매도, 반등 확률 78%', '역사적 지지구간 + 거래량 바닥 확인', '평균 대비 -2.8σ 이탈, 회귀 가능성 높음', '저점 거래량 수렴 패턴, 반전 임박'],
    aggressive:    ['RSI 30 터치, 즉시 반등 진입', '급락 후 단기 반등 포착', '공포 지수 고점, 역투자 기회', '과매도 극단 구간 스캘핑 진입'],
    analytical:    ['페어 트레이딩 스프레드 2.3σ 이탈', '공적분 검정 통과, 회귀 기대값 산출', 'Z-score -2.1 기록, 평균 회귀 신호', '칼만 필터 기반 공정가 대비 -8.3% 이탈'],
  },
  sentiment: {
    balanced:      ['긍정 뉴스 감성 점수 0.82 기록', 'Reddit/X 언급량 전일 대비 300% 급증', '애널리스트 목표가 상향 3건', '부정 헤드라인 급감, 센티먼트 반전'],
    conservative:  ['주요 외신 긍정 보도 집중, 신뢰도 높음', '내부자 매수 신고 + 긍정 실적 가이던스', '기관 리포트 일제히 매수 의견 상향', '감성 점수 3주 연속 상승, 추세 확인'],
    aggressive:    ['X(트위터) 밈 급확산, 단기 급등 예상', 'WSB 언급량 500% 폭증, 숏스퀴즈 가능성', '유튜브 급등 영상 바이럴 감지', '소셜 버즈 점수 역대 최고치'],
    analytical:    ['NLP 감성 점수 0.91, 신뢰구간 95%', 'BERT 기반 뉴스 분류 긍정 94%', '감성-가격 상관계수 0.73 확인', '12개 뉴스 소스 종합 감성 점수 A+'],
  },
  ensemble: {
    balanced:      ['모멘텀 + 감성 강한 일치 신호', '3개 전략 동시 매수 신호', '평균회귀 + 모멘텀 복합 신호', '전략 신뢰도 합산 최고점 기록'],
    conservative:  ['4개 독립 모델 전원 매수 의견 일치', '앙상블 신뢰도 92%, 희귀 고점 신호', '모든 타임프레임 정배열 확인', '전략 간 상관관계 낮고 신호 일치'],
    aggressive:    ['복합 신호 강도 최고, 즉시 진입', '앙상블 가중 점수 상위 3% 기록', '전략 전원 일치, 강력 매수 신호', '멀티 신호 동시 발화, 고확률 진입'],
    analytical:    ['베이지안 앙상블 사후확률 0.88', '스태킹 메타모델 예측 신뢰도 89%', '5개 기저 모델 가중 평균 점수 최고', '교차검증 기반 앙상블 신호 강도 A'],
  },
}

function customReason(prompt, type) {
  if (!prompt) return '커스텀 전략 신호'
  // 프롬프트에서 키워드 추출해 신호 근거 생성
  const keywords = {
    rsi:      ['RSI 조건 충족', 'RSI 임계값 돌파'],
    macd:     ['MACD 시그널 감지', 'MACD 크로스 확인'],
    볼린저:   ['볼린저 밴드 조건 충족', '볼린저 이탈 신호'],
    이평선:   ['이동평균선 조건 충족', '이평선 크로스 감지'],
    거래량:   ['거래량 조건 충족', '거래량 급증 감지'],
    모멘텀:   ['모멘텀 조건 충족', '추세 모멘텀 확인'],
    급등:     ['급등 패턴 감지', '단기 급등 신호'],
    과매도:   ['과매도 구간 진입', '과매도 반등 신호'],
    과매수:   ['과매수 구간 감지', '과매수 조정 신호'],
  }
  const lower = prompt.toLowerCase()
  for (const [key, reasons] of Object.entries(keywords)) {
    if (lower.includes(key) || prompt.includes(key)) {
      return `[커스텀] ${reasons[Math.floor(Math.random() * reasons.length)]}`
    }
  }
  // 키워드 없으면 프롬프트 앞부분을 근거로 사용
  const excerpt = prompt.length > 40 ? prompt.slice(0, 40) + '…' : prompt
  return `[커스텀] ${excerpt}`
}

export function generateSignal(model, strategyId, stocks, customPrompt = '') {
  const stock = stocks[Math.floor(Math.random() * stocks.length)]
  const rand = Math.random()
  const type = rand < model.buyBias ? 'BUY' : rand < model.buyBias + 0.3 ? 'SELL' : 'HOLD'
  const [minC, maxC] = model.confidenceRange
  const confidence = Math.floor(Math.random() * (maxC - minC) + minC)

  let reason
  if (strategyId === 'custom') {
    reason = customReason(customPrompt, type)
  } else {
    const styleReasons = REASONS[strategyId]?.[model.style] || REASONS.ensemble.balanced
    reason = styleReasons[Math.floor(Math.random() * styleReasons.length)]
  }

  return {
    id: Date.now() + Math.random(),
    stock,
    type,
    confidence,
    reason,
    time: '방금',
    model: model.name,
    executed: false,
  }
}
