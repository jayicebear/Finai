import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Graph as G6Graph } from '@antv/g6'
import styles from './Graph.module.css'

/* ─── 색상 ───────────────────────────────────────────────── */
const SECTOR_COLORS = {
  Technology:  '#6366f1',
  Finance:     '#f59e0b',
  Healthcare:  '#10b981',
  Energy:      '#ef4444',
  Consumer:    '#3b82f6',
  Industrial:  '#8b5cf6',
}

/* ─── 상관 모드 ───────────────────────────────────────────── */
const MODES = [
  { id: 'sector',  label: '섹터 동조',   desc: '같은 업종·섹터 내 동반 움직임' },
  { id: 'price',   label: '주가 동조',   desc: '시장 국면에서 함께 오르고 내리는 종목' },
  { id: 'inverse', label: '역상관',      desc: '반대로 움직이는 헤징·로테이션 관계' },
  { id: 'supply',  label: '공급망',      desc: '부품·서비스 공급자 → 수요자 관계' },
  { id: 'macro',   label: '거시 민감도', desc: '금리·달러·인플레이션 동일 노출 종목' },
]

/* ─── 종목 ───────────────────────────────────────────────── */
const STOCKS = [
  { id: 'AAPL',  name: 'Apple',            sector: 'Technology', mcap: 3000 },
  { id: 'MSFT',  name: 'Microsoft',         sector: 'Technology', mcap: 2800 },
  { id: 'NVDA',  name: 'NVIDIA',            sector: 'Technology', mcap: 2100 },
  { id: 'GOOGL', name: 'Alphabet',          sector: 'Technology', mcap: 1900 },
  { id: 'META',  name: 'Meta',              sector: 'Technology', mcap: 1300 },
  { id: 'TSLA',  name: 'Tesla',             sector: 'Technology', mcap:  650 },
  { id: 'JPM',   name: 'JPMorgan',          sector: 'Finance',    mcap:  550 },
  { id: 'V',     name: 'Visa',              sector: 'Finance',    mcap:  520 },
  { id: 'BAC',   name: 'Bank of America',   sector: 'Finance',    mcap:  310 },
  { id: 'GS',    name: 'Goldman Sachs',     sector: 'Finance',    mcap:  140 },
  { id: 'UNH',   name: 'UnitedHealth',      sector: 'Healthcare', mcap:  440 },
  { id: 'JNJ',   name: 'J&J',              sector: 'Healthcare', mcap:  400 },
  { id: 'ABBV',  name: 'AbbVie',            sector: 'Healthcare', mcap:  310 },
  { id: 'PFE',   name: 'Pfizer',            sector: 'Healthcare', mcap:  160 },
  { id: 'XOM',   name: 'ExxonMobil',        sector: 'Energy',     mcap:  480 },
  { id: 'CVX',   name: 'Chevron',           sector: 'Energy',     mcap:  290 },
  { id: 'AMZN',  name: 'Amazon',            sector: 'Consumer',   mcap: 1900 },
  { id: 'WMT',   name: 'Walmart',           sector: 'Consumer',   mcap:  420 },
  { id: 'NFLX',  name: 'Netflix',           sector: 'Consumer',   mcap:  270 },
  { id: 'NKE',   name: 'Nike',              sector: 'Consumer',   mcap:  150 },
  { id: 'CAT',   name: 'Caterpillar',       sector: 'Industrial', mcap:  165 },
  { id: 'HON',   name: 'Honeywell',         sector: 'Industrial', mcap:  130 },
  { id: 'BA',    name: 'Boeing',            sector: 'Industrial', mcap:  130 },
]

const STOCK_MAP = Object.fromEntries(STOCKS.map(s => [s.id, s]))

/* ─── 섹터별 초기 위치 계산 (React Flow 때와 동일 방식) ──── */
const SECTOR_ANGLES = {
  Technology:  -60,
  Finance:      0,
  Healthcare:   60,
  Energy:      120,
  Consumer:    180,
  Industrial:  240,
}

