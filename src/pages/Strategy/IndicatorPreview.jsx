const W = 110
const H = 48

function norm(data, lo = 4, hi = H - 4) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  return data.map(v => hi - ((v - min) / range) * (hi - lo))
}

function line(data, lo, hi) {
  const ys = norm(data, lo, hi)
  return data.map((_, i) => `${i === 0 ? 'M' : 'L'}${((i / (data.length - 1)) * W).toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
}

function xAt(i, n) { return ((i / (n - 1)) * W).toFixed(1) }

// --- MA Crossover ---
function MaPreview() {
  const N = 22
  const price = Array.from({ length: N }, (_, i) =>
    20 + 6 * Math.sin(i * 0.38 + 0.5) + i * 0.3
  )
  const fast = price.map((_, i, a) => {
    const s = a.slice(Math.max(0, i - 2), i + 1)
    return s.reduce((x, y) => x + y) / s.length
  })
  const slow = price.map((_, i, a) => {
    const s = a.slice(Math.max(0, i - 7), i + 1)
    return s.reduce((x, y) => x + y) / s.length
  })
  const all = [...price, ...fast, ...slow]
  const mn = Math.min(...all), mx = Math.max(...all)
  const y = v => (H - 6 - ((v - mn) / (mx - mn)) * (H - 10)).toFixed(1)
  const p = arr => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${y(v)}`).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={p(price)} fill="none" stroke="#d1d5db" strokeWidth="1" />
      <path d={p(fast)}  fill="none" stroke="#ef4444" strokeWidth="1.5" />
      <path d={p(slow)}  fill="none" stroke="#f97316" strokeWidth="1.5" />
      {/* 골든크로스 표시 */}
      <circle cx={xAt(13, N)} cy={y(fast[13])} r="2.5" fill="#16a34a" />
    </svg>
  )
}

// --- RSI ---
function RsiPreview() {
  const N = 22
  const rsi = Array.from({ length: N }, (_, i) => 50 + 28 * Math.sin(i * 0.42 - 0.8))
  const y70 = norm([0, 100], 4, H - 4)[0] * 0 + norm([70], 4, H - 4)[0]
  const y30 = norm([0, 100], 4, H - 4)[0] * 0 + norm([30], 4, H - 4)[0]

  const lo = 4, hi = H - 4
  const toY = v => (hi - ((v - 0) / 100) * (hi - lo)).toFixed(1)
  const p = rsi.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x="0" y={toY(100)} width={W} height={parseFloat(toY(70)) - parseFloat(toY(100))} fill="rgba(239,68,68,0.08)" />
      <rect x="0" y={toY(30)}  width={W} height={parseFloat(toY(0))  - parseFloat(toY(30))}  fill="rgba(34,197,94,0.08)" />
      <line x1="0" y1={toY(70)} x2={W} y2={toY(70)} stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2" />
      <line x1="0" y1={toY(30)} x2={W} y2={toY(30)} stroke="#16a34a" strokeWidth="0.8" strokeDasharray="3,2" />
      <path d={p} fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// --- MACD ---
function MacdPreview() {
  const N = 22
  const macdLine   = Array.from({ length: N }, (_, i) => 4 * Math.sin(i * 0.45 - 1))
  const signalLine = macdLine.map((_, i, a) => {
    const s = a.slice(Math.max(0, i - 4), i + 1)
    return s.reduce((x, y) => x + y) / s.length
  })
  const hist = macdLine.map((v, i) => v - signalLine[i])

  const allVals = [...macdLine, ...signalLine, ...hist]
  const mn = Math.min(...allVals), mx = Math.max(...allVals)
  const toY = v => (H - 4 - ((v - mn) / (mx - mn)) * (H - 8)).toFixed(1)
  const zero = toY(0)
  const barW = W / N - 1

  const mp = macdLine.map((v, i) =>   `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')
  const sp = signalLine.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1="0" y1={zero} x2={W} y2={zero} stroke="#d1d5db" strokeWidth="0.8" />
      {hist.map((v, i) => {
        const x = (i / (N - 1)) * W - barW / 2
        const y = v >= 0 ? toY(v) : zero
        const h = Math.abs(parseFloat(toY(v)) - parseFloat(zero))
        return <rect key={i} x={x} y={y} width={barW} height={h || 0.5}
          fill={v >= 0 ? 'rgba(220,38,38,0.5)' : 'rgba(59,130,246,0.5)'} />
      })}
      <path d={mp} fill="none" stroke="#1a1a2e" strokeWidth="1.5" />
      <path d={sp} fill="none" stroke="#f97316" strokeWidth="1.2" strokeDasharray="3,2" />
    </svg>
  )
}

// --- Bollinger ---
function BollingerPreview() {
  const N = 22
  const price = Array.from({ length: N }, (_, i) => 20 + 5 * Math.sin(i * 0.5) + i * 0.2)
  const mid   = price.map((_, i, a) => {
    const s = a.slice(Math.max(0, i - 5), i + 1)
    return s.reduce((x, y) => x + y) / s.length
  })
  const upper = mid.map(v => v + 5)
  const lower = mid.map(v => v - 5)

  const all = [...upper, ...lower]
  const mn = Math.min(...all) - 1
  const mx = Math.max(...all) + 1
  const toY = v => (H - 4 - ((v - mn) / (mx - mn)) * (H - 8)).toFixed(1)
  const p = arr => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')

  const areaPath = [
    ...upper.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`),
    ...lower.slice().reverse().map((v, i, a) => `L${xAt(a.length - 1 - i, N)},${toY(v)}`),
    'Z'
  ].join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={areaPath} fill="rgba(59,130,246,0.07)" />
      <path d={p(upper)} fill="none" stroke="#93c5fd" strokeWidth="1" />
      <path d={p(lower)} fill="none" stroke="#93c5fd" strokeWidth="1" />
      <path d={p(mid)}   fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,2" />
      <path d={p(price)} fill="none" stroke="#1a1a2e" strokeWidth="1.8" />
    </svg>
  )
}

