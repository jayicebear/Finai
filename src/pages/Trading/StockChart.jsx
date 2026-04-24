import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './StockChart.module.css'

function StockChart({ stock, data }) {
  const isUp = stock.change >= 0
  const color = isUp ? '#16a34a' : '#dc2626'

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.ticker}>{stock.id}</h2>
          <p className={styles.name}>{stock.name}</p>
        </div>
        <div className={styles.priceBlock}>
          <span className={styles.price}>${stock.price.toFixed(2)}</span>
          <span className={`${styles.change} ${isUp ? styles.up : styles.down}`}>
            {isUp ? '+' : ''}{stock.change.toFixed(2)} ({isUp ? '+' : ''}{stock.changePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#999', fontFamily: 'system-ui' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#999', fontFamily: 'system-ui' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            tickFormatter={v => `$${v}`}
            width={60}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, color: '#f0ede8', fontSize: 12 }}
            formatter={v => [`$${v}`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill="url(#colorPrice)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default StockChart
