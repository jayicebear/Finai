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

    data.push({ date: dateLabel, open, high, low, close, price: close, volume })
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
