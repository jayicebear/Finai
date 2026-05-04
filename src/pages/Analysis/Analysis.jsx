import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { usePortfolio } from '../../context/PortfolioContext'
import styles from './Analysis.module.css'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const MODEL   = import.meta.env.VITE_OPENAI_MODEL 

const SUGGESTIONS = ['AAPL', 'TSLA', 'NVDA', '삼성전자', 'Microsoft', 'Bitcoin']

async function callGPT(apiKey, prompt) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      tools: [{ type: 'web_search_preview' }],
      input: prompt,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `API 오류 (${res.status})`)
  }

  const data = await res.json()
  const text = data.output
    ?.filter(o => o.type === 'message')
    ?.flatMap(o => o.content)
    ?.filter(c => c.type === 'output_text')
    ?.map(c => c.text)
    ?.join('') || ''

  if (!text) throw new Error('응답이 비어있습니다.')
  return text
}

function buildTradeSummary(tradeHistory, portfolio) {
  if (tradeHistory.length === 0) return null

  const recent = tradeHistory.slice(0, 20)

  const stockFreq = {}
  for (const t of recent) {
    if (!stockFreq[t.stockId]) stockFreq[t.stockId] = { buy: 0, sell: 0, name: t.stockName }
    t.type === 'BUY' ? stockFreq[t.stockId].buy++ : stockFreq[t.stockId].sell++
  }

  const buyCount  = recent.filter(t => t.type === 'BUY').length
  const sellCount = recent.filter(t => t.type === 'SELL').length
  const aiCount   = recent.filter(t => t.source === 'ai').length
  const avgAmount = recent.reduce((s, t) => s + t.total, 0) / recent.length

  const heldStocks = Object.entries(portfolio).map(([id, p]) =>
    `${id}(${p.name}) ${p.qty}주 평균단가 $${p.avgPrice}`
  ).join(', ')

  const stockSummary = Object.entries(stockFreq)
    .map(([id, v]) => `${id}(${v.name}): 매수 ${v.buy}회 매도 ${v.sell}회`)
    .join('\n')

  return `
최근 거래 내역 (최대 20건):
- 총 ${recent.length}건 (매수 ${buyCount}건, 매도 ${sellCount}건)
- AI 자동 거래: ${aiCount}건 / 직접 거래: ${recent.length - aiCount}건
- 평균 거래금액: $${avgAmount.toFixed(0)}
- 종목별 거래 빈도:
${stockSummary}

현재 보유 포지션:
${heldStocks || '없음'}
  `.trim()
}

const mdComponents = {
  h1: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
  h2: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
  h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
  p:  ({ children }) => <p  className={styles.p}>{children}</p>,
  li: ({ children }) => <li className={styles.li}>{children}</li>,
  strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
  ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
}