function computePositions(W = 700, H = 500) {
  const cx = W / 2, cy = H / 2, sectorR = 190
  const groups = {}
  STOCKS.forEach(s => {
    if (!groups[s.sector]) groups[s.sector] = []
    groups[s.sector].push(s)
  })
  const pos = {}
  STOCKS.forEach(stock => {
    const rad = ((SECTOR_ANGLES[stock.sector] ?? 0) * Math.PI) / 180
    const scx = cx + sectorR * Math.cos(rad)
    const scy = cy + sectorR * Math.sin(rad)
    const group = groups[stock.sector]
    const n = group.length, i = group.indexOf(stock)
    if (n === 1) {
      pos[stock.id] = { x: scx, y: scy }
    } else {
      const subR = n <= 3 ? 48 : n <= 5 ? 62 : 76
      const subAngle = (i / n) * 2 * Math.PI - Math.PI / 2
      pos[stock.id] = {
        x: Math.round(scx + subR * Math.cos(subAngle)),
        y: Math.round(scy + subR * Math.sin(subAngle)),
      }
    }
  })
  return pos
}

const POSITIONS = computePositions()

/* ─── 엣지 데이터 (모드별) ────────────────────────────────── */
const EDGES_BY_MODE = {
  sector: [
    { s:'AAPL', t:'MSFT',  r:0.82, reason:'클라우드·소비자 기기 플랫폼 경쟁 구도를 공유하며 대형 기관 포트폴리오에서 함께 편입돼요.', tags:['클라우드','기관 포트폴리오'] },
    { s:'AAPL', t:'GOOGL', r:0.79, reason:'모바일 OS 생태계를 중심으로 광고·앱 수익 구조가 맞물려 있고, 빅테크 규제 이슈를 함께 받아요.', tags:['모바일','빅테크 규제'] },
    { s:'AAPL', t:'NVDA',  r:0.75, reason:'Apple Silicon·AI 가속기 수요 확대로 두 기업 모두 반도체 혁신 사이클에 동반 노출되어 있어요.', tags:['반도체','AI 수요'] },
    { s:'MSFT', t:'GOOGL', r:0.85, reason:'Azure vs GCP 클라우드 점유율 경쟁과 생성 AI가 두 기업의 주가를 함께 움직여요.', tags:['클라우드','생성 AI'] },
    { s:'MSFT', t:'NVDA',  r:0.71, reason:'OpenAI 투자 이후 MSFT 데이터센터의 NVDA GPU 의존도가 높아지며 실적이 연동됐어요.', tags:['AI 인프라','데이터센터'] },
    { s:'GOOGL',t:'META',  r:0.73, reason:'디지털 광고 시장의 양대 축으로, 광고 경기 사이클과 규제 변화에 동시에 반응해요.', tags:['디지털 광고','규제'] },
    { s:'NVDA', t:'META',  r:0.68, reason:'Meta AI 연구 및 메타버스 인프라 구축에 NVDA GPU가 핵심 공급원 역할을 해요.', tags:['AI 인프라','메타버스'] },
    { s:'TSLA', t:'NVDA',  r:0.62, reason:'자율주행 AI 칩 개발 경쟁 구도에서 투자자들이 두 종목을 AI 성장주로 함께 분류해요.', tags:['자율주행','AI 성장주'] },
    { s:'AMZN', t:'MSFT',  r:0.70, reason:'AWS vs Azure 클라우드 시장 1·2위 경쟁자로, 기업 IT 지출 사이클에 동일하게 노출돼요.', tags:['클라우드','기업 IT'] },
    { s:'AMZN', t:'AAPL',  r:0.64, reason:'온라인 소비 트렌드와 구독 경제 성장에 함께 수혜를 받아요.', tags:['이커머스','구독 경제'] },
    { s:'NFLX', t:'META',  r:0.66, reason:'디지털 콘텐츠·광고 예산을 두고 경쟁하며 소비자 여가 시간 트렌드에 동시에 영향을 받아요.', tags:['스트리밍','광고'] },
    { s:'JPM',  t:'BAC',   r:0.88, reason:'미국 대형 상업은행으로 연준 금리 결정, 대출 성장률, 신용 사이클이 거의 동일하게 적용돼요.', tags:['금리 민감','상업은행'] },
    { s:'JPM',  t:'GS',    r:0.76, reason:'투자은행·트레이딩 실적이 자본시장 변동성과 IPO 사이클에 함께 노출돼요.', tags:['투자은행','IB 사이클'] },
    { s:'BAC',  t:'GS',    r:0.71, reason:'금융 규제와 채권 금리 변화에 따른 NIM 압박을 동시에 받아요.', tags:['금융 규제','NIM'] },
    { s:'V',    t:'JPM',   r:0.65, reason:'소비 지출 증가와 결제 인프라 확장이 두 기업 모두에 긍정적으로 작용해요.', tags:['결제','소비 지출'] },
    { s:'UNH',  t:'JNJ',   r:0.58, reason:'헬스케어 서비스·보험과 의약품의 가치 사슬로 연결되며 의료비 정책 변화에 함께 반응해요.', tags:['의료 정책','헬스케어'] },
    { s:'ABBV', t:'JNJ',   r:0.67, reason:'면역학·종양학 파이프라인이 겹치며 특허 절벽·바이오시밀러 경쟁 이슈를 공유해요.', tags:['바이오파마','특허'] },
    { s:'ABBV', t:'PFE',   r:0.62, reason:'대형 제약사로서 R&D 사이클, FDA 승인 환경, 약가 규제 리스크를 동일하게 받아요.', tags:['약가 규제','FDA'] },
    { s:'XOM',  t:'CVX',   r:0.91, reason:'WTI 국제 유가에 직접 연동된 통합 석유 메이저로 사업 구조가 거의 동일해요.', tags:['유가 연동','통합 메이저'] },
    { s:'CAT',  t:'BA',    r:0.69, reason:'글로벌 인프라 투자·방위 지출 사이클에 동시에 노출된 산업재 대표 기업들이에요.', tags:['인프라','방위산업'] },
    { s:'HON',  t:'CAT',   r:0.72, reason:'산업 자동화·건설 경기에 함께 노출되며 글로벌 제조업 PMI와 강한 상관성을 보여요.', tags:['산업 자동화','PMI'] },
    { s:'HON',  t:'BA',    r:0.64, reason:'항공우주·방위 부품 공급망을 공유하며 항공 여객 회복 사이클에 동반 수혜를 받아요.', tags:['항공우주','방위'] },
  ],
  price: [
    { s:'AAPL', t:'MSFT',  r:0.88, reason:'고베타 대형 성장주로 리스크온 국면에서 함께 강하게 상승, 리스크오프 시 함께 하락해요.', tags:['고베타','리스크온'] },
    { s:'NVDA', t:'TSLA',  r:0.79, reason:'변동성 높은 AI·EV 성장 테마주로 기술주 랠리/조정 국면에서 동반 급등락해요.', tags:['고변동성','테마주'] },
    { s:'NVDA', t:'META',  r:0.81, reason:'AI 투자 사이클 수혜주로 함께 묶여 대규모 기관 매수·매도가 동시에 발생해요.', tags:['AI 테마','기관 수급'] },
    { s:'MSFT', t:'AMZN',  r:0.76, reason:'클라우드·AI 성장주 바스켓으로 묶여 ETF 리밸런싱 시 동반 편출입이 발생해요.', tags:['성장주 ETF','클라우드'] },
    { s:'GOOGL',t:'META',  r:0.84, reason:'광고 수익 기반 플랫폼으로 경기 민감도가 유사하여 주가 모멘텀이 동기화돼요.', tags:['광고 플랫폼','경기 민감'] },
    { s:'JNJ',  t:'WMT',   r:0.72, reason:'경기 방어주·저베타 종목으로 시장 하락 시 함께 안전자산으로 매수되는 경향이 있어요.', tags:['방어주','저베타'] },
    { s:'JNJ',  t:'UNH',   r:0.69, reason:'헬스케어 방어주로 경기 침체 우려 시 동반 강세, 금리 상승기엔 함께 압박을 받아요.', tags:['방어주','헬스케어'] },
    { s:'JPM',  t:'V',     r:0.78, reason:'소비·금융 경기 회복 국면에서 함께 강세를 보이는 경기 민감 금융주 바스켓이에요.', tags:['경기 민감','금융주'] },
    { s:'XOM',  t:'CAT',   r:0.71, reason:'원자재·경기 호황 사이클에 함께 수혜를 받는 고베타 경기민감주예요.', tags:['경기민감','원자재'] },
    { s:'AMZN', t:'NFLX',  r:0.73, reason:'스트리밍·이커머스 구독 모델 성장 테마로 함께 평가받으며 모멘텀이 연동돼요.', tags:['구독 모델','소비자 플랫폼'] },
    { s:'GS',   t:'JPM',   r:0.82, reason:'자본시장 활황 시 IB 수수료·트레이딩 수익이 동반 증가하는 금융 사이클주예요.', tags:['IB 사이클','금융주'] },
    { s:'NFLX', t:'TSLA',  r:0.67, reason:'성장 가치 평가에 민감한 고PER 기업으로 금리 변화에 함께 반응해요.', tags:['고PER','금리 민감'] },
  ],
  inverse: [
    { s:'XOM',  t:'AMZN',  r:-0.62, reason:'에너지 비용 상승 시 XOM 수익은 늘지만 AMZN 물류·운영비 압박이 커져 반대로 움직여요.', tags:['에너지 vs 이커머스','비용 구조'] },
    { s:'XOM',  t:'TSLA',  r:-0.71, reason:'유가 상승 시 화석연료 기업은 강세지만 EV 전환 수혜 TSLA는 상대적으로 밀려요.', tags:['화석연료 vs EV','에너지 전환'] },
    { s:'CVX',  t:'NVDA',  r:-0.58, reason:'에너지 섹터 강세 장세는 대개 성장·기술주 약세와 동반되는 섹터 로테이션 구도예요.', tags:['섹터 로테이션','에너지 vs 기술'] },
    { s:'JPM',  t:'NVDA',  r:-0.55, reason:'금리 상승기엔 JPM(NIM 확대)이 강세지만 고PER 성장주 NVDA는 할인율 부담으로 약세예요.', tags:['금리 역풍','가치 vs 성장'] },
    { s:'WMT',  t:'TSLA',  r:-0.64, reason:'경기 침체 우려 시 방어주 WMT는 강세, 고베타 성장주 TSLA는 약세로 반대로 흘러요.', tags:['방어 vs 성장','경기 방어'] },
    { s:'JNJ',  t:'META',  r:-0.59, reason:'리스크오프 국면에서 안전자산 JNJ로 자금이 이동하며 광고 의존 성장주 META는 빠져요.', tags:['리스크오프','안전 vs 성장'] },
    { s:'XOM',  t:'AAPL',  r:-0.60, reason:'유가 급등 시 소비자 가처분 소득 감소로 프리미엄 소비재 AAPL 판매에 부정적 영향을 줘요.', tags:['에너지 vs 소비','가처분 소득'] },
    { s:'BAC',  t:'AMZN',  r:-0.56, reason:'금리 인상 사이클에서 BAC는 NIM 개선으로 강세지만 AMZN 높은 PER은 할인율 압박을 받아요.', tags:['금리','가치 vs 성장'] },
  ],
  supply: [
    { s:'NVDA', t:'MSFT',  r:0.85, direction:true, reason:'NVDA GPU(H100·A100)가 Azure 데이터센터 AI 워크로드의 핵심 인프라로 직접 공급돼요.', tags:['GPU 공급','클라우드 인프라'] },
    { s:'NVDA', t:'META',  r:0.82, direction:true, reason:'Meta LLaMA·AI 연구 클러스터 전체가 NVDA GPU 위에서 운영되는 핵심 공급 관계예요.', tags:['AI 연구','GPU 의존'] },
    { s:'NVDA', t:'AMZN',  r:0.79, direction:true, reason:'AWS AI 인스턴스의 핵심 가속기로 NVDA GPU가 대규모 공급되고 있어요.', tags:['AWS','AI 인스턴스'] },
    { s:'NVDA', t:'GOOGL', r:0.76, direction:true, reason:'Google DeepMind·Gemini 학습 인프라에도 NVDA GPU가 공급되고 있어요.', tags:['GCP','AI 학습'] },
    { s:'NVDA', t:'TSLA',  r:0.68, direction:true, reason:'TSLA 자율주행 AI 모델 학습에 NVDA GPU 클러스터가 활용돼요.', tags:['자율주행','AI 학습'] },
    { s:'HON',  t:'BA',    r:0.74, direction:true, reason:'HON이 Boeing 항공기에 항법 시스템, APU, 항공 전자기기를 직접 공급해요.', tags:['항공 전자','APU 공급'] },
    { s:'HON',  t:'CAT',   r:0.66, direction:true, reason:'HON 산업용 자동화·제어 솔루션이 CAT 건설기계 운영 시스템에 내장돼요.', tags:['산업 자동화','제어 시스템'] },
    { s:'CAT',  t:'XOM',   r:0.71, direction:true, reason:'CAT 중장비가 XOM 유전 개발·유지보수 현장에 핵심 장비로 투입돼요.', tags:['드릴링','유전 개발'] },
    { s:'CAT',  t:'CVX',   r:0.69, direction:true, reason:'CAT 해양·지상 굴착 장비가 CVX 업스트림 탐사·생산 프로젝트에 공급돼요.', tags:['탐사 장비','업스트림'] },
    { s:'V',    t:'AMZN',  r:0.72, direction:true, reason:'Amazon 결제 시스템의 상당 부분이 Visa 네트워크를 통해 처리돼요.', tags:['결제 네트워크','수수료'] },
    { s:'V',    t:'WMT',   r:0.67, direction:true, reason:'Walmart 매장 내 카드 결제의 핵심 네트워크로 Visa가 대규모 트랜잭션을 처리해요.', tags:['카드 결제','오프라인 유통'] },
    { s:'ABBV', t:'UNH',   r:0.64, direction:true, reason:'AbbVie 의약품이 UnitedHealth 보험 네트워크를 통해 가입자에게 공급되는 구조예요.', tags:['처방 네트워크','보험 의약품'] },
  ],
  macro: [
    { s:'JPM',  t:'BAC',   r:0.91, reason:'연준 금리 인상 시 NIM 확대 수혜가 동일하게 적용되는 금리 민감 금융주예요.', tags:['금리 민감','NIM 수혜'] },
    { s:'JPM',  t:'GS',    r:0.83, reason:'채권 금리 상승기 채권 포트폴리오 손실과 IB 수익 변동이 함께 나타나요.', tags:['채권 금리','IB 수익'] },
    { s:'BAC',  t:'V',     r:0.76, reason:'소비 경기와 신용 팽창에 함께 노출되어 경기 회복 사이클에서 동반 강세예요.', tags:['소비 경기','신용 팽창'] },
    { s:'XOM',  t:'CVX',   r:0.94, reason:'WTI·브렌트 유가와 달러 인덱스 변동에 거의 동일하게 노출된 통합 에너지 메이저예요.', tags:['유가 연동','달러 인덱스'] },
    { s:'XOM',  t:'CAT',   r:0.72, reason:'인플레이션 국면에서 원자재 가격 상승 시 에너지·중장비 기업이 함께 수혜를 받아요.', tags:['인플레이션 헤지','원자재'] },
    { s:'AAPL', t:'MSFT',  r:0.79, reason:'강달러 환경에서 해외 매출 비중이 높은 두 기업이 환율 역풍을 동시에 받는 구조예요.', tags:['달러 역풍','해외 매출'] },
    { s:'MSFT', t:'GOOGL', r:0.82, reason:'달러 강세 시 유럽·아시아 매출의 달러 환산 감소 리스크를 동일하게 공유해요.', tags:['환율 리스크','글로벌 매출'] },
    { s:'GOOGL',t:'META',  r:0.78, reason:'광고 경기는 GDP 성장률·소비자 신뢰지수와 강하게 연동되어 거시 경기에 함께 반응해요.', tags:['경기 동행','광고 경기'] },
    { s:'NVDA', t:'TSLA',  r:0.74, reason:'장기 금리 상승 시 고PER 성장주 할인율이 함께 높아져 두 기업 모두 밸류에이션 압박을 받아요.', tags:['금리 역풍','고PER'] },
    { s:'JNJ',  t:'WMT',   r:0.77, reason:'인플레이션·경기 침체 환경에서 필수소비재·헬스케어 방어주로 함께 자금이 유입돼요.', tags:['방어주','경기 침체 헤지'] },
    { s:'JNJ',  t:'PFE',   r:0.71, reason:'의료비 정책·약가 규제 이슈에 함께 노출되는 대형 제약·헬스케어 방어주예요.', tags:['약가 규제','의료 정책'] },
    { s:'BA',   t:'CAT',   r:0.69, reason:'글로벌 인프라 투자·정부 지출 사이클(재정 부양)에 함께 노출된 산업재 기업이에요.', tags:['재정 부양','인프라 투자'] },
  ],
}

