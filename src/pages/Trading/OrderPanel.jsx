import { useState } from 'react'
import styles from './OrderPanel.module.css'

function OrderPanel({ stock, balance, holding, onOrder }) {
  const [tab, setTab] = useState('buy')
  const [qty, setQty] = useState(1)

  const total = (stock.price * qty).toFixed(2)
  const heldQty = holding?.qty || 0
  const avgPrice = holding?.avgPrice || 0
  const unrealized = heldQty > 0 ? ((stock.price - avgPrice) * heldQty).toFixed(2) : null

  function handleSubmit() {
    if (qty < 1) return
    onOrder(tab, qty)
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.balance}>
        <span className={styles.balanceLabel}>Available</span>
        <span className={styles.balanceValue}>${balance.toLocaleString()}</span>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'buy' ? styles.buyActive : ''}`}
          onClick={() => setTab('buy')}
        >
          Buy
        </button>
        <button
          className={`${styles.tab} ${tab === 'sell' ? styles.sellActive : ''}`}
          onClick={() => setTab('sell')}
        >
          Sell
        </button>
      </div>

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>종목</label>
          <div className={styles.stockName}>{stock.id} — ${stock.price.toFixed(2)}</div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>수량</label>
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
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>주문 금액</span>
            <span>${total}</span>
          </div>
          {tab === 'buy' && (
            <div className={styles.summaryRow}>
              <span>잔액 (주문 후)</span>
              <span>${(balance - parseFloat(total)).toFixed(2)}</span>
            </div>
          )}
        </div>

        <button
          className={`${styles.submit} ${tab === 'buy' ? styles.submitBuy : styles.submitSell}`}
          onClick={handleSubmit}
        >
          {tab === 'buy' ? `${stock.id} 매수` : `${stock.id} 매도`}
        </button>
      </div>

      {heldQty > 0 && (
        <div className={styles.holding}>
          <h4 className={styles.holdingTitle}>보유 현황</h4>
          <div className={styles.holdingRow}>
            <span>수량</span><span>{heldQty}주</span>
          </div>
          <div className={styles.holdingRow}>
            <span>평균단가</span><span>${avgPrice}</span>
          </div>
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