export default function Research() {
  const { tradeHistory, portfolio } = usePortfolio()

  const [tab, setTab]             = useState('research')
  const [query, setQuery]         = useState('')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const [strategy, setStrategy]         = useState(null)
  const [stratLoading, setStratLoading] = useState(false)
  const [stratError, setStratError]     = useState(null)
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved_strategies') || '[]') } catch { return [] }
  })
  const [viewSaved, setViewSaved] = useState(null)

  const saveStrategy = () => {
    if (!strategy) return
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      text: strategy,
      tradeCount: tradeHistory.length,
    }
    const next = [entry, ...saved]
    setSaved(next)
    localStorage.setItem('saved_strategies', JSON.stringify(next))
  }

  const deleteSaved = (id) => {
    const next = saved.filter(s => s.id !== id)
    setSaved(next)
    localStorage.setItem('saved_strategies', JSON.stringify(next))
    if (viewSaved?.id === id) setViewSaved(null)
  }

  const search = async (q = query) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const prompt = `"${q}" 주식/종목에 대해 최신 정보를 웹에서 검색하고 다음 형식으로 한국어로 정리해줘:

## 기본 정보
회사명, 티커, 업종, 현재 주가 및 등락률 (최신 데이터 기준)

## 최근 주요 뉴스
최근 뉴스 3~5개를 날짜와 함께 요약

## AI 분석 요약
시장 동향, 실적 현황, 투자 포인트 등 종합 분석

## 리스크 요인
주요 리스크 2~3가지`
      const text = await callGPT(API_KEY, prompt)
      setResult({ text, query: q.trim() })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const analyzeStrategy = async () => {
    const summary = buildTradeSummary(tradeHistory, portfolio)
    const pastStrategies = saved.slice(0, 3)
      .map((s, i) => `[이전 전략 ${i + 1} - ${s.date}]\n${s.text.slice(0, 400)}...`)
      .join('\n\n')

    const stratConfig = (() => {
      try {
        const c = JSON.parse(localStorage.getItem('my_strategy_config') || 'null')
        if (!c) return null
        const IND_LABELS = { ma: 'MA Crossover', rsi: 'RSI', macd: 'MACD', bollinger: 'Bollinger', momentum: 'Momentum' }
        const allParams = Object.entries(c.indParams)
          .map(([id, p]) => `  - ${IND_LABELS[id] || id}: ${Object.entries(p).map(([k,v]) => `${k}=${v}`).join(', ')}`)
          .join('\n')
        return `저장일: ${c.savedAt}
종목: ${c.stock} / 타임프레임: ${c.timeframe}
현재 선택 지표: ${IND_LABELS[c.indicator] || c.indicator}
전체 지표 설정:
${allParams}
최대 포지션 비중: ${c.maxPos}%
거래량 필터: ${c.volumeFilter} / 추세 필터: ${c.trendFilter} / 캔들 패턴: ${c.candlePattern}
손절: -${c.stopLoss}% / 익절: +${c.takeProfit}% / 최대 보유: ${c.maxHoldDays}일 / 트레일링 스탑: ${c.trailingStop ? '사용' : '미사용'}
청산 우선순위: ${c.priorities.join(' > ')}`
      } catch { return null }
    })()

    setStratLoading(true)
    setStratError(null)
    setStrategy(null)
    try {
      const prompt = `나는 주식 투자 앱을 사용하는 개인 투자자야. 내 최근 거래 데이터를 분석하고, 최신 시장 상황을 웹에서 검색해서 맞춤 투자 전략을 한국어로 제안해줘.

${summary ? `[내 거래 데이터]\n${summary}` : '[내 거래 데이터]\n아직 거래 내역이 없음'}

${stratConfig ? `[내가 설정한 트레이딩 전략]\n${stratConfig}` : ''}

${pastStrategies ? `[이전 AI 분석 전략들]\n${pastStrategies}` : ''}

위 데이터를 바탕으로 다음 형식으로 분석해줘:

## 내 투자 패턴 분석
거래 습관, 선호 종목, 매수/매도 비율, 리스크 성향 등

## 현재 시장 상황
지금 시장의 주요 트렌드와 이슈 (웹 검색 기반)

## 맞춤 전략 제안
내 패턴과 현재 시장을 결합한 구체적인 전략 3가지${pastStrategies ? ' (이전 전략과 중복되지 않게, 발전된 방향으로)' : ''}

## 이전 전략 대비 변화${pastStrategies ? '\n이전에 제안된 전략과 비교해서 달라진 점, 개선된 점' : '\n(이전 전략 없음 — 첫 분석)'}

${stratConfig ? `## 내 전략 설정 피드백
위에 제시된 내 트레이딩 전략 설정(지표, 손절/익절, 필터 등)을 현재 시장 상황에 비춰서 평가해줘.
- 잘 설정된 부분
- 현재 시장에서 리스크가 있는 부분
- 구체적인 수치 조정 제안 (예: 손절을 5%→3%로 줄여라 등)` : ''}

## 주의할 점
내 거래 습관에서 개선이 필요한 부분`

      const text = await callGPT(API_KEY, prompt)
      setStrategy(text)
    } catch (e) {
      setStratError(e.message)
    } finally {
      setStratLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>

        <div className={styles.header}>
          <h1 className={styles.title}>AI Stock Analysis</h1>
          <p className={styles.subtitle}>실시간 웹 검색으로 주식 정보를 분석합니다</p>
        </div>

        {/* 탭 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'research' ? styles.tabActive : ''}`}
            onClick={() => setTab('research')}
          >Stock Analysis</button>
          <button
            className={`${styles.tab} ${tab === 'strategy' ? styles.tabActive : ''}`}
            onClick={() => setTab('strategy')}
          >My Strategy</button>
        </div>

        {/* ── 종목 리서치 탭 ── */}
        {tab === 'research' && (
          <>
            <div className={styles.searchCard}>
              <div className={styles.searchRow}>
                <input
                  type="text"
                  placeholder="종목명 또는 티커 입력 (예: AAPL, 삼성전자, Tesla)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  className={styles.searchInput}
                />
                <button
                  onClick={() => search()}
                  disabled={loading || !query.trim()}
                  className={styles.searchBtn}
                >
                  {loading ? '검색 중...' : '검색'}
                </button>
              </div>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map(s => (
                  <button key={s} className={styles.chip} onClick={() => { setQuery(s); search(s) }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className={styles.error}>⚠ {error}</div>}

            {loading && (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>AI가 웹을 검색하고 분석 중입니다...</p>
              </div>
            )}

            {result && (
              <div className={styles.result}>
                <div className={styles.resultMeta}>
                  <span className={styles.resultTag}>AI 분석 결과</span>
                  <span className={styles.resultQuery}>"{result.query}"</span>
                </div>
                <div className={styles.resultBody}>
                  <ReactMarkdown components={mdComponents}>{result.text}</ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 맞춤 전략 탭 ── */}
        {tab === 'strategy' && (
          <>
            <div className={styles.stratCard}>
              <div className={styles.stratInfo}>
                <div>
                  <p className={styles.stratTitle}>내 거래 습관 기반 AI 전략</p>
                  <p className={styles.stratDesc}>
                    최근 거래 내역 {tradeHistory.length}건과 현재 보유 종목 {Object.keys(portfolio).length}개를 분석해
                    최신 시장 상황에 맞는 맞춤 전략을 제안합니다.
                  </p>
                </div>
                <button
                  onClick={analyzeStrategy}
                  disabled={stratLoading}
                  className={styles.stratBtn}
                >
                  {stratLoading ? '분석 중...' : '전략 분석 시작'}
                </button>
              </div>

              {tradeHistory.length > 0 && (
                <div className={styles.tradeStat}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>총 거래</span>
                    <span className={styles.statVal}>{tradeHistory.length}건</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>보유 종목</span>
                    <span className={styles.statVal}>{Object.keys(portfolio).length}개</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>매수</span>
                    <span className={styles.statVal}>{tradeHistory.filter(t => t.type === 'BUY').length}건</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>매도</span>
                    <span className={styles.statVal}>{tradeHistory.filter(t => t.type === 'SELL').length}건</span>
                  </div>
                </div>
              )}
            </div>

            {stratError && <div className={styles.error}>⚠ {stratError}</div>}

            {stratLoading && (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>거래 패턴을 분석하고 최신 시장 정보를 검색 중입니다...</p>
              </div>
            )}

            {strategy && (
              <>
                <div className={styles.result}>
                  <div className={styles.resultMeta}>
                    <span className={styles.resultTag} style={{ background: '#7c3aed' }}>맞춤 전략</span>
                    <span className={styles.resultQuery}>내 거래 습관 + 최신 시장 분석</span>
                  </div>
                  <div className={styles.resultBody}>
                    <ReactMarkdown components={mdComponents}>{strategy}</ReactMarkdown>
                  </div>
                </div>
                <button onClick={saveStrategy} className={styles.saveStratBtnFull}>
                  이 전략 저장하기
                </button>
              </>
            )}

            {/* 저장된 전략 목록 */}
            {saved.length > 0 && (
              <div className={styles.savedSection}>
                <p className={styles.savedTitle}>저장된 전략 ({saved.length})</p>
                <div className={styles.savedList}>
                  {saved.map(s => (
                    <div key={s.id} className={`${styles.savedItem} ${viewSaved?.id === s.id ? styles.savedItemActive : ''}`}>
                      <div className={styles.savedItemLeft} onClick={() => setViewSaved(viewSaved?.id === s.id ? null : s)}>
                        <span className={styles.savedDate}>{s.date}</span>
                        <span className={styles.savedMeta}>거래 {s.tradeCount}건 기준</span>
                      </div>
                      <button onClick={() => deleteSaved(s.id)} className={styles.deleteBtn}>삭제</button>
                    </div>
                  ))}
                </div>

                {viewSaved && (
                  <div className={styles.result} style={{ marginTop: 12 }}>
                    <div className={styles.resultMeta}>
                      <span className={styles.resultTag} style={{ background: '#7c3aed' }}>저장된 전략</span>
                      <span className={styles.resultQuery}>{viewSaved.date}</span>
                    </div>
                    <div className={styles.resultBody}>
                      <ReactMarkdown components={mdComponents}>{viewSaved.text}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  )
}
