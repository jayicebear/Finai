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

export function generateChartData(basePrice) {
  const data = []
  let price = basePrice * 0.92
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    price = price + (Math.random() - 0.47) * (basePrice * 0.02)
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: parseFloat(price.toFixed(2)),
    })
  }
  return data
}
