export const stocks = [
  { id: 'AAPL', name: 'Apple Inc.', price: 189.45, change: +1.23, changePct: +0.65 },
  { id: 'TSLA', name: 'Tesla Inc.', price: 248.32, change: -3.11, changePct: -1.24 },
  { id: 'NVDA', name: 'NVIDIA Corp.', price: 875.20, change: +12.40, changePct: +1.44 },
  { id: 'MSFT', name: 'Microsoft', price: 415.60, change: +2.05, changePct: +0.50 },
  { id: 'AMZN', name: 'Amazon', price: 182.30, change: -0.75, changePct: -0.41 },
  { id: 'GOOGL', name: 'Alphabet', price: 172.88, change: +1.10, changePct: +0.64 },
  { id: 'META', name: 'Meta Platforms', price: 512.44, change: +5.32, changePct: +1.05 },
  { id: 'NFLX', name: 'Netflix', price: 628.90, change: -8.20, changePct: -1.29 },
]

const MA_NS = [5, 20, 60, 120]

function addMAs(data) {
  return data.map((d, i, arr) => {
    const row = { ...d }
    for (const n of MA_NS) {
      if (i >= n - 1) {
        let sum = 0
        for (let j = i - n + 1; j <= i; j++) sum += arr[j].close
        row[`ma${n}`] = parseFloat((sum / n).toFixed(2))
      }
    }
    return row
  })
}

// 모듈 로드 시점에 모든 종목 × 모든 기간 데이터를 미리 계산
const chartCache = Object.fromEntries(stocks.map(s => {
  const daily = generateChartData(s.price)
  return [s.id, {
    d: addMAs(daily),
    w: addMAs(aggregateWeekly(daily)),
    m: addMAs(aggregateMonthly(daily)),
    y: addMAs(aggregateYearly(daily)),
  }]
}))

export function getCachedChartData(stock, period = 'd') {
  return chartCache[stock.id][period]
}

export function generateChartData(basePrice, years = 5) {
  const data = []
  let price = basePrice * 0.45
  const now = new Date()
  const totalDays = years * 365

  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    if (date.getDay() === 0 || date.getDay() === 6) continue

    const open  = parseFloat(price.toFixed(2))
    const move  = (Math.random() - 0.47) * (basePrice * 0.016)
    price       = Math.max(basePrice * 0.2, price + move)
    const close = parseFloat(price.toFixed(2))
    const vol   = basePrice * 0.007
    const high  = parseFloat((Math.max(open, close) + Math.random() * vol).toFixed(2))
    const low   = parseFloat((Math.min(open, close) - Math.random() * vol).toFixed(2))
    const volume = Math.round((Math.random() * 8000000 + 500000) * (1 + Math.abs(move) / basePrice * 10))

    const yr = date.getFullYear().toString().slice(2)
    const dateLabel = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} '${yr}`
    const time = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`

    data.push({ date: dateLabel, time, open, high, low, close, price: close, volume })
  }
  return data
}

function aggregate(data, size) {
  const result = []
  for (let i = 0; i < data.length; i += size) {
    const slice = data.slice(i, i + size)
    if (!slice.length) continue
    result.push({
      date:   slice[0].date,
      time:   slice[0].time,
      open:   slice[0].open,
      high:   Math.max(...slice.map(d => d.high)),
      low:    Math.min(...slice.map(d => d.low)),
      close:  slice[slice.length - 1].close,
      price:  slice[slice.length - 1].close,
      volume: slice.reduce((s, d) => s + d.volume, 0),
    })
  }
  return result
}

export function aggregateWeekly(data)    { return aggregate(data, 5) }
export function aggregateMonthly(data)   { return aggregate(data, 21) }
export function aggregateYearly(data)    { return aggregate(data, 252) }

const TIMEFRAME_MS = {
  '1min':  60 * 1000,
  '5min':  5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '1day':  24 * 60 * 60 * 1000,
}

export function generateMockApiResponse(symbol, timeframe = '1min', bars = 100) {
  const stock = stocks.find(s => s.id === symbol)
  const basePrice = stock?.price ?? 100
  const intervalMs = TIMEFRAME_MS[timeframe] ?? TIMEFRAME_MS['1min']

  const now = Date.now()
  const timeStart = now - intervalMs * bars
  const timeEnd   = now

  const t = [], o = [], h = [], l = [], c = [], v = [], vw = [], n = [], source = [], sourceDataset = []

  let price = basePrice * 0.95

  for (let i = 0; i < bars; i++) {
    const timestamp = timeStart + intervalMs * i

    // 가끔 null 포함 (실제 API처럼)
    const hasData = Math.random() > 0.03

    t.push(timestamp)

    if (!hasData) {
      o.push(null); h.push(null); l.push(null); c.push(null)
      v.push(null); vw.push(null); n.push(null)
      source.push(null); sourceDataset.push(null)
      continue
    }

    const open  = parseFloat(price.toFixed(2))
    const move  = (Math.random() - 0.47) * (basePrice * 0.004)
    price       = Math.max(basePrice * 0.5, price + move)
    const close = parseFloat(price.toFixed(2))
    const vol   = basePrice * 0.002
    const high  = parseFloat((Math.max(open, close) + Math.random() * vol).toFixed(2))
    const low   = parseFloat((Math.min(open, close) - Math.random() * vol).toFixed(2))
    const volume = Math.round(Math.random() * 20000 + 3000)
    const vwap  = parseFloat(((open + high + low + close) / 4).toFixed(2))
    const trades = Math.round(volume / 80)

    o.push(open); h.push(high); l.push(low); c.push(close)
    v.push(volume); vw.push(vwap); n.push(trades)
    source.push('alpaca'); sourceDataset.push(null)
  }

  return {
    ticker:       symbol,
    assetClass:   'stock',
    market:       'US',
    currency:     'USD',
    timeStart,
    timeEnd,
    timeframe,
    adjustment:   null,
    queryCount:   1,
    resultsCount: bars,
    barCount:     t.filter((_, i) => o[i] !== null).length,
    truncated:    false,
    status:       'OK',
    request_id:   `md_mock_${symbol.toLowerCase()}`,
    sources:      ['alpaca'],
    sourceErrors: {},
    results:      { t, o, h, l, c, v, vw, n, source, sourceDataset },
  }
}