/* ─── 색상 헬퍼 ───────────────────────────────────────────── */
function edgeStroke(r, mode) {
  if (mode === 'inverse') {
    if (r <= -0.7)  return '#dc2626'
    if (r <= -0.55) return '#f97316'
    return '#fbbf24'
  }
  if (mode === 'supply') return '#6366f1'
  if (r >= 0.8)  return '#10b981'
  if (r >= 0.65) return '#f59e0b'
  return '#94a3b8'
}

function nodeSize(mcap) {
  return Math.round(16 + Math.log10(mcap) * 8)
}

/* ─── G6 그래프 빌드 헬퍼 ─────────────────────────────────── */
function buildG6Data(mode, sectorFilter, minCorr) {
  const rawEdges = EDGES_BY_MODE[mode] ?? []
  const threshold = mode === 'inverse' ? 0 : minCorr

  const visibleStocks = sectorFilter ? STOCKS.filter(s => s.sector === sectorFilter) : STOCKS
  const visibleIds = new Set(visibleStocks.map(s => s.id))

  const visibleEdges = rawEdges.filter(e =>
    Math.abs(e.r) >= threshold && visibleIds.has(e.s) && visibleIds.has(e.t)
  )

  const nodes = visibleStocks.map(s => ({
    id: s.id,
    style: {
      x: POSITIONS[s.id]?.x ?? 350,
      y: POSITIONS[s.id]?.y ?? 250,
    },
    data: {
      label: s.id,
      sector: s.sector,
      mcap: s.mcap,
      name: s.name,
      size: nodeSize(s.mcap),
      color: SECTOR_COLORS[s.sector],
    },
  }))

  const edges = visibleEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.s,
    target: e.t,
    data: {
      r: e.r,
      reason: e.reason,
      tags: e.tags,
      direction: !!e.direction,
      stroke: edgeStroke(e.r, mode),
      width: Math.abs(e.r) >= 0.8 ? 2.5 : 1.5,
      opacity: 0.55,
      dash: e.r < 0,
      endArrow: !!e.direction,
    },
  }))

  return { nodes, edges }
}

