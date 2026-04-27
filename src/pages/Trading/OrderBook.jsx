import { useState, useEffect } from 'react'
import styles from './OrderBook.module.css'

function generateBook(price) {
  const spread = Math.max(price * 0.0008, 0.01)
  const asks = []
  const bids = []

  for (let i = 8; i >= 1; i--) {
    asks.push({
      price: parseFloat((price + spread * i).toFixed(2)),
      size: parseFloat((Math.random() * 80 + 5).toFixed(2)),
    })
  }
  for (let i = 1; i <= 8; i++) {
    bids.push({
      price: parseFloat((price - spread * i).toFixed(2)),
      size: parseFloat((Math.random() * 80 + 5).toFixed(2)),
    })
  }

  const maxSize = Math.max(...asks.map(a => a.size), ...bids.map(b => b.size))
  return { asks, bids, maxSize }
}

export default function OrderBook({ stock, orderPrice, onPriceSelect }) {
  const [book, setBook] = useState(() => generateBook(stock.price))

  useEffect(() => {
    setBook(generateBook(stock.price))
    const id = setInterval(() => setBook(generateBook(stock.price)), 2000)
    return () => clearInterval(id)
  }, [stock.id, stock.price])

  const isUp = stock.change >= 0

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Order Book</span>
        <span className={styles.spread}>
          Spread {(book.asks[book.asks.length - 1]?.price - book.bids[0]?.price || 0).toFixed(2)}
        </span>
      </div>

      <div className={styles.colHeaders}>
        <span>Price</span>
        <span>Size</span>
      </div>

      {/* Asks — high to low */}
      <div className={styles.asks}>
        {book.asks.map((row, i) => (
          <div
            key={i}
            className={`${styles.row} ${orderPrice === row.price ? styles.selected : ''}`}
            onClick={() => onPriceSelect(row.price)}
          >
            <div
              className={styles.depthBar}
              style={{ width: `${(row.size / book.maxSize) * 100}%`, background: 'rgba(220,38,38,0.12)' }}
            />
            <span className={styles.askPrice}>${row.price.toFixed(2)}</span>
            <span className={styles.size}>{row.size}</span>
          </div>
        ))}
      </div>

      <div
        className={`${styles.midPrice} ${isUp ? styles.up : styles.down}`}
        onClick={() => onPriceSelect(stock.price)}
        style={{ cursor: 'pointer' }}
      >
        ${stock.price.toFixed(2)}
        <span className={styles.midChange}>{isUp ? '▲' : '▼'} {Math.abs(stock.changePct).toFixed(2)}%</span>
      </div>

      {/* Bids — high to low */}
      <div className={styles.bids}>
        {book.bids.map((row, i) => (
          <div
            key={i}
            className={`${styles.row} ${orderPrice === row.price ? styles.selected : ''}`}
            onClick={() => onPriceSelect(row.price)}
          >
            <div
              className={styles.depthBar}
              style={{ width: `${(row.size / book.maxSize) * 100}%`, background: 'rgba(22,163,74,0.12)' }}
            />
            <span className={styles.bidPrice}>${row.price.toFixed(2)}</span>
            <span className={styles.size}>{row.size}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