// --- Momentum ---
function MomentumPreview() {
  const N = 22
  const mom = Array.from({ length: N }, (_, i) => 6 * Math.sin(i * 0.5 - 1.2))
  const all = [...mom]
  const mn = Math.min(...all), mx = Math.max(...all)
  const toY = v => (H - 4 - ((v - mn) / (mx - mn)) * (H - 8)).toFixed(1)
  const zero = toY(0)
  const p = mom.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')

  const fillAbove = [
    ...mom.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(Math.max(v, 0))}`),
    `L${W},${zero}`, `L0,${zero}`, 'Z'
  ].join(' ')
  const fillBelow = [
    ...mom.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(Math.min(v, 0))}`),
    `L${W},${zero}`, `L0,${zero}`, 'Z'
  ].join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={fillAbove} fill="rgba(220,38,38,0.1)" />
      <path d={fillBelow} fill="rgba(59,130,246,0.1)" />
      <line x1="0" y1={zero} x2={W} y2={zero} stroke="#d1d5db" strokeWidth="1" />
      <path d={p} fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// --- Stochastic ---
function StochasticPreview() {
  const N = 22
  const k = Array.from({ length: N }, (_, i) => 50 + 32 * Math.sin(i * 0.44 - 0.3))
  const d = k.map((_, i, a) => {
    const s = a.slice(Math.max(0, i - 2), i + 1)
    return s.reduce((x, y) => x + y) / s.length
  })
  const toY = v => (H - 4 - ((v - 0) / 100) * (H - 8)).toFixed(1)
  const pk = k.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')
  const pd = d.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x="0" y={toY(100)} width={W} height={parseFloat(toY(80)) - parseFloat(toY(100))} fill="rgba(239,68,68,0.08)" />
      <rect x="0" y={toY(20)}  width={W} height={parseFloat(toY(0))  - parseFloat(toY(20))}  fill="rgba(34,197,94,0.08)" />
      <line x1="0" y1={toY(80)} x2={W} y2={toY(80)} stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2" />
      <line x1="0" y1={toY(20)} x2={W} y2={toY(20)} stroke="#16a34a" strokeWidth="0.8" strokeDasharray="3,2" />
      <path d={pk} fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
      <path d={pd} fill="none" stroke="#f97316" strokeWidth="1.2" strokeDasharray="3,2" />
    </svg>
  )
}

// --- VWAP ---
function VwapPreview() {
  const N = 22
  const price = Array.from({ length: N }, (_, i) => 20 + 7 * Math.sin(i * 0.38) + i * 0.35)
  const vwap  = price.map((_, i, a) => {
    const s = a.slice(0, i + 1)
    return s.reduce((x, y) => x + y) / s.length
  })
  const all = [...price, ...vwap]
  const mn = Math.min(...all), mx = Math.max(...all)
  const toY = v => (H - 4 - ((v - mn) / (mx - mn)) * (H - 8)).toFixed(1)
  const pp = price.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')
  const pv = vwap.map((v, i)  => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')

  const abovePath = [
    ...price.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(Math.min(v, vwap[i]))}`),
    ...vwap.slice().reverse().map((v, i, a) => `L${xAt(a.length - 1 - i, N)},${toY(v)}`), 'Z'
  ].join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={abovePath} fill="rgba(99,102,241,0.08)" />
      <path d={pp} fill="none" stroke="#1a1a2e" strokeWidth="1.6" />
      <path d={pv} fill="none" stroke="#6366f1" strokeWidth="1.4" strokeDasharray="4,2" />
    </svg>
  )
}

// --- Ichimoku ---
function IchimokuPreview() {
  const N = 22
  const price  = Array.from({ length: N }, (_, i) => 20 + 6 * Math.sin(i * 0.4 + 0.5) + i * 0.3)
  const spanA  = price.map((_, i, a) => {
    const s = a.slice(Math.max(0, i - 4), i + 1)
    return s.reduce((x, y) => x + y) / s.length + 2
  })
  const spanB  = price.map((_, i, a) => {
    const s = a.slice(Math.max(0, i - 8), i + 1)
    return s.reduce((x, y) => x + y) / s.length - 2
  })
  const all = [...price, ...spanA, ...spanB]
  const mn = Math.min(...all), mx = Math.max(...all)
  const toY = v => (H - 4 - ((v - mn) / (mx - mn)) * (H - 8)).toFixed(1)

  const cloudPath = [
    ...spanA.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`),
    ...spanB.slice().reverse().map((v, i, a) => `L${xAt(a.length - 1 - i, N)},${toY(v)}`), 'Z'
  ].join(' ')

  const pp = price.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')
  const pa = spanA.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')
  const pb = spanB.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, N)},${toY(v)}`).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={cloudPath} fill="rgba(34,197,94,0.15)" />
      <path d={pa} fill="none" stroke="#16a34a" strokeWidth="1" />
      <path d={pb} fill="none" stroke="#ef4444" strokeWidth="1" />
      <path d={pp} fill="none" stroke="#1a1a2e" strokeWidth="1.8" />
    </svg>
  )
}

const PREVIEWS = {
  ma:          MaPreview,
  rsi:         RsiPreview,
  macd:        MacdPreview,
  bollinger:   BollingerPreview,
  momentum:    MomentumPreview,
  stochastic:  StochasticPreview,
  vwap:        VwapPreview,
  ichimoku:    IchimokuPreview,
}

export default function IndicatorPreview({ id }) {
  const Chart = PREVIEWS[id]
  return Chart ? <Chart /> : null
}