/* ─── 메인 컴포넌트 ───────────────────────────────────────── */
export default function Graph() {
  const containerRef = useRef(null)
  const graphRef     = useRef(null)

  const [mode,         setMode]         = useState('sector')
  const [sectorFilter, setSectorFilter] = useState(null)
  const [minCorr,      setMinCorr]      = useState(0.55)
  const [selected,     setSelected]     = useState(null) // { type: 'node'|'edge', data }
  const [tooltip,      setTooltip]      = useState(null) // { x, y, edge }

  const currentMode = MODES.find(m => m.id === mode)

  /* G6 초기화 — 마운트 시 한 번만 */
  useEffect(() => {
    if (!containerRef.current) return

    const graph = new G6Graph({
      container: containerRef.current,
      autoFit: 'view',
      data: buildG6Data('sector', null, 0.55),
      node: {
        type: 'circle',
        style: {
          size: d => d.data.size,
          fill: d => d.data.color,
          stroke: '#fff',
          strokeWidth: 2,
          labelText: d => d.data.label,
          labelFill: '#1a1a2e',
          labelFontSize: 11,
          labelFontWeight: 800,
          labelFontFamily: 'system-ui, sans-serif',
          labelPosition: 'bottom',
          labelOffsetY: 4,
          labelBackground: true,
          labelBackgroundFill: 'rgba(255,255,255,0.85)',
          labelBackgroundRadius: 4,
          labelPadding: [2, 5],
          shadowColor: d => d.data.color,
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowOffsetY: 3,
        },
        state: {
          selected: {
            stroke: '#fff',
            strokeWidth: 4,
            shadowBlur: 22,
            shadowColor: d => d.data?.color ?? '#6366f1',
          },
          dim: {
            fillOpacity: 0.15,
            labelOpacity: 0.1,
            shadowBlur: 0,
          },
        },
      },
      edge: {
        type: 'line',
        style: {
          stroke: d => d.data.stroke,
          strokeWidth: d => d.data.width,
          strokeOpacity: d => d.data.opacity,
          lineDash: d => d.data.dash ? [5, 4] : undefined,
          endArrow: d => d.data.endArrow,
          endArrowType: 'vee',
          endArrowSize: 8,
        },
        state: {
          selected: {
            strokeOpacity: 1,
            strokeWidth: 3,
            shadowColor: '#1a1a2e44',
            shadowBlur: 6,
          },
          dim: {
            strokeOpacity: 0.04,
          },
        },
      },
      layout: { type: 'preset' },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
      plugins: [
        {
          type: 'minimap',
          key: 'minimap',
          size: [200, 130],
          position: 'bottom-right',
          padding: 12,
          mode: 'keyShape',
          containerStyle: {
            background: 'rgba(250,248,245,0.96)',
            border: '1px solid #e8e4de',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(26,26,46,0.08)',
          },
          viewportStyle: {
            stroke: '#1a1a2e',
            strokeWidth: 1.5,
            fill: 'rgba(26,26,46,0.04)',
          },
        },
      ],
      background: '#faf8f5',
    })

    /* 노드 클릭 */
    graph.on('node:click', (e) => {
      const nodeId = e.target.id
      const nodeData = STOCK_MAP[nodeId]
      if (!nodeData) return

      setTooltip(null)

      const connectedEdges = graph.getEdgeData().filter(
        ed => ed.source === nodeId || ed.target === nodeId
      )
      const connectedNodeIds = new Set(
        connectedEdges.flatMap(ed => [ed.source, ed.target])
      )

      graph.getNodeData().forEach(n => {
        graph.setElementState(n.id, connectedNodeIds.has(n.id) ? 'selected' : 'dim')
      })
      graph.getEdgeData().forEach(ed => {
        const isConn = ed.source === nodeId || ed.target === nodeId
        graph.setElementState(ed.id, isConn ? 'selected' : 'dim')
      })

      const connections = connectedEdges.map(ed => {
        const peerId = ed.source === nodeId ? ed.target : ed.source
        return { stock: STOCK_MAP[peerId], corr: ed.data.r, direction: ed.data.direction, isSource: ed.source === nodeId }
      }).filter(c => c.stock).sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr))

      setSelected({ type: 'node', nodeId, nodeData, connections })
    })

    /* 엣지 클릭 */
    graph.on('edge:click', (e) => {
      const edgeId = e.target.id
      const edgeData = graph.getEdgeData(edgeId)
      if (!edgeData) return

      setSelected(null)

      graph.getNodeData().forEach(n => graph.setElementState(n.id, []))
      graph.getEdgeData().forEach(ed => {
        graph.setElementState(ed.id, ed.id === edgeId ? 'selected' : 'dim')
      })

      const bbox = e.target.getBounds()
      setTooltip({
        x: (bbox.min[0] + bbox.max[0]) / 2,
        y: (bbox.min[1] + bbox.max[1]) / 2,
        source: edgeData.source,
        target: edgeData.target,
        r: edgeData.data.r,
        reason: edgeData.data.reason,
        tags: edgeData.data.tags,
        stroke: edgeData.data.stroke,
        direction: edgeData.data.direction,
      })
    })

    /* 배경 클릭 — 선택 해제 */
    graph.on('canvas:click', () => {
      graph.getNodeData().forEach(n => graph.setElementState(n.id, []))
      graph.getEdgeData().forEach(ed => graph.setElementState(ed.id, []))
      setSelected(null)
      setTooltip(null)
    })

    graph.render()
    graphRef.current = graph

    return () => {
      graph.destroy()
      graphRef.current = null
    }
  }, []) // 마운트 시 한 번만 — 캔버스·이벤트·플러그인 재생성 없음

  /* 데이터 업데이트 — mode/filter/minCorr 변경 시 setData만 호출 */
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const newData = buildG6Data(mode, sectorFilter, minCorr)
    graph.setData(newData)
    graph.render()
  }, [mode, sectorFilter, minCorr])

  const handleModeChange = useCallback((m) => {
    setMode(m)
    setSelected(null)
    setTooltip(null)
    setSectorFilter(null)
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock Network</h1>
          <p className={styles.subtitle}>노드 클릭 → 연결 강조 &nbsp;·&nbsp; 엣지 클릭 → 연결 이유</p>
        </div>
        {mode !== 'inverse' && (
          <div className={styles.controls}>
            <div className={styles.controlItem}>
              <span className={styles.controlLabel}>최소 상관계수</span>
              <div className={styles.sliderRow}>
                <input type="range" min="0.5" max="0.9" step="0.05"
                  value={minCorr}
                  onChange={e => { setMinCorr(+e.target.value); setSelected(null); setTooltip(null) }}
                  className={styles.slider} />
                <span className={styles.sliderVal}>{minCorr.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 모드 탭 */}
      <div className={styles.modeTabs}>
        {MODES.map(m => (
          <button key={m.id}
            className={`${styles.modeTab} ${mode === m.id ? styles.modeTabActive : ''}`}
            onClick={() => handleModeChange(m.id)}
          >{m.label}</button>
        ))}
        {currentMode && <span className={styles.modeDesc}>{currentMode.desc}</span>}
      </div>

      {/* 섹터 필터 */}
      <div className={styles.sectorBar}>
        <button
          className={`${styles.sectorBtn} ${!sectorFilter ? styles.sectorBtnAll : ''}`}
          onClick={() => { setSectorFilter(null); setSelected(null); setTooltip(null) }}
        >전체</button>
        {Object.entries(SECTOR_COLORS).map(([sec, col]) => (
          <button key={sec}
            className={`${styles.sectorBtn} ${sectorFilter === sec ? styles.sectorBtnActive : ''}`}
            style={sectorFilter === sec ? { background: col, borderColor: col, color: '#fff' } : {}}
            onClick={() => { setSectorFilter(s => s === sec ? null : sec); setSelected(null); setTooltip(null) }}
          >
            <span className={styles.sectorDot} style={{ background: col }} />
            {sec}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {/* G6 캔버스 */}
        <div className={styles.canvasOuter}>
          <div ref={containerRef} className={styles.g6Canvas} />

          {/* 엣지 클릭 툴팁 */}
          {tooltip && (
            <div className={styles.edgeCard}
              style={{ position: 'absolute', top: 24, right: 24, zIndex: 100 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.edgeCardHeader}>
                <span className={styles.edgeCardTickers}>
                  {tooltip.source}{tooltip.direction ? ' → ' : ' · '}{tooltip.target}
                </span>
                <span className={styles.edgeCardCorr} style={{ color: tooltip.stroke }}>
                  {tooltip.r < 0 ? `${tooltip.r.toFixed(2)} (역상관)` : `ρ ${tooltip.r.toFixed(2)}`}
                </span>
                <button className={styles.edgeCardClose}
                  onClick={() => { setTooltip(null); graphRef.current?.getEdgeData().forEach(ed => graphRef.current.setElementState(ed.id, [])); graphRef.current?.getNodeData().forEach(n => graphRef.current.setElementState(n.id, [])) }}>✕</button>
              </div>
              <p className={styles.edgeCardReason}>{tooltip.reason}</p>
              <div className={styles.edgeCardTags}>
                {tooltip.tags?.map(tag => (
                  <span key={tag} className={styles.edgeCardTag}
                    style={{ background: tooltip.stroke + '20', color: tooltip.stroke }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 노드 선택 패널 */}
        {selected?.type === 'node' ? (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTicker}
                style={{ color: SECTOR_COLORS[selected.nodeData.sector] }}>
                {selected.nodeData.id}
              </span>
              <span className={styles.panelName}>{selected.nodeData.name}</span>
              <span className={styles.panelSector} style={{
                background: SECTOR_COLORS[selected.nodeData.sector] + '22',
                color: SECTOR_COLORS[selected.nodeData.sector],
              }}>{selected.nodeData.sector}</span>
            </div>
            <div className={styles.panelMcap}>시총 <strong>${selected.nodeData.mcap.toLocaleString()}B</strong></div>
            <div className={styles.panelConnTitle}>연결 종목 ({selected.connections.length})</div>
            <div className={styles.panelConnList}>
              {selected.connections.length === 0 && <p className={styles.panelEmpty}>현재 모드/필터에서 연결 없음</p>}
              {selected.connections.map(({ stock, corr, direction, isSource }) => (
                <div key={stock.id} className={styles.panelConnItem}>
                  <div className={styles.panelConnLeft}>
                    <span className={styles.panelConnDot} style={{ background: SECTOR_COLORS[stock.sector] }} />
                    <div>
                      <span className={styles.panelConnTicker}>
                        {direction ? (isSource ? `→ ${stock.id}` : `← ${stock.id}`) : stock.id}
                      </span>
                      <span className={styles.panelConnName}>{stock.name}</span>
                    </div>
                  </div>
                  <div className={styles.panelCorrWrap}>
                    <div className={styles.panelCorrBar} style={{
                      width: `${Math.abs(corr - (corr < 0 ? 0 : 0.5)) * 200}%`,
                      background: edgeStroke(corr, mode),
                    }} />
                    <span className={styles.panelCorrVal} style={{ color: corr < 0 ? '#ef4444' : undefined }}>
                      {corr < 0 ? corr.toFixed(2) : `ρ ${corr.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.panelEmpty2}>
            <div className={styles.panelEmptyIcon}>⬡</div>
            <p>노드를 클릭하면 연결 종목을,<br />엣지를 클릭하면 연결 이유를 볼 수 있어요</p>
          </div>
        )}
      </div>
    </div>
  )
}
