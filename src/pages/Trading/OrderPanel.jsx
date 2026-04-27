import { useState } from 'react'
import styles from './OrderPanel.module.css'

function OrderPanel({ stock, orderPrice, balance, holding, onOrder }) {
  const [qty, setQty] = useState(1)

  const price = orderPrice ?? stock.price
  const total = (price * qty).toFixed(2)
  const heldQty   = holding?.qty || 0
  const avgPrice  = holding?.avgPrice || 0
  const unrealized = heldQty > 0 ? ((stock.price - avgPrice) * heldQty).toFixed(2) : null

  return (
    <aside className={styles.panel}>

      <div className={styles.topRow}>
        <div className={styles.stockInfo}>
          <span className={styles.stockId}>{stock.id}</span>
          <span className={styles.stockPrice}>${price.toFixed(2)}</span>
        </div>
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>잔액</span>
          <span className={styles.balanceValue}>${balance.toLocaleString()}</span>
        </div>
      </div>

      <div className={styles.qtyRow}>
        <button className={styles.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
        <input
          type="number"
          className={styles.qtyInput}
          value={qty}
          min={1}
          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
        />
        <button className={styles.qtyBtn} onClick={() => setQty(q => q + 1)}>+</button>
      </div>

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>주문금액</span>
        <span className={styles.totalValue}>${total}</span>
      </div>

      <div className={styles.btnRow}>
        <button className={styles.buyBtn} onClick={() => onOrder('buy', qty)}>매수</button>
        <button className={styles.sellBtn} onClick={() => onOrder('sell', qty)}>매도</button>
      </div>

      {heldQty > 0 && (
        <div className={styles.holding}>
          <div className={styles.holdingRow}><span>수량</span><span>{heldQty}주</span></div>
          <div className={styles.holdingRow}><span>평균단가</span><span>${avgPrice}</span></div>
          <div className={styles.holdingRow}>
            <span>평가손익</span>
            <span className={parseFloat(unrealized) >= 0 ? styles.up : styles.down}>
              {parseFloat(unrealized) >= 0 ? '+' : ''}${unrealized}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}

export default OrderPanel
