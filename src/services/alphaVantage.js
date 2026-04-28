const KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY

const cache = {}
const pending = {}

export async function fetchStockData(symbol) {
  if (cache[symbol]) return cache[symbol]
  if (pending[symbol]) return pending[symbol]

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${KEY}`

  const promise = fetch(url)
    .then(res => res.json())
    .then(json => {
      delete pending[symbol]

      if (json['Note'] || json['Information']) {
        throw new Error(json['Note'] ?? json['Information'])
      }

      const series = json['Time Series (Daily)']
      if (!series) throw new Error(`데이터 없음: ${JSON.stringify(json).slice(0, 120)}`)

      const data = Object.entries(series)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([dateStr, v]) => {
          const date  = new Date(dateStr)
          const yr    = date.getFullYear().toString().slice(2)
          const label = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} '${yr}`
          const open   = parseFloat(v['1. open'])
          const high   = parseFloat(v['2. high'])
          const low    = parseFloat(v['3. low'])
          const close  = parseFloat(v['4. close'])
          const volume = parseInt(v['5. volume'])
          return { date: label, open, high, low, close, price: close, volume }
        })

      const last      = data[data.length - 1]
      const prev      = data[data.length - 2]
      const change    = parseFloat((last.close - prev.close).toFixed(2))
      const changePct = parseFloat(((change / prev.close) * 100).toFixed(2))

      const result = { data, price: last.close, change, changePct }
      cache[symbol] = result
      return result
    })
    .catch(err => {
      delete pending[symbol]
      throw err
    })

  pending[symbol] = promise
  return promise
}
