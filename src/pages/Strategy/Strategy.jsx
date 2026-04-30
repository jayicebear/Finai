import { useState, useMemo, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import IndicatorPreview from './IndicatorPreview'
import styles from './Strategy.module.css'

const STOCKS     = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX']
const TIMEFRAMES = ['1D', '1W', '1M']

const INDICATORS = [
  { id: 'ma',         label: 'MA Crossover' },
  { id: 'rsi',        label: 'RSI' },
  { id: 'macd',       label: 'MACD' },
  { id: 'bollinger',  label: 'Bollinger' },
  { id: 'momentum',   label: 'Momentum' },
  { id: 'stochastic', label: 'Stochastic' },
  { id: 'vwap',       label: 'VWAP' },
  { id: 'ichimoku',   label: 'Ichimoku' },
]

const INDICATOR_DETAILS = [
  {
    id: 'ma',
    label: 'MA Crossover',
    summary: '단기 이동평균선이 장기 이동평균선을 돌파하는 흐름으로 추세 전환을 확인하는 지표예요.',
    buyExample: '짧은 MA가 긴 MA를 아래에서 위로 돌파할 때 매수 신호로 봅니다.',
    sellExample: '짧은 MA가 긴 MA를 위에서 아래로 이탈할 때 매도 신호로 해석합니다.',
  },
  {
    id: 'rsi',
    label: 'RSI',
    summary: '가격 상승과 하락의 힘을 0에서 100 사이로 보여줘 과매수와 과매도 구간을 읽는 지표예요.',
    buyExample: 'RSI가 30 아래에서 다시 올라올 때 과매도 반등 매수 예시로 많이 씁니다.',
    sellExample: 'RSI가 70 위에서 꺾여 내려올 때 과매수 조정 매도 예시로 볼 수 있습니다.',
  },
  {
    id: 'macd',
    label: 'MACD',
    summary: '두 EMA 차이와 시그널선을 함께 보면서 추세 방향과 모멘텀 변화를 같이 확인하는 지표예요.',
    buyExample: 'MACD선이 시그널선을 아래에서 위로 돌파하면 매수 신호로 해석합니다.',
    sellExample: 'MACD선이 시그널선을 위에서 아래로 내려오면 매도 신호로 봅니다.',
  },
  {
    id: 'bollinger',
    label: 'Bollinger',
    summary: '이동평균선 주변의 밴드 폭으로 가격의 상대적 위치와 변동성 확대 여부를 보는 지표예요.',
    buyExample: '가격이 하단 밴드 근처에서 지지를 받고 반등할 때 매수 예시로 활용합니다.',
    sellExample: '가격이 상단 밴드 부근에서 힘이 약해질 때 차익 실현 매도 예시로 봅니다.',
  },
  {
    id: 'momentum',
    label: 'Momentum',
    summary: '현재 가격의 속도와 힘이 강해지는지 약해지는지를 보고 추세 지속 여부를 판단하는 지표예요.',
    buyExample: '모멘텀이 0선을 돌파하며 상승 폭이 커질 때 추세 추종 매수 예시가 됩니다.',
    sellExample: '모멘텀이 둔화되며 0선 아래로 내려갈 때 매도 신호로 해석할 수 있습니다.',
  },
  {
    id: 'stochastic',
    label: 'Stochastic',
    summary: '%K선과 %D선의 교차로 단기 과매수·과매도 구간을 읽는 오실레이터 지표예요.',
    buyExample: '%K가 20 아래에서 %D를 상향 돌파할 때 매수 신호로 많이 활용합니다.',
    sellExample: '%K가 80 위에서 %D를 하향 이탈할 때 매도 신호로 봅니다.',
  },
  {
    id: 'vwap',
    label: 'VWAP',
    summary: '거래량을 가중한 평균 가격으로 기관 투자자 기준선 역할을 하는 지표예요.',
    buyExample: '가격이 VWAP 아래에서 VWAP 위로 올라설 때 매수 진입 예시로 활용합니다.',
    sellExample: '가격이 VWAP 위에서 VWAP 아래로 내려올 때 매도 신호로 해석합니다.',
  },
  {
    id: 'ichimoku',
    label: 'Ichimoku',
    summary: '구름대·기준선·전환선으로 추세 방향·지지·저항을 한 번에 파악하는 종합 지표예요.',
    buyExample: '가격이 구름대 위로 돌파하며 전환선이 기준선 위에 있을 때 매수 예시가 됩니다.',
    sellExample: '가격이 구름대 아래로 내려가며 전환선이 기준선 아래일 때 매도 신호로 봅니다.',
  },
]

const DEFAULT_PRIORITIES = [
  { id: 'stoploss',   label: '손절',        sub: 'Stop Loss',       color: '#dc2626', bg: '#fef2f2' },
  { id: 'takeprofit', label: '익절',        sub: 'Take Profit',     color: '#16a34a', bg: '#f0fdf4' },
  { id: 'signal',     label: '지표 신호 역전', sub: 'Signal Reversal', color: '#2563eb', bg: '#eff6ff' },
  { id: 'time',       label: '시간 제한 만료', sub: 'Time Expiry',   color: '#d97706', bg: '#fffbeb' },
]

const VOLUME_FILTERS  = ['없음', '평균 거래량 1.5배 이상', '평균 거래량 2배 이상']
const TREND_FILTERS   = ['없음', '200일 MA 위 (상승 추세)', '200일 MA 아래 (하락 추세)']
const CANDLE_PATTERNS = ['없음', '양봉 연속 2개', '음봉 연속 2개', '도지 패턴']

function generateEquityCurve(capital, winRate, trades) {
  const data = []
  let equity = capital
  for (let i = 0; i <= trades; i++) {
    if (i > 0) {
      const win = Math.random() * 100 < winRate
      equity += win
        ? equity * (Math.random() * 0.04 + 0.005)
        : -equity * (Math.random() * 0.025 + 0.003)
    }
    data.push({ t: i, equity: Math.round(equity) })
  }
  return data
}

function IndicatorParams({ indicator, params, setParams }) {
  const f = (key, label, min, max, step = 1) => (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input className={styles.input} type="number" value={params[key] ?? min}
        min={min} max={max} step={step}
        onChange={e => setParams(p => ({ ...p, [key]: Number(e.target.value) }))} />
    </div>
  )

  if (indicator === 'ma') return (
    <div className={styles.grid3}>
      {f('fast', '단기 MA 기간', 3, 50)}
      {f('slow', '장기 MA 기간', 10, 200)}
      {f('offset', '진입 오프셋 (%)', -5, 5, 0.1)}
    </div>
  )
  if (indicator === 'rsi') return (
    <div className={styles.grid3}>
      {f('period', 'RSI 기간', 5, 30)}
      {f('oversold', '과매도 기준', 10, 40)}
      {f('overbought', '과매수 기준', 60, 90)}
    </div>
  )
  if (indicator === 'macd') return (
    <div className={styles.grid3}>
      {f('fast', 'Fast EMA', 5, 20)}
      {f('slow', 'Slow EMA', 15, 50)}
      {f('signal', 'Signal', 5, 20)}
    </div>
  )
  if (indicator === 'bollinger') return (
    <div className={styles.grid3}>
      {f('period', '기간', 10, 50)}
      {f('std', '표준편차 배수', 1, 4, 0.5)}
      {f('offset', '진입 오프셋 (%)', -5, 5, 0.1)}
    </div>
  )
  if (indicator === 'momentum') return (
    <div className={styles.grid3}>
      {f('period', '모멘텀 기간', 5, 60)}
      {f('threshold', '진입 임계값', 0, 20, 0.5)}
      {f('offset', '진입 오프셋 (%)', -5, 5, 0.1)}
    </div>
  )
  if (indicator === 'stochastic') return (
    <div className={styles.grid3}>
      {f('kPeriod', '%K 기간', 5, 30)}
      {f('dPeriod', '%D 기간', 2, 10)}
      {f('smooth', '스무딩', 1, 5)}
    </div>
  )
  if (indicator === 'vwap') return (
    <div className={styles.grid3}>
      {f('deviation', '편차 배수', 0.5, 3, 0.5)}
      {f('bands', '밴드 수', 1, 3)}
      {f('offset', '진입 오프셋 (%)', -5, 5, 0.1)}
    </div>
  )
  if (indicator === 'ichimoku') return (
    <div className={styles.grid3}>
      {f('tenkan', '전환선 기간', 5, 20)}
      {f('kijun', '기준선 기간', 20, 60)}
      {f('senkou', '선행스팬 B 기간', 40, 120)}
    </div>
  )
  return null
}

export default function Strategy() {
  const [capital,    setCapital]    = useState(10000)
  const [commission, setCommission] = useState(0.1)
  const [slippage,   setSlippage]   = useState(0)
  const [startDate,  setStartDate]  = useState('2023-01-01')
  const [endDate,    setEndDate]    = useState('2024-12-31')
  const [timeframe,  setTimeframe]  = useState('1D')
  const [stock,      setStock]      = useState('AAPL')

  const [indicator, setIndicator] = useState('ma')
  const [indParams, setIndParams] = useState({
    ma:         { fast: 5,  slow: 20, offset: 0 },
    rsi:        { period: 14, oversold: 30, overbought: 70 },
    macd:       { fast: 12, slow: 26, signal: 9 },
    bollinger:  { period: 20, std: 2, offset: 0 },
    momentum:   { period: 10, threshold: 5, offset: 0 },
    stochastic: { kPeriod: 14, dPeriod: 3, smooth: 3 },
    vwap:       { deviation: 1, bands: 2, offset: 0 },
    ichimoku:   { tenkan: 9, kijun: 26, senkou: 52 },
  })
  const [maxPos,        setMaxPos]        = useState(20)
  const [volumeFilter,  setVolumeFilter]  = useState('없음')
  const [trendFilter,   setTrendFilter]   = useState('없음')
  const [candlePattern, setCandlePattern] = useState('없음')
  const [useEntryTime,  setUseEntryTime]  = useState(false)
  const [entryTimeFrom, setEntryTimeFrom] = useState('09:00')
  const [entryTimeTo,   setEntryTimeTo]   = useState('11:00')

  const [stopLoss,    setStopLoss]    = useState(5)
  const [takeProfit,  setTakeProfit]  = useState(10)
  const [trailingStop, setTrailingStop] = useState(false)
  const [maxHoldDays, setMaxHoldDays] = useState(10)
  const [useExitTime, setUseExitTime] = useState(false)
  const [priorities,  setPriorities]  = useState(DEFAULT_PRIORITIES)
  const dragIndex = useRef(null)

  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)

  function runBacktest() {
    setRunning(true)
    setTimeout(() => {
      const trades      = Math.floor(Math.random() * 80 + 40)
      const winRate     = Math.random() * 25 + 45
      const curve       = generateEquityCurve(capital, winRate, trades)
      const finalEq     = curve[curve.length - 1].equity
      const totalReturn = parseFloat(((finalEq - capital) / capital * 100).toFixed(2))
      const maxDD       = parseFloat((Math.random() * 15 + 3).toFixed(2))
      const sharpe      = parseFloat((Math.random() * 1.5 + 0.3).toFixed(2))
      setResults({ trades, winRate: parseFloat(winRate.toFixed(1)), totalReturn, maxDD, sharpe, curve, finalEq })
      setRunning(false)
    }, 900)
  }

  const minEq = useMemo(() => results ? Math.min(...results.curve.map(d => d.equity)) * 0.98 : 0, [results])
  const maxEq = useMemo(() => results ? Math.max(...results.curve.map(d => d.equity)) * 1.02 : 1, [results])

  const indLabel = INDICATORS.find(i => i.id === indicator)?.label ?? ''
  const indicatorInfo = INDICATOR_DETAILS.find(item => item.id === indicator)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Strategy Builder</h1>
          <p className={styles.subtitle}>전략을 설정하고 백테스트를 실행하세요</p>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.saveStratBtn} onClick={() => {
            const config = {
              stock, timeframe, capital, commission, slippage,
              indicator, indParams, maxPos, volumeFilter, trendFilter, candlePattern,
              useEntryTime, entryTimeFrom, entryTimeTo,
              stopLoss, takeProfit, trailingStop, maxHoldDays, useExitTime,
              priorities: priorities.map(p => p.label),
              savedAt: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            }
            localStorage.setItem('my_strategy_config', JSON.stringify(config))
            alert('전략이 저장되었습니다.')
          }}>
            전략 저장
          </button>
          <button className={styles.runBtn} onClick={runBacktest} disabled={running}>
            {running ? '실행 중…' : '▶ 백테스트 실행'}
          </button>
        </div>
      </div>

      {/* 기본 설정 — 상단 전체 */}
      <div className={styles.section} style={{ marginBottom: 20 }}>
        <h3 className={styles.sectionTitle}>기본 설정</h3>
        <div className={styles.grid4}>
          <div className={styles.field}>
            <label className={styles.label}>운용 자금 ($)</label>
            <input className={styles.input} type="number" value={capital} min={100}
              onChange={e => setCapital(Number(e.target.value))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>종목</label>
            <select className={styles.select} value={stock} onChange={e => setStock(e.target.value)}>
              {STOCKS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>시작일</label>
            <input className={styles.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>종료일</label>
            <input className={styles.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>타임프레임</label>
            <div className={styles.toggleGroup}>
              {TIMEFRAMES.map(tf => (
                <button key={tf} className={`${styles.toggleBtn} ${timeframe === tf ? styles.toggleActive : ''}`}
                  onClick={() => setTimeframe(tf)}>{tf}</button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>수수료율 (%)</label>
            <input className={styles.input} type="number" value={commission} step="0.01" min={0}
              onChange={e => setCommission(Number(e.target.value))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>슬리피지 (%)</label>
            <input className={styles.input} type="number" value={slippage} step="0.01" min={0}
              onChange={e => setSlippage(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* 진입 조건 | 청산 조건 */}
      <div className={styles.body}>

        {/* 왼쪽 — 진입 조건 */}
        <div className={styles.col}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>진입 조건 <span className={styles.badgeBuy}>매수</span></h3>

            {/* 진입 시간 제한 */}
            <div className={styles.field}>
              <label className={styles.label}>진입 시간 제한</label>
              <div className={styles.toggleGroup}>
                <button className={`${styles.toggleBtn} ${!useEntryTime ? styles.toggleActive : ''}`} onClick={() => setUseEntryTime(false)}>사용 안함</button>
                <button className={`${styles.toggleBtn} ${useEntryTime  ? styles.toggleActive : ''}`} onClick={() => setUseEntryTime(true)}>사용함</button>
              </div>
              {useEntryTime && (
                <div className={styles.timeRange}>
                  <input type="time" className={styles.timeInput} value={entryTimeFrom} onChange={e => setEntryTimeFrom(e.target.value)} />
                  <span className={styles.timeSep}>~</span>
                  <input type="time" className={styles.timeInput} value={entryTimeTo} onChange={e => setEntryTimeTo(e.target.value)} />
                </div>
              )}
            </div>

            <div className={styles.divider} />

            {/* 지표 선택 */}
            <div className={styles.field}>
              <label className={styles.label}>지표 선택</label>
              <div className={styles.indicatorRow}>
                {INDICATORS.map(ind => (
                  <button key={ind.id}
                    className={`${styles.indBtn} ${indicator === ind.id ? styles.indActive : ''}`}
                    onClick={() => setIndicator(ind.id)}
                  >
                    <div className={styles.indPreview}>
                      <IndicatorPreview id={ind.id} />
                    </div>
                    <span className={styles.indLabel}>{ind.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 지표별 파라미터 */}
            {indicatorInfo && (
              <div className={styles.indicatorHelpPanel}>
                <div className={styles.indicatorHelpHeader}>
                  <span className={styles.indicatorHelpEyebrow}>Indicator Guide</span>
                  <span className={styles.indicatorHelpTitle}>{indicatorInfo.label}</span>
                </div>
                <p className={styles.indicatorHelpSummary}>{indicatorInfo.summary}</p>
                <div className={styles.indicatorHelpExamples}>
                  <div className={`${styles.indicatorHelpExample} ${styles.indicatorHelpBuy}`}>
                    <div className={styles.indicatorHelpExTag}>
                      <span className={styles.indicatorHelpDot} style={{ background: '#16a34a' }} />
                      <span className={styles.indicatorHelpTagLabel}>매수</span>
                    </div>
                    <p>{indicatorInfo.buyExample}</p>
                  </div>
                  <div className={`${styles.indicatorHelpExample} ${styles.indicatorHelpSell}`}>
                    <div className={styles.indicatorHelpExTag}>
                      <span className={styles.indicatorHelpDot} style={{ background: '#dc2626' }} />
                      <span className={styles.indicatorHelpTagLabel}>매도</span>
                    </div>
                    <p>{indicatorInfo.sellExample}</p>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.paramBox}>
              <IndicatorParams
                indicator={indicator}
                params={indParams[indicator] ?? {}}
                setParams={p => setIndParams(prev => ({ ...prev, [indicator]: p(prev[indicator] ?? {}) }))}
              />
            </div>

            <div className={styles.divider} />

            {/* 추가 필터 */}
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>거래량 필터</label>
                <select className={styles.select} value={volumeFilter} onChange={e => setVolumeFilter(e.target.value)}>
                  {VOLUME_FILTERS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>추세 필터</label>
                <select className={styles.select} value={trendFilter} onChange={e => setTrendFilter(e.target.value)}>
                  {TREND_FILTERS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>캔들 패턴</label>
                <select className={styles.select} value={candlePattern} onChange={e => setCandlePattern(e.target.value)}>
                  {CANDLE_PATTERNS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>최대 포지션 비중 (%)</label>
                <input className={styles.input} type="number" value={maxPos} min={1} max={100}
                  onChange={e => setMaxPos(Number(e.target.value))} />
              </div>
            </div>

          </div>
        </div>

        {/* 오른쪽 — 청산 조건 + 우선순위 통합 */}
        <div className={styles.col}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>청산 조건 <span className={styles.badge}>매도</span></h3>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>손절 (Stop Loss, %)</label>
                <input className={`${styles.input} ${styles.inputSell}`} type="number"
                  value={stopLoss} step="0.5" min={0} onChange={e => setStopLoss(Number(e.target.value))} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>익절 (Take Profit, %)</label>
                <input className={`${styles.input} ${styles.inputBuy}`} type="number"
                  value={takeProfit} step="0.5" min={0} onChange={e => setTakeProfit(Number(e.target.value))} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>최대 보유 기간 (일)</label>
                <input className={styles.input} type="number" value={maxHoldDays} min={1} max={365}
                  onChange={e => setMaxHoldDays(Number(e.target.value))} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>트레일링 스탑</label>
                <div className={styles.toggleGroup}>
                  <button className={`${styles.toggleBtn} ${!trailingStop ? styles.toggleActive : ''}`} onClick={() => setTrailingStop(false)}>사용 안함</button>
                  <button className={`${styles.toggleBtn} ${trailingStop  ? styles.toggleActive : ''}`} onClick={() => setTrailingStop(true)}>사용함</button>
                </div>
              </div>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLbl}>손절 기준</span>
                <span className={styles.infoVal} style={{ color: '#dc2626' }}>진입가 대비 -{stopLoss}%</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLbl}>익절 기준</span>
                <span className={styles.infoVal} style={{ color: '#16a34a' }}>진입가 대비 +{takeProfit}%</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLbl}>리스크/리워드</span>
                <span className={styles.infoVal}>1 : {(takeProfit / stopLoss).toFixed(2)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLbl}>최대 보유</span>
                <span className={styles.infoVal}>{maxHoldDays}일</span>
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: 12 }}>
              <label className={styles.label}>청산 시간 제한</label>
              <div className={styles.toggleGroup}>
                <button className={`${styles.toggleBtn} ${!useExitTime ? styles.toggleActive : ''}`} onClick={() => setUseExitTime(false)}>사용 안함</button>
                <button className={`${styles.toggleBtn} ${useExitTime  ? styles.toggleActive : ''}`} onClick={() => setUseExitTime(true)}>사용함</button>
              </div>
            </div>

            <div className={styles.divider} />

            {/* 청산 우선순위 — 청산 조건 섹션 안에 통합 */}
            <div className={styles.subTitle}>
              청산 우선순위 <span className={styles.priorityHint}>드래그로 순서 변경</span>
            </div>
            <div className={styles.priorityList}>
              {priorities.map(({ id, label, sub, color, bg }, i) => (
                <div key={id} className={styles.priorityItem} draggable
                  onDragStart={() => { dragIndex.current = i }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    const from = dragIndex.current
                    if (from === i) return
                    setPriorities(prev => {
                      const next = [...prev]
                      const [moved] = next.splice(from, 1)
                      next.splice(i, 0, moved)
                      return next
                    })
                  }}
                >
                  <span className={styles.dragHandle}>⠿</span>
                  <span className={styles.priorityNum} style={{ color, background: bg }}>{i + 1}</span>
                  <div className={styles.priorityText}>
                    <span className={styles.priorityLabel}>{label}</span>
                    <span className={styles.prioritySub}>{sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 백테스트 결과 */}
      {results && (
        <div className={styles.results}>
          <h3 className={styles.resultsTitle}>백테스트 결과 — {stock} · {indLabel} · {timeframe}</h3>
          <div className={styles.metricsRow}>
            <div className={`${styles.metric} ${results.totalReturn >= 0 ? styles.metricUp : styles.metricDown}`}>
              <span className={styles.metricLbl}>총 수익률</span>
              <span className={styles.metricVal}>{results.totalReturn >= 0 ? '+' : ''}{results.totalReturn}%</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLbl}>최종 자산</span>
              <span className={styles.metricVal}>${results.finalEq.toLocaleString()}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLbl}>승률</span>
              <span className={styles.metricVal}>{results.winRate}%</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLbl}>총 거래</span>
              <span className={styles.metricVal}>{results.trades}건</span>
            </div>
            <div className={`${styles.metric} ${styles.metricDown}`}>
              <span className={styles.metricLbl}>최대 낙폭</span>
              <span className={styles.metricVal}>-{results.maxDD}%</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLbl}>Sharpe</span>
              <span className={styles.metricVal}>{results.sharpe}</span>
            </div>
          </div>
          <div className={styles.chartWrap}>
            <div className={styles.chartLabel}>자산 곡선 (Equity Curve)</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={results.curve} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                <XAxis dataKey="t" hide />
                <YAxis domain={[minEq, maxEq]}
                  tick={{ fontSize: 11, fill: '#aaa', fontFamily: 'system-ui' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  width={52} orientation="right" />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }}
                  formatter={v => [`$${v.toLocaleString()}`, '자산']}
                  labelFormatter={v => `거래 ${v}건`} />
                <ReferenceLine y={capital} stroke="#aaa" strokeDasharray="4 2" />
                <Line dataKey="equity"
                  stroke={results.totalReturn >= 0 ? '#16a34a' : '#dc2626'}
                  strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
