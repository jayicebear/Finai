import { getCachedChartData, aggregateWeekly, aggregateMonthly, aggregateYearly } from './stocks'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY
const cache = {}
const pending = {}

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

function parse(json) {
  const series = json['Time Series (Daily)']
  if (!series) return null
  return Object.entries(series)
    .map(([date, v]) => ({
      time:   date,
      open:   parseFloat(v['1. open']),
      high:   parseFloat(v['2. high']),
      low:    parseFloat(v['3. low']),
      close:  parseFloat(v['4. close']),
      volume: parseInt(v['5. volume']),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
}

export async function fetchChartData(stock, period = 'd') {
  const stockId = typeof stock === 'string' ? stock : stock.id
  if (USE_MOCK) return getCachedChartData({ id: stockId }, period)

  if (cache[stockId]?.[period]) return cache[stockId][period]

  if (!pending[stockId]) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stockId}&outputsize=compact&apikey=${API_KEY}`
    pending[stockId] = fetch(url)
      .then(res => res.json())
      .then(json => {
        const daily = parse(json)
        if (!daily) throw new Error(json['Note'] ?? json['Information'] ?? 'API 오류')
        cache[stockId] = {
          d: addMAs(daily),
          w: addMAs(aggregateWeekly(daily)),
          m: addMAs(aggregateMonthly(daily)),
          y: addMAs(aggregateYearly(daily)),
        }
      })
      .finally(() => { delete pending[stockId] })
  }

  await pending[stockId]
  return cache[stockId][period]
}
