import { useMemo } from 'react'
import { useStrategy } from '../../context/StrategyContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import IndicatorPreview from './IndicatorPreview'
import BacktestChart from './BacktestChart'
import styles from './Strategy.module.css'
import { SIGNAL_FNS, combineSignals } from '../../services/indicators'
import { runBacktest as execBacktest } from '../../services/backtest'
import { optimizeParams, scanAllIndicators } from '../../services/optimizer'
import { getCachedChartData, stocks } from '../../data/stocks'

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
  const {
    capital, setCapital, commission, setCommission, slippage, setSlippage,
    startDate, setStartDate, endDate, setEndDate, timeframe, setTimeframe, stock, setStock,
    activeIndicators, setActiveIndicators, focusedIndicator, setFocusedIndicator,
    combineMode, setCombineMode, indParams, setIndParams,
    maxPos, setMaxPos, volumeFilter, setVolumeFilter, trendFilter, setTrendFilter,
    candlePattern, setCandlePattern, useEntryTime, setUseEntryTime,
    entryTimeFrom, setEntryTimeFrom, entryTimeTo, setEntryTimeTo,
    stopLoss, setStopLoss, takeProfit, setTakeProfit, trailingStop, setTrailingStop,
    maxHoldDays, setMaxHoldDays, useExitTime, setUseExitTime, priorities, setPriorities,
    dragIndex,
    entryEnabled, setEntryEnabled, exitEnabled, setExitEnabled,
    results, setResults, running, setRunning, priceData, setPriceData, btError, setBtError,
    saveModal, setSaveModal, stratName, setStratName, loadModal, setLoadModal,
    savedList, setSavedList, compareModal, setCompareModal,
    compareSelected, setCompareSelected, compareResults, setCompareResults,
    optimizeModal, setOptimizeModal, optimizeResults, setOptimizeResults, optimizing, setOptimizing,
    scanModal, setScanModal, scanResults, setScanResults, scanning, setScanning,
  } = useStrategy()

  function toggleIndicator(id) {
    setFocusedIndicator(id)
    setActiveIndicators(prev => {
      const next = new Set(prev)
      if (next.has(id) && next.size > 1) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function runBacktest() {
    setRunning(true)
    setBtError(null)
    setCompareResults([])
    setTimeout(() => {
      try {
        const stockInfo  = stocks.find(s => s.id === stock)
        const rawData    = getCachedChartData(stockInfo, 'd')
        const start      = new Date(startDate)
        const end        = new Date(endDate)
        const data       = rawData.filter(d => {
          const t = new Date(d.time)
          return t >= start && t <= end
        })
        if (data.length === 0) throw new Error('선택한 기간에 데이터가 없어요. 날짜 범위를 확인해주세요.')
        const allSignals = [...activeIndicators].map(id => SIGNAL_FNS[id](data, indParams[id]))
        const signals    = allSignals.length === 1 ? allSignals[0] : combineSignals(allSignals, combineMode)
        const result     = execBacktest(data, signals, {
          capital, commission, slippage,
          stopLoss, takeProfit, maxHoldDays,
          maxPos,
        })
        setResults(result)
        setPriceData(data)
      } catch (e) {
        console.error('백테스트 오류:', e)
        setBtError(e.message || String(e))
      } finally {
        setRunning(false)
      }
    }, 300)
  }

  const COMPARE_COLORS = ['#f59e0b', '#2563eb', '#16a34a', '#dc2626', '#8b5cf6']

  const compatibleStrategies = useMemo(() =>
    savedList.filter(s => s.activeIndicators),
    [savedList]
  )

  function runComparison() {
    setResults(null)
    setPriceData(null)
    const compared = []
    let colorIdx = 0
    for (const s of savedList) {
      if (!compareSelected.has(s.id)) continue
      try {
        const stockInfo  = stocks.find(st => st.id === s.stock)
        const data       = getCachedChartData(stockInfo, 'd')
        const allSignals = s.activeIndicators.map(id => SIGNAL_FNS[id](data, s.indParams[id]))
        const signals    = allSignals.length === 1 ? allSignals[0] : combineSignals(allSignals, s.combineMode)
        const result     = execBacktest(data, signals, {
          capital: s.capital, commission: s.commission, slippage: s.slippage,
          stopLoss: s.stopLoss, takeProfit: s.takeProfit,
          maxHoldDays: s.maxHoldDays, maxPos: s.maxPos,
        })
        compared.push({ id: s.id, key: `c${colorIdx}`, name: s.name, indicators: s.activeIndicators.join('+'), result, color: COMPARE_COLORS[colorIdx++ % COMPARE_COLORS.length] })
      } catch (e) { console.error(e) }
    }
    setCompareResults(compared)
    setCompareModal(false)
  }

  function runOptimize() {
    setOptimizing(true)
    setOptimizeResults([])
    setTimeout(() => {
      try {
        const stockInfo = stocks.find(s => s.id === stock)
        const data      = getCachedChartData(stockInfo, 'd')
        const results   = optimizeParams(data, activeIndicators, combineMode, {
          capital, commission, slippage, stopLoss, takeProfit, maxHoldDays, maxPos,
        })
        setOptimizeResults(results)
        setOptimizeModal(true)
      } catch (e) { console.error(e) }
      finally { setOptimizing(false) }
    }, 50)
  }

  function runScan() {
    setScanning(true)
    setScanResults([])
    setTimeout(() => {
      try {
        const stockInfo = stocks.find(s => s.id === stock)
        const data      = getCachedChartData(stockInfo, 'd')
        const results   = scanAllIndicators(data, {
          capital, commission, slippage, stopLoss, takeProfit, maxHoldDays, maxPos,
        })
        setScanResults(results)
        setScanModal(true)
      } catch (e) { console.error(e) }
      finally { setScanning(false) }
    }, 50)
  }

  function applyOptimizedParams({ params, stopLoss, takeProfit, ids }) {
    setIndParams(prev => ({ ...prev, ...params }))
    setStopLoss(stopLoss)
    setTakeProfit(takeProfit)
    if (ids?.length) {
      setActiveIndicators(new Set(ids))
      setFocusedIndicator(ids[0])
    }
    setOptimizeModal(false)
    setScanModal(false)
  }

  function confirmSave() {
    if (!stratName.trim()) return
    const saved = JSON.parse(localStorage.getItem('my_strategies') || '[]')
    saved.unshift({
      id:        Date.now(),
      name:      stratName.trim(),
      stock, timeframe, capital, commission, slippage,
      activeIndicators: [...activeIndicators], combineMode, indParams, maxPos,
      stopLoss, takeProfit, maxHoldDays,
      savedAt: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    })
    localStorage.setItem('my_strategies', JSON.stringify(saved))
    setSavedList(saved)
    setSaveModal(false)
    setStratName('')
  }

  function loadStrategy(s) {
    setStock(s.stock)
    setTimeframe(s.timeframe)
    setCapital(s.capital)
    setCommission(s.commission)
    setSlippage(s.slippage)
    setActiveIndicators(new Set(s.activeIndicators))
    setFocusedIndicator(s.activeIndicators[0])
    setCombineMode(s.combineMode)
    setIndParams(s.indParams)
    setMaxPos(s.maxPos)
    setStopLoss(s.stopLoss)
    setTakeProfit(s.takeProfit)
    setMaxHoldDays(s.maxHoldDays)
    setLoadModal(false)
  }

  function deleteStrategy(id) {
    const next = savedList.filter(s => s.id !== id)
    localStorage.setItem('my_strategies', JSON.stringify(next))
    setSavedList(next)
  }

  const minEq = useMemo(() => results ? Math.min(...results.curve.map(d => d.equity)) * 0.98 : 0, [results])
  const maxEq = useMemo(() => results ? Math.max(...results.curve.map(d => d.equity)) * 1.02 : 1, [results])

  const splitCurve = useMemo(() => {
    if (!results) return []
    return results.curve.map((d, i, arr) => {
      const isUp   = d.equity >= capital
      const prev   = arr[i - 1]
      const cross  = prev && (prev.equity >= capital) !== isUp
      return {
        ...d,
        equityUp:   (isUp  || cross) ? d.equity : null,
        equityDown: (!isUp || cross) ? d.equity : null,
      }
    })
  }, [results, capital])


  const activeLabels   = [...activeIndicators].map(id => INDICATORS.find(i => i.id === id)?.label).filter(Boolean).join(' + ')
  const indicatorInfo  = INDICATOR_DETAILS.find(item => item.id === focusedIndicator)


  const compareOnlyCurve = useMemo(() => {
    if (!compareResults.length) return null
    const base = compareResults[0].result.curve
    return base.map((pt, i) => {
      const row = { t: pt.t, date: pt.date }
      compareResults.forEach(cr => { row[cr.key] = cr.result.curve[i]?.equity })
      return row
    })
  }, [compareResults])

  const compareMinEq = useMemo(() => {
    if (!compareResults.length) return 0
    const allVals = compareResults.flatMap(cr => cr.result.curve.map(p => p.equity))
    return Math.min(...allVals) * 0.98
  }, [compareResults])

  const compareMaxEq = useMemo(() => {
    if (!compareResults.length) return 1
    const allVals = compareResults.flatMap(cr => cr.result.curve.map(p => p.equity))
    return Math.max(...allVals) * 1.02
  }, [compareResults])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Strategy Builder</h1>
          <p className={styles.subtitle}>전략을 설정하고 백테스트를 실행하세요</p>
        </div>
        <div className={styles.headerBtns}>
          {savedList.length > 1 && (
            <button className={styles.saveStratBtn} onClick={() => { setCompareSelected(new Set()); setCompareModal(true) }}>
              전략 비교 <span className={styles.savedCount}>{savedList.length}</span>
            </button>
          )}
          <button className={styles.saveStratBtn} onClick={() => setLoadModal(true)}>
            불러오기 {savedList.length > 0 && <span className={styles.savedCount}>{savedList.length}</span>}
          </button>
          <button className={styles.saveStratBtn} onClick={() => {
            setStratName('')
            setSaveModal(true)
          }}>
            전략 저장
          </button>
          <button className={styles.saveStratBtn} onClick={runScan} disabled={scanning || running}>
            {scanning ? '스캔 중…' : '🔍 전체 지표 스캔'}
          </button>
          <button className={styles.saveStratBtn} onClick={runOptimize} disabled={optimizing || running}>
            {optimizing ? '최적화 중…' : '⚙ 파라미터 최적화'}
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
          <div className={styles.section} style={!entryEnabled ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
            <h3 className={styles.sectionTitle}>
              진입 조건 <span className={styles.badgeBuy}>매수</span>
              <button
                className={`${styles.condToggle} ${entryEnabled ? styles.condToggleOn : ''}`}
                onClick={() => setEntryEnabled(v => !v)}
                title={entryEnabled ? '진입 조건 비활성화' : '진입 조건 활성화'}
                style={{ pointerEvents: 'auto' }}
              >
                <span className={styles.condToggleThumb} />
              </button>
              <span className={styles.condToggleLabel}>{entryEnabled ? 'ON' : 'OFF'}</span>
            </h3>

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
              <div className={styles.indicatorLabelRow}>
                <label className={styles.label}>지표 선택</label>
                {activeIndicators.size > 1 && (
                  <div className={styles.combineModeWrap}>
                    <span className={styles.combineModeLabel}>신호 결합</span>
                    <div className={styles.toggleGroup}>
                      <button className={`${styles.toggleBtn} ${combineMode === 'AND' ? styles.toggleActive : ''}`} onClick={() => setCombineMode('AND')}>AND</button>
                      <button className={`${styles.toggleBtn} ${combineMode === 'OR'  ? styles.toggleActive : ''}`} onClick={() => setCombineMode('OR')}>OR</button>
                    </div>
                  </div>
                )}
              </div>
              {activeIndicators.size > 1 && (
                <p className={styles.combineModeHint}>
                  {combineMode === 'AND'
                    ? '모든 지표가 동시에 같은 신호를 낼 때만 매수·매도 — 신호가 적지만 정확도가 높아요.'
                    : '지표 중 하나라도 신호를 내면 매수·매도 — 신호가 많지만 노이즈도 늘어요.'}
                </p>
              )}
              <div className={styles.indicatorRow}>
                {INDICATORS.map(ind => (
                  <button key={ind.id}
                    className={`${styles.indBtn} ${activeIndicators.has(ind.id) ? styles.indActive : ''}`}
                    onClick={() => toggleIndicator(ind.id)}
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

            {[...activeIndicators].map(id => (
              <div key={id} className={styles.paramBox}>
                <div className={styles.paramBoxLabel}>
                  {INDICATORS.find(i => i.id === id)?.label}
                </div>
                <IndicatorParams
                  indicator={id}
                  params={indParams[id] ?? {}}
                  setParams={p => setIndParams(prev => ({ ...prev, [id]: p(prev[id] ?? {}) }))}
                />
              </div>
            ))}

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
          <div className={styles.section} style={!exitEnabled ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
            <h3 className={styles.sectionTitle}>
              청산 조건 <span className={styles.badge}>매도</span>
              <button
                className={`${styles.condToggle} ${exitEnabled ? styles.condToggleOn : ''}`}
                onClick={() => setExitEnabled(v => !v)}
                title={exitEnabled ? '청산 조건 비활성화' : '청산 조건 활성화'}
                style={{ pointerEvents: 'auto' }}
              >
                <span className={styles.condToggleThumb} />
              </button>
              <span className={styles.condToggleLabel}>{exitEnabled ? 'ON' : 'OFF'}</span>
            </h3>

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

      {/* 전략 불러오기 모달 */}
      {loadModal && (
        <div className={styles.modalOverlay} onClick={() => setLoadModal(false)}>
          <div className={styles.modal} style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>저장된 전략</h3>
            {savedList.length === 0 ? (
              <p className={styles.modalEmpty}>저장된 전략이 없어요.</p>
            ) : (
              <div className={styles.savedList}>
                {savedList.map(s => (
                  <div key={s.id} className={styles.savedItem}>
                    <div className={styles.savedItemMain} onClick={() => loadStrategy(s)}>
                      <span className={styles.savedItemName}>{s.name}</span>
                      <span className={styles.savedItemMeta}>{s.stock} · {(s.activeIndicators ?? [s.indicator]).join(' + ')} · {s.timeframe}</span>
                      <span className={styles.savedItemDate}>{s.savedAt}</span>
                    </div>
                    <button className={styles.savedItemDel} onClick={() => deleteStrategy(s.id)} title="삭제">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.modalBtns} style={{ marginTop: 20 }}>
              <button className={styles.modalCancelBtn} onClick={() => setLoadModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 전략 비교 선택 모달 */}
      {compareModal && (
        <div className={styles.modalOverlay} onClick={() => setCompareModal(false)}>
          <div className={styles.modal} style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>전략 비교</h3>
            <p className={styles.modalSub}>비교할 전략을 2개 이상 선택하세요</p>
            <div className={styles.savedList}>
              {compatibleStrategies.map(s => (
                <div key={s.id}
                  className={`${styles.savedItem} ${compareSelected.has(s.id) ? styles.savedItemSelected : ''}`}
                  onClick={() => setCompareSelected(prev => {
                    const next = new Set(prev)
                    next.has(s.id) ? next.delete(s.id) : next.add(s.id)
                    return next
                  })}
                >
                  <span className={styles.compareCheck}>{compareSelected.has(s.id) ? '✓' : ''}</span>
                  <div className={styles.savedItemMain} style={{ cursor: 'default' }}>
                    <span className={styles.savedItemName}>{s.name}</span>
                    <span className={styles.savedItemMeta}>{s.activeIndicators.join(' + ')} · {s.combineMode}</span>
                    <span className={styles.savedItemDate}>{s.savedAt}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.modalBtns} style={{ marginTop: 20 }}>
              <button className={styles.modalCancelBtn} onClick={() => setCompareModal(false)}>취소</button>
              <button className={styles.runBtn} disabled={compareSelected.size === 0} onClick={runComparison}>
                비교 실행 {compareSelected.size > 0 && `(${compareSelected.size}개)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 지표 스캔 결과 모달 */}
      {scanModal && (
        <div className={styles.modalOverlay} onClick={() => setScanModal(false)}>
          <div className={styles.modal} style={{ width: 640 }} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>전체 지표 스캔 결과</h3>
            <p className={styles.modalSub}>{stock} · 8개 지표 × 파라미터 × 손절/익절 — 수익률 기준</p>
            <p className={styles.modalDisclaimer}>⚠ 속도를 위해 대표 파라미터 조합만 탐색합니다. 모든 경우의 수를 확인하지는 않아요.</p>
            <div className={styles.optResultList}>
              {scanResults.map((r, i) => (
                <div key={r.id} className={`${styles.optResultItem} ${i === 0 ? styles.optResultBest : ''}`}>
                  <div className={styles.optResultRow1}>
                    <span className={styles.optRank}>#{i + 1}</span>
                    <div className={styles.optParams}>
                      {r.ids.map(id => (
                        <div key={id} className={styles.optParamGroup}>
                          <span className={styles.optIndLabel}>{id.toUpperCase()}</span>
                          {Object.entries(r.params[id]).map(([k, v]) => (
                            <span key={k} className={styles.optParam}>{k}: <strong>{v}</strong></span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.optResultRow2}>
                    <div className={styles.optMetrics}>
                      <span className={`${styles.optMetric} ${r.totalReturn >= 0 ? styles.metricUp : styles.metricDown}`} style={{ fontWeight: 800 }}>
                        {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn}%
                      </span>
                      <span className={styles.optMetric}>승률 {r.winRate}%</span>
                      <span className={styles.optMetric}>Sharpe {r.sharpe}</span>
                      <span className={styles.optMetric}>{r.trades}건</span>
                      <span className={styles.optMetric} style={{ color: '#dc2626' }}>SL {r.stopLoss}%</span>
                      <span className={styles.optMetric} style={{ color: '#16a34a' }}>TP {r.takeProfit}%</span>
                    </div>
                    <button className={styles.optApplyBtn} onClick={() => applyOptimizedParams(r)}>적용</button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.modalBtns} style={{ marginTop: 20 }}>
              <button className={styles.modalCancelBtn} onClick={() => setScanModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 파라미터 최적화 결과 모달 */}
      {optimizeModal && (
        <div className={styles.modalOverlay} onClick={() => setOptimizeModal(false)}>
          <div className={styles.modal} style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>파라미터 최적화 결과</h3>
            <p className={styles.modalSub}>{stock} · {activeLabels} · 수익률 기준 상위 5개</p>
            <p className={styles.modalDisclaimer}>⚠ 속도를 위해 대표 파라미터 조합만 탐색합니다. 모든 경우의 수를 확인하지는 않아요.</p>
            {optimizeResults.length === 0 ? (
              <p className={styles.modalEmpty}>유효한 결과가 없어요. 지표나 기간을 바꿔보세요.</p>
            ) : (
              <div className={styles.optResultList}>
                {optimizeResults.map((r, i) => (
                <div key={i} className={styles.optResultItem}>
                  <div className={styles.optResultRow1}>
                    <span className={styles.optRank}>#{i + 1}</span>
                    <div className={styles.optParams}>
                      {Object.entries(r.params).map(([indId, p]) => (
                        <div key={indId} className={styles.optParamGroup}>
                          <span className={styles.optIndLabel}>{indId.toUpperCase()}</span>
                          {Object.entries(p).map(([k, v]) => (
                            <span key={k} className={styles.optParam}>{k}: <strong>{v}</strong></span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.optResultRow2}>
                    <div className={styles.optMetrics}>
                      <span className={`${styles.optMetric} ${r.totalReturn >= 0 ? styles.metricUp : styles.metricDown}`} style={{ fontWeight: 800 }}>
                        {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn}%
                      </span>
                      <span className={styles.optMetric}>승률 {r.winRate}%</span>
                      <span className={styles.optMetric}>Sharpe {r.sharpe}</span>
                      <span className={styles.optMetric}>{r.trades}건</span>
                      <span className={styles.optMetric} style={{ color: '#dc2626' }}>SL {r.stopLoss}%</span>
                      <span className={styles.optMetric} style={{ color: '#16a34a' }}>TP {r.takeProfit}%</span>
                    </div>
                    <button className={styles.optApplyBtn} onClick={() => applyOptimizedParams(r)}>적용</button>
                  </div>
                </div>
              ))}
              </div>
            )}
            <div className={styles.modalBtns} style={{ marginTop: 20 }}>
              <button className={styles.modalCancelBtn} onClick={() => setOptimizeModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 전략 저장 모달 */}
      {saveModal && (
        <div className={styles.modalOverlay} onClick={() => setSaveModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>전략 저장</h3>
            <p className={styles.modalSub}>{stock} · {activeLabels} · {timeframe}</p>
            <div className={styles.field} style={{ marginBottom: 20 }}>
              <label className={styles.label}>전략 이름</label>
              <input
                className={styles.input}
                placeholder="예: AAPL RSI 단기 전략"
                value={stratName}
                onChange={e => setStratName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && stratName.trim()) confirmSave()
                }}
                autoFocus
              />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancelBtn} onClick={() => setSaveModal(false)}>취소</button>
              <button className={styles.runBtn} disabled={!stratName.trim()} onClick={confirmSave}>저장</button>
            </div>
          </div>
        </div>
      )}

      {btError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', marginBottom: 20, color: '#dc2626', fontSize: 13 }}>
          백테스트 오류: {btError}
        </div>
      )}

      {/* 백테스트 결과 */}
      {results && (
        <div className={styles.results}>
          <h3 className={styles.resultsTitle}>백테스트 결과 — {stock} · {activeLabels} · {timeframe}</h3>
          {results.trades === 0 && activeIndicators.size > 1 && combineMode === 'AND' && (
            <p className={styles.zeroTradeHint}>
              AND 모드에서 {activeIndicators.size}개 지표가 동시에 신호를 내는 경우가 없었어요. OR 모드로 바꾸거나 지표 수를 줄여보세요.
            </p>
          )}
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
            <div className={`${styles.metric} ${results.cagr >= 0 ? styles.metricUp : styles.metricDown}`}>
              <span className={styles.metricLbl}>연평균 수익률</span>
              <span className={styles.metricVal}>{results.cagr >= 0 ? '+' : ''}{results.cagr}%</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLbl}>총 수수료</span>
              <span className={styles.metricVal}>${results.totalCommission.toLocaleString()}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLbl}>손익비</span>
              <span className={styles.metricVal}>{results.profitFactor !== null ? results.profitFactor : '-'}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLbl}>평균 보유</span>
              <span className={styles.metricVal}>{results.avgHoldDays}일</span>
            </div>
          </div>
          <div className={styles.chartWrap} style={{ marginBottom: 16 }}>
            <div className={styles.chartLabel}>자산 곡선 (Equity Curve)</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={splitCurve} margin={{ top: 8, right: 24, left: 0, bottom: 24 }}>
                <XAxis dataKey="date"
                  interval={Math.floor(splitCurve.length / 6)}
                  tick={{ fontSize: 11, fill: '#bbb', fontFamily: 'system-ui' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => {
                    if (!v) return ''
                    const d = new Date(v)
                    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
                  }}
                />
                <YAxis domain={[minEq, maxEq]}
                  tick={{ fontSize: 11, fill: '#aaa', fontFamily: 'system-ui' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  width={52} orientation="right" />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }}
                  formatter={(v, name) => v != null ? [`$${v.toLocaleString()}`, activeLabels] : [null]}
                  labelFormatter={v => v} />
                <ReferenceLine y={capital} stroke="#aaa" strokeDasharray="4 2" />
                <Line dataKey="equityUp"   stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                <Line dataKey="equityDown" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {priceData && results.tradeLog && (
            <div className={styles.chartWrap}>
              <div className={styles.chartLabel}>
                주가 & 매매 시점
                <span className={styles.tradeLegend}>
                  <span className={styles.legendBuy}>▲ BUY</span>
                  <span style={{ fontSize: 12 }}>▼ SELL — <span style={{ color: '#3b82f6' }}>손절(파랑)</span> · <span style={{ color: '#dc2626' }}>익절(빨강)</span></span>
                </span>
              </div>
              <BacktestChart data={priceData} tradeLog={results.tradeLog} />
            </div>
          )}

          {priceData && results.tradeLog?.length > 0 && (
            <div className={styles.tradeTableWrap}>
              <div className={styles.tradeTableHeader}>
                <span className={styles.tradeTableTitle}>거래 내역</span>
                <span className={styles.tradeTableCount}>{results.tradeLog.length}건</span>
              </div>
              <table className={styles.tradeTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>매수일</th>
                    <th>매수가</th>
                    <th>매도일</th>
                    <th>매도가</th>
                    <th>청산 이유</th>
                    <th>보유</th>
                    <th>손익</th>
                    <th>거래 수익률</th>
                    <th>누적 수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {results.tradeLog.map((t, i) => {
                    const entryDate  = priceData[t.entryIdx]?.time ?? '-'
                    const exitDate   = priceData[t.exitIdx]?.time  ?? '-'
                    const holdDays   = t.exitIdx - t.entryIdx
                    const retPct     = ((t.exitPrice - t.entryPrice) / t.entryPrice * 100).toFixed(2)
                    const equityAtExit = results.curve[t.exitIdx + 1]?.equity ?? results.curve[results.curve.length - 1].equity
                    const cumRetPct  = ((equityAtExit - capital) / capital * 100).toFixed(2)
                    const reasonMap = {
                      stopLoss:   { label: '손절', color: '#3b82f6', bg: '#eff6ff' },
                      takeProfit: { label: '익절', color: '#dc2626', bg: '#fef2f2' },
                      maxHold:    { label: '기간 만료', color: '#d97706', bg: '#fffbeb' },
                      signal:     { label: '신호 매도', color: '#6b7280', bg: '#f3f4f6' },
                      endOfData:  { label: '종료', color: '#9ca3af', bg: '#f9fafb' },
                    }
                    const reason = reasonMap[t.reason] ?? { label: t.reason, color: '#aaa', bg: '#f9fafb' }
                    return (
                      <tr key={i}>
                        <td style={{ color: '#ccc', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ color: '#888' }}>{entryDate}</td>
                        <td style={{ fontWeight: 600 }}>${t.entryPrice.toFixed(2)}</td>
                        <td style={{ color: '#888' }}>{exitDate}</td>
                        <td style={{ fontWeight: 600 }}>${t.exitPrice.toFixed(2)}</td>
                        <td>
                          <span style={{
                            color: reason.color, background: reason.bg,
                            padding: '2px 8px', borderRadius: 20,
                            fontSize: 11, fontWeight: 700,
                          }}>{reason.label}</span>
                        </td>
                        <td style={{ color: '#888' }}>{holdDays}일</td>
                        <td style={{ fontWeight: 700, color: t.pnl >= 0 ? '#dc2626' : '#3b82f6' }}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 600, color: t.pnl >= 0 ? '#dc2626' : '#3b82f6' }}>
                          {retPct >= 0 ? '+' : ''}{retPct}%
                        </td>
                        <td style={{ fontWeight: 700, color: cumRetPct >= 0 ? '#dc2626' : '#3b82f6' }}>
                          {cumRetPct >= 0 ? '+' : ''}{cumRetPct}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {compareResults.length > 0 && compareOnlyCurve && (
        <div className={styles.results}>
          <h3 className={styles.resultsTitle}>전략 비교 결과</h3>
          <div className={styles.compareTable}>
            <div className={styles.chartLabel} style={{ marginBottom: 8 }}>
              전략 비교 — 자산 곡선
              <span className={styles.tradeLegend}>
                {compareResults.map(cr => (
                  <span key={cr.key} style={{ color: cr.color, fontWeight: 700 }}>● {cr.name}</span>
                ))}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={compareOnlyCurve} margin={{ top: 8, right: 24, left: 0, bottom: 24 }}>
                <XAxis dataKey="date"
                  interval={Math.floor(compareOnlyCurve.length / 6)}
                  tick={{ fontSize: 11, fill: '#bbb', fontFamily: 'system-ui' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => { if (!v) return ''; const d = new Date(v); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}` }}
                />
                <YAxis domain={[compareMinEq, compareMaxEq]}
                  tick={{ fontSize: 11, fill: '#aaa', fontFamily: 'system-ui' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  width={52} orientation="right" />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }}
                  formatter={(v, name) => [`$${v?.toLocaleString()}`, compareResults.find(c => c.key === name)?.name ?? name]}
                  labelFormatter={v => v} />
                <ReferenceLine y={compareResults[0]?.result?.curve[0]?.equity ?? 10000} stroke="#aaa" strokeDasharray="4 2" />
                {compareResults.map(cr => (
                  <Line key={cr.key} dataKey={cr.key} name={cr.key}
                    stroke={cr.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>

            <div className={styles.compareTableHeader} style={{ marginTop: 16 }}>
              <span className={styles.compareTableLbl} />
              {compareResults.map(cr => (
                <span key={cr.key} className={styles.compareTableCell} style={{ color: cr.color }}>{cr.name}</span>
              ))}
            </div>
            {[
              { lbl: '총 수익률', key: 'totalReturn', fmt: v => `${v >= 0 ? '+' : ''}${v}%`, best: 'max' },
              { lbl: '최종 자산', key: 'finalEq',    fmt: v => `$${v.toLocaleString()}`,       best: 'max' },
              { lbl: '승률',      key: 'winRate',    fmt: v => `${v}%`,                         best: 'max' },
              { lbl: '총 거래',   key: 'trades',     fmt: v => `${v}건`,                         best: null  },
              { lbl: '최대 낙폭', key: 'maxDD',      fmt: v => `-${v}%`,                        best: 'min' },
              { lbl: 'Sharpe',    key: 'sharpe',     fmt: v => `${v}`,                          best: 'max' },
            ].map(({ lbl, key, fmt, best }) => {
              const allVals = compareResults.map(c => c.result[key])
              const winner  = best === 'max' ? Math.max(...allVals) : best === 'min' ? Math.min(...allVals) : null
              return (
                <div key={lbl} className={styles.compareTableRow}>
                  <span className={styles.compareTableLbl}>{lbl}</span>
                  {compareResults.map(cr => (
                    <span key={cr.key} className={`${styles.compareTableCell} ${cr.result[key] === winner ? styles.compareWin : ''}`}>
                      {fmt(cr.result[key])}
                    </span>
                  ))}
                </div>
              )
            })}
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button className={styles.clearCompareBtn} onClick={() => setCompareResults([])}>비교 초기화</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
