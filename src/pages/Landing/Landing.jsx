import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { ComposedChart, Line, Bar, ResponsiveContainer, YAxis, XAxis, ReferenceDot } from 'recharts'
import styles from './Landing.module.css'

const FAQS = [
  { q: 'Is Apexis free to use?', a: 'Yes. Apexis is fully free for paper trading — no real money involved. All trades, strategies, and analytics are simulated using real NASDAQ market data.' },
  { q: 'What is paper trading?', a: 'Paper trading lets you practice buying and selling stocks with virtual money. You get real market conditions without any financial risk — perfect for testing strategies before going live.' },
  { q: 'How does the AI trading work?', a: 'Apexis integrates multiple AI models (GPT, Claude, Gemini) that analyze market signals in real time. Each model generates buy/sell suggestions based on price action, indicators, and momentum.' },
  { q: 'Can I build and test my own strategy?', a: 'Yes. The Strategy Builder lets you configure entry and exit conditions using indicators like MA Crossover, RSI, MACD, and Bollinger Bands. Run backtests to see historical performance before deploying.' },
  { q: 'What is the Investors page?', a: 'The Investors page lets you browse top-performing traders, view their portfolios, win rates, and strategies. You can study their approach and replicate their positions in your own paper portfolio.' },
  { q: 'Is real NASDAQ data used?', a: 'Yes. Apexis connects to the Alpha Vantage API to pull real daily price data for NASDAQ-listed stocks. Live quotes update whenever you switch between tickers.' },
]

const FEATURES = [
  { icon: '⚡', title: 'AI-Powered Signals', desc: 'Real-time buy and sell signals driven by multiple AI models — GPT, Claude, Gemini. Let the algorithm do the heavy lifting while you stay in control.' },
  { icon: '📊', title: 'Strategy Backtesting', desc: 'Design your own strategy with custom indicators and conditions. Run backtests on real NASDAQ data and see how your edge would have performed.' },
  { icon: '👥', title: 'Follow Top Traders', desc: 'Browse verified investors, study their portfolios, and mirror their moves. Learn from the best while you build your own trading edge.' },
]

const BUY_SIGNALS  = [
  { strategy: 'RSI Oversold',  stock: 'NVDA' },
  { strategy: 'MA Crossover',  stock: 'AAPL' },
  { strategy: 'Bollinger Low', stock: 'MSFT' },
  { strategy: 'MA Crossover',  stock: 'GOOGL' },
]
const SELL_SIGNALS = [
  { strategy: 'RSI Overbought', stock: 'TSLA' },
  { strategy: 'MACD Cross',     stock: 'AMZN' },
  { strategy: 'Bollinger High', stock: 'NVDA' },
  { strategy: 'Momentum',       stock: 'AAPL' },
]

const STOCK_CFG = {
  NVDA:  { base: 875, vol: 18, pull: 0.06 },
  AAPL:  { base: 188, vol: 4,  pull: 0.09 },
  MSFT:  { base: 415, vol: 7,  pull: 0.08 },
  GOOGL: { base: 172, vol: 4,  pull: 0.07 },
  TSLA:  { base: 175, vol: 12, pull: 0.05 },
  AMZN:  { base: 196, vol: 5,  pull: 0.08 },
}

function nextPrice(p, cfg) {
  const swing = (Math.random() - 0.5) * cfg.vol
  const pull  = (cfg.base - p) * cfg.pull
  const min   = cfg.base * 0.75
  const max   = cfg.base * 1.25
  return Math.max(min, Math.min(max, p + swing + pull))
}

function initPrices(stock, n = 40) {
  const cfg = STOCK_CFG[stock]
  const arr = []
  let p = cfg.base
  for (let i = 0; i < n; i++) {
    p = nextPrice(p, cfg)
    arr.push({ i, v: parseFloat(p.toFixed(2)), vol: Math.floor(Math.random() * 60 + 20) })
  }
  return arr
}

function initAllPrices() {
  return Object.fromEntries(Object.keys(STOCK_CFG).map(s => [s, initPrices(s)]))
}

