import { useMemo } from 'react'
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

function generateBase(n = 60, start = 100, volatility = 1.5) {
  const data = []
  let price = start
  for (let i = 0; i < n; i++) {
    price = Math.max(start * 0.6, price + (Math.random() - 0.47) * volatility)
    data.push({ i, price: parseFloat(price.toFixed(2)) })
  }
  return data
}

function ma(arr, n) {
  return arr.map((d, i) => {
    if (i < n - 1) return { ...d, [`ma${n}`]: null }
    const avg = arr.slice(i - n + 1, i + 1).reduce((s, x) => s + x.price, 0) / n
    return { ...d, [`ma${n}`]: parseFloat(avg.toFixed(2)) }
  })
}

function MAChart() {
  const data = useMemo(() => {
    const base = generateBase(80, 100, 2)
    return ma(ma(base, 5), 20)
  }, [])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="i" hide />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} width={40} tickFormatter={v => `$${v.toFixed(0)}`} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }}
          formatter={(v, name) => [`${v}`, name === 'price' ? '가격' : name]}
        />
        <Line dataKey="price" stroke="#94a3b8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        <Line dataKey="ma5"   stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls name="MA5" />
        <Line dataKey="ma20"  stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls name="MA20" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function RSIChart() {
  const data = useMemo(() => {
    const base = generateBase(80, 100, 2)
    return base.map((d, i, arr) => {
      if (i < 14) return { ...d, rsi: null }
      const gains = [], losses = []
      for (let j = i - 13; j <= i; j++) {
        const diff = arr[j].price - arr[j - 1].price
        if (diff > 0) gains.push(diff); else losses.push(Math.abs(diff))
      }
      const avgG = gains.reduce((s, x) => s + x, 0) / 14
      const avgL = losses.reduce((s, x) => s + x, 0) / 14
      const rs = avgL === 0 ? 100 : avgG / avgL
      return { ...d, rsi: parseFloat((100 - 100 / (1 + rs)).toFixed(1)) }
    })
  }, [])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="i" hide />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }} />
        <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: '70', fontSize: 10, fill: '#dc2626', position: 'right' }} />
        <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: '30', fontSize: 10, fill: '#16a34a', position: 'right' }} />
        <Area dataKey="rsi" stroke="#7c3aed" fill="#ede9fe" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function MACDChart() {
  const data = useMemo(() => {
    const base = generateBase(80, 100, 2)

    function ema(arr, n) {
      const k = 2 / (n + 1)
      let val = arr[0]
      return arr.map((v, i) => {
        if (i === 0) return val
        val = v * k + val * (1 - k)
        return parseFloat(val.toFixed(3))
      })
    }

    const prices = base.map(d => d.price)
    const ema12 = ema(prices, 12)
    const ema26 = ema(prices, 26)
    const macdLine = ema12.map((v, i) => parseFloat((v - ema26[i]).toFixed(3)))
    const signalLine = ema(macdLine, 9)

    return base.map((d, i) => ({
      ...d,
      macd: i >= 26 ? macdLine[i] : null,
      signal: i >= 34 ? signalLine[i] : null,
      hist: i >= 34 ? parseFloat((macdLine[i] - signalLine[i]).toFixed(3)) : null,
    }))
  }, [])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="i" hide />
        <YAxis tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#ddd" />
        <Bar dataKey="hist" isAnimationActive={false} maxBarSize={6}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.hist >= 0 ? '#16a34a' : '#dc2626'} fillOpacity={0.7} />
          ))}
        </Bar>
        <Line dataKey="macd"   stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls name="MACD" />
        <Line dataKey="signal" stroke="#f97316" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls name="Signal" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function BollingerChart() {
  const data = useMemo(() => {
    const base = generateBase(80, 100, 2)
    return base.map((d, i, arr) => {
      if (i < 19) return { ...d, upper: null, mid: null, lower: null }
      const slice = arr.slice(i - 19, i + 1).map(x => x.price)
      const mean = slice.reduce((s, v) => s + v, 0) / 20
      const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / 20)
      return {
        ...d,
        upper: parseFloat((mean + 2 * std).toFixed(2)),
        mid:   parseFloat(mean.toFixed(2)),
        lower: parseFloat((mean - 2 * std).toFixed(2)),
      }
    })
  }, [])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="i" hide />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} width={40} tickFormatter={v => `$${v.toFixed(0)}`} />
        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }} />
        <Line dataKey="upper"  stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} connectNulls name="상단" />
        <Line dataKey="mid"    stroke="#94a3b8" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls name="중간" />
        <Line dataKey="lower"  stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} connectNulls name="하단" />
        <Line dataKey="price"  stroke="#1a1a2e" strokeWidth={2} dot={false} isAnimationActive={false} name="가격" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function MomentumChart() {
  const data = useMemo(() => {
    const base = generateBase(80, 100, 2)
    const n = 10
    return base.map((d, i, arr) => ({
      ...d,
      momentum: i >= n ? parseFloat((d.price - arr[i - n].price).toFixed(2)) : null,
    }))
  }, [])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="i" hide />
        <YAxis tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#ddd" strokeWidth={1.5} />
        <Bar dataKey="momentum" isAnimationActive={false} maxBarSize={8}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.momentum >= 0 ? '#16a34a' : '#dc2626'} fillOpacity={0.75} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function MeanReversionChart() {
  const data = useMemo(() => {
    const base = generateBase(80, 100, 2)
    return base.map((d, i, arr) => {
      if (i < 19) return { ...d, zscore: null, upper: null, lower: null }
      const slice = arr.slice(i - 19, i + 1).map(x => x.price)
      const mean = slice.reduce((s, v) => s + v, 0) / 20
      const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / 20)
      return {
        ...d,
        zscore: std === 0 ? 0 : parseFloat(((d.price - mean) / std).toFixed(2)),
        upper: 2,
        lower: -2,
      }
    })
  }, [])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="i" hide />
        <YAxis domain={[-4, 4]} tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, fontSize: 11 }} />
        <ReferenceLine y={0}  stroke="#ddd" />
        <ReferenceLine y={2}  stroke="#dc2626" strokeDasharray="4 2" label={{ value: '+2σ', fontSize: 10, fill: '#dc2626', position: 'right' }} />
        <ReferenceLine y={-2} stroke="#16a34a" strokeDasharray="4 2" label={{ value: '-2σ', fontSize: 10, fill: '#16a34a', position: 'right' }} />
        <Area dataKey="zscore" stroke="#0891b2" fill="#e0f2fe" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls name="Z-Score" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

const CHART_MAP = {
  ma:           MAChart,
  rsi:          RSIChart,
  macd:         MACDChart,
  bollinger:    BollingerChart,
  momentum:     MomentumChart,
  meanreversion: MeanReversionChart,
}

export default function AlgoChart({ type }) {
  const Chart = CHART_MAP[type]
  if (!Chart) return null
  return <Chart />
}
