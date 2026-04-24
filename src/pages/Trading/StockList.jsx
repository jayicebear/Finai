import styles from './StockList.module.css'

function StockList({ stocks, selected, onSelect }) {
  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>Watchlist</h3>
      <ul className={styles.list}>
        {stocks.map(stock => (
          <li
            key={stock.id}
            className={`${styles.item} ${selected.id === stock.id ? styles.active : ''}`}
            onClick={() => onSelect(stock)}
          >
            <div className={styles.left}>
              <span className={styles.ticker}>{stock.id}</span>
              <span className={styles.name}>{stock.name}</span>
            </div>
            <div className={styles.right}>
              <span className={styles.price}>${stock.price.toFixed(2)}</span>
              <span className={`${styles.change} ${stock.change >= 0 ? styles.up : styles.down}`}>
                {stock.change >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default StockList