function FeatureCard({ icon, title, desc, delay }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    setTilt({ x: -dy * 7, y: dx * 7 })
  }

  return (
    <div
      ref={ref}
      className={styles.card}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${hovering ? '10px' : '0'})`
          : 'translateY(30px)',
        transition: hovering
          ? 'opacity 0.1s, transform 0.12s ease-out, box-shadow 0.15s, border-color 0.15s'
          : `opacity 0.65s ${delay}ms ease, transform 0.65s ${delay}ms ease, box-shadow 0.3s, border-color 0.2s`,
        boxShadow: hovering ? '0 16px 40px rgba(26,26,46,0.13)' : undefined,
        borderColor: hovering ? '#b0aca6' : undefined,
      }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setTilt({ x: 0, y: 0 }) }}
    >
      <div className={styles.cardIcon}>{icon}</div>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDesc}>{desc}</p>
    </div>
  )
}

function LiveDemo() {
  const [pricesMap,  setPricesMap]  = useState(initAllPrices)
  const [signal,     setSignal]     = useState(null)
  const [trades,     setTrades]     = useState([])
  const [markersMap, setMarkersMap] = useState({})
  const [portfolio,  setPortfolio]  = useState(10000)
  const [flash,      setFlash]      = useState(null)
  const [watchStock, setWatchStock] = useState('NVDA')
  const modelIdxRef  = useRef(0)
  const tradeIdRef   = useRef(0)
  const pricesMapRef = useRef(initAllPrices())

  // 가격 업데이트 — 600ms (모든 종목)
  useEffect(() => {
    const id = setInterval(() => {
      setPricesMap(prev => {
        const updated = {}
        for (const stock of Object.keys(STOCK_CFG)) {
          const arr  = prev[stock]
          const last = arr[arr.length - 1].v
          const cfg  = STOCK_CFG[stock]
          const newEntry = { i: arr[arr.length - 1].i + 1, v: parseFloat(nextPrice(last, cfg).toFixed(2)), vol: Math.floor(Math.random() * 60 + 20) }
          updated[stock] = [...arr.slice(-49), newEntry]
        }
        pricesMapRef.current = updated
        return updated
      })
    }, 600)
    return () => clearInterval(id)
  }, [])

  // AI 신호 생성 — 6초마다
  useEffect(() => {
    const id = setInterval(() => {
      const idx  = modelIdxRef.current % (BUY_SIGNALS.length + SELL_SIGNALS.length)
      const isBuy = idx < BUY_SIGNALS.length
      const pool = isBuy ? BUY_SIGNALS : SELL_SIGNALS
      const m    = pool[modelIdxRef.current % pool.length]
      modelIdxRef.current++

      // 해당 종목의 현재 가격 기준으로 BUY/SELL
      const stockArr = pricesMapRef.current[m.stock]
      const cur      = stockArr[stockArr.length - 1].v
      const action   = cur < STOCK_CFG[m.stock].base ? 'BUY' : 'SELL'
      const color    = action === 'BUY' ? '#dc2626' : '#3b82f6'
      const conf     = Math.floor(Math.random() * 15 + 80)
      const price    = cur.toFixed(2)
      const newSignal = { ...m, action, color, conf, price, id: tradeIdRef.current }

      setSignal(newSignal)
      setWatchStock(m.stock)

      // 1초 후 체결
      setTimeout(() => {
        setSignal(null)
        setFlash(newSignal.action === 'BUY' ? 'buy' : 'sell')
        setTimeout(() => setFlash(null), 600)

        const arr = pricesMapRef.current[m.stock]
        const pt  = arr[arr.length - 1]
        setMarkersMap(prev => ({
          ...prev,
          [m.stock]: [...(prev[m.stock] ?? []).slice(-6), { i: pt.i, v: pt.v, action: newSignal.action }],
        }))

        const qty = Math.floor(Math.random() * 3 + 1)
        setTrades(prev => [
          { ...newSignal, qty, id: tradeIdRef.current++ },
          ...prev.slice(0, 3),
        ])
        setPortfolio(prev => {
          const sharePrice = parseFloat(newSignal.price)
          const pnl = sharePrice * qty * (Math.random() * 0.025 + 0.005)
          return Math.round(newSignal.action === 'BUY' ? prev + pnl : prev - pnl * 0.5)
        })
      }, 1000)
    }, 6000)
    return () => clearInterval(id)
  }, [])

  const prices   = pricesMap[watchStock] ?? []
  const allMarkers = markersMap[watchStock] ?? []
  const minI     = prices[0]?.i ?? 0
  const maxI     = prices[prices.length - 1]?.i ?? 0
  const markers  = allMarkers.filter(m => m.i >= minI && m.i <= maxI)
  const pct      = ((portfolio - 10000) / 10000 * 100).toFixed(2)

  return (
    <div className={`${styles.demo} ${flash === 'buy' ? styles.flashBuy : flash === 'sell' ? styles.flashSell : ''}`}>

      {/* 상단 — 라이브 배지 + 종합 */}
      <div className={styles.demoHeader}>
        <div className={styles.liveDot} />
        <span className={styles.liveLabel}>Live Simulation</span>
        <span className={styles.portfolioLabel}>Paper Balance</span>
        <span className={styles.demoPortfolio}>${portfolio.toLocaleString()}</span>
        <span className={`${styles.demoPct} ${parseFloat(pct) >= 0 ? styles.up : styles.down}`}>
          {parseFloat(pct) >= 0 ? '+' : ''}{pct}%
        </span>
      </div>

      {/* 차트 */}
      <div className={styles.demoChart}>
        <div className={styles.demoStockRow}>
          <span className={styles.demoStockTicker}>{watchStock}</span>
          <span className={styles.demoStockLabel}>simulated price</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={prices.map((d, idx, arr) => {
            const s10 = arr.slice(Math.max(0, idx - 9), idx + 1)
            const s20 = arr.slice(Math.max(0, idx - 19), idx + 1)
            const ma10 = parseFloat((s10.reduce((s, x) => s + x.v, 0) / s10.length).toFixed(2))
            const ma20 = parseFloat((s20.reduce((s, x) => s + x.v, 0) / s20.length).toFixed(2))
            return { ...d, ma10, ma20 }
          })} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="i" hide />
            <YAxis yAxisId="price" domain={['auto', 'auto']} hide />
            <YAxis yAxisId="vol" orientation="right" hide domain={[0, 200]} />
            <Bar yAxisId="vol" dataKey="vol" fill="#1a1a2e" opacity={0.08} isAnimationActive={false} />
            <Line
              yAxisId="price"
              dataKey="ma20"
              stroke="#e8a87c"
              strokeWidth={1.2}
              dot={false}
              isAnimationActive={false}
              strokeDasharray="4 3"
            />
            <Line
              yAxisId="price"
              dataKey="ma10"
              stroke="#a0a0c0"
              strokeWidth={1.2}
              dot={false}
              isAnimationActive={false}
              strokeDasharray="4 3"
            />
            <Line
              yAxisId="price"
              dataKey="v"
              stroke="#1a1a2e"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
            {markers.map((m, idx) => (
              <ReferenceDot
                key={idx}
                yAxisId="price"
                x={m.i}
                y={m.v}
                r={5}
                fill={m.action === 'BUY' ? '#dc2626' : '#3b82f6'}
                stroke="#fff"
                strokeWidth={2}
                label={{
                  value: m.action === 'BUY' ? 'B' : 'S',
                  position: m.action === 'BUY' ? 'bottom' : 'top',
                  fontSize: 9,
                  fontWeight: 700,
                  fill: m.action === 'BUY' ? '#dc2626' : '#3b82f6',
                  fontFamily: 'system-ui',
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* AI 신호 분석 중 */}
      <div className={styles.signalArea}>
        {signal ? (
          <div className={`${styles.signalCard} ${styles.signalAppear}`}>
            <div className={styles.signalThinking}>
              <span className={styles.signalModel}>AI · {signal.strategy}</span>
              <span className={styles.signalDots}>···</span>
              <span className={styles.signalAnalyzing}>analyzing</span>
            </div>
            <div className={styles.signalResult}>
              <span className={styles.signalStock}>{signal.stock}</span>
              <span className={styles.signalPrice}>${signal.price}</span>
              <span className={styles.signalConf}>{signal.conf}% confidence</span>
              <span
                className={styles.signalAction}
                style={{ background: signal.color + '20', color: signal.color }}
              >{signal.action}</span>
            </div>
          </div>
        ) : (
          <div className={styles.signalIdle}>
            <span className={styles.signalIdleDot} />
            Monitoring market signals…
          </div>
        )}
      </div>

      {/* 체결 내역 */}
      <div className={styles.tradeLog}>
        <div className={styles.tradeLogTitle}>Executions</div>
        {trades.length === 0 && (
          <div className={styles.tradeEmpty}>Waiting for first signal…</div>
        )}
        {trades.map((t, i) => (
          <div key={t.id} className={`${styles.tradeRow} ${i === 0 ? styles.tradeNew : ''}`}>
            <span className={styles.tradeAI}>AI</span>
            <span className={styles.tradeStrategy}>{t.strategy}</span>
            <span className={styles.tradeStock}>{t.stock}</span>
            <span className={styles.tradeQty}>{t.qty}</span>
            <span className={styles.tradePrice}>${t.price}</span>
            <span
              className={styles.tradeBadge}
              style={{ background: t.color + '20', color: t.color }}
            >{t.action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Landing() {
  const [openIdx, setOpenIdx] = useState(null)
  const orb1Ref = useRef(null)
  const orb2Ref = useRef(null)
  const orb3Ref = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (orb1Ref.current) orb1Ref.current.style.transform = `translateY(${y * 0.25}px)`
      if (orb2Ref.current) orb2Ref.current.style.transform = `translateY(${y * 0.42}px)`
      if (orb3Ref.current) orb3Ref.current.style.transform = `translateY(${y * 0.18}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <main className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.heroSection}>
        <div ref={orb1Ref} className={styles.orb1} />
        <div ref={orb2Ref} className={styles.orb2} />
        <div ref={orb3Ref} className={styles.orb3} />
        <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.badge}>AI PAPER TRADING FOR TRADERS</p>
          <h1 className={styles.title}>
            Trade at<br />the apex.<br />
            <span className={styles.titleAccent}>Trade smarter<br />with AI.</span>
          </h1>
          <p className={styles.subtitle}>
            Build and test strategies with realistic market simulations,
            signal-driven insights, and performance analytics built for active traders.
          </p>
          <div className={styles.ctaRow}>
            <Link to="/trading" className={styles.ctaPrimary}>Start Trading</Link>
            <Link to="/strategy" className={styles.ctaSecondary}>Build a Strategy</Link>
          </div>
        </div>
        <div className={styles.heroRight}>
          <LiveDemo />
        </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features}>
        <p className={styles.featuresLabel}>WHY APEXIS</p>
        <div className={styles.cards}>
          {FEATURES.map(({ icon, title, desc }, i) => (
            <FeatureCard key={title} icon={icon} title={title} desc={desc} delay={i * 120} />
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={styles.faq}>
        <p className={styles.featuresLabel}>FREQUENTLY ASKED QUESTIONS</p>
        <h2 className={styles.faqTitle}>Got questions?</h2>
        <div className={styles.faqList}>
          {FAQS.map(({ q, a }, i) => (
            <div key={i}
              className={`${styles.faqItem} ${openIdx === i ? styles.faqOpen : ''}`}
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
            >
              <div className={styles.faqQ}>
                <span>{q}</span>
                <span className={styles.faqChevron}>{openIdx === i ? '−' : '+'}</span>
              </div>
              {openIdx === i && <p className={styles.faqA}>{a}</p>}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
