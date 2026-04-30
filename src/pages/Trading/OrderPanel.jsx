import { useState } from 'react'
import styles from './OrderPanel.module.css'

const PCT_STEPS = [
  { label: '25%', pct: 0.25 },
  { label: '50%', pct: 0.50 },
  { label: '75%', pct: 0.75 },
  { label: 'MAX', pct: 1.00 },
]

function OrderPanel({ stock, orderPrice, balance, holding, onOrder }) {
  const [mode, setMode] = useState('buy')
  const [qty, setQty]   = useState(1)

  const price      = orderPrice ?? stock.price
  const heldQty    = holding?.qty      || 0
  const avgPrice   = holding?.avgPrice || 0
  const unrealized = heldQty > 0 ? (stock.price - avgPrice) * heldQty : null
  const maxBuy     = Math.floor(balance / price)
  const maxSell    = heldQty
  const maxQty     = mode === 'buy' ? maxBuy : maxSell
  const safeQty    = Math.min(qty, Math.max(1, maxQty))
  const total      = (price * safeQty).toFixed(2)
  const isBuy      = mode === 'buy'

  function applyQty(q) { setQty(Math.max(1, Math.min(q, maxQty || 1))) }
  function setPct(pct)  { applyQty(Math.max(1, Math.floor(maxQty * pct))) }

  function handleOrder() {
    if (isBuy  && safeQty > maxBuy)  return
    if (!isBuy && safeQty > maxSell) return
    onOrder(mode, safeQty)
    setQty(1)
  }

  const canOrder = isBuy ? safeQty >= 1 && balance >= price : safeQty >= 1 && heldQty >= 1

  return (
    <aside className={styles.panel}>

      {/* 탭 */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${isBuy ? styles.tabBuyActive : ''}`}
          onClick={() => { setMode('buy'); setQty(1) }}
        >매수</button>
        <button
          className={`${styles.tab} ${!isBuy ? styles.tabSellActive : ''}`}
          onClick={() => { setMode('sell'); setQty(1) }}
        >매도</button>
      </div>

      {/* 종목 + 가격 */}
      <div className={styles.stockRow}>
        <div>
          <div className={styles.stockId}>{stock.id}</div>
          <div className={styles.stockName}>{stock.name}</div>
        </div>
        <div className={styles.stockPrice}>${price.toFixed(2)}</div>
      </div>

      {/* 가용 정보 */}
      <div className={styles.infoBox}>
        {isBuy ? (
          <>
            <div className={styles.infoRow}>
              <span className={styles.infoLbl}>가용 잔액</span>
              <span className={styles.infoVal}>${balance.toLocaleString()}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLbl}>최대 구매</span>
              <span className={styles.infoVal}>{maxBuy.toLocaleString()}주</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.infoRow}>
              <span className={styles.infoLbl}>보유 수량</span>
              <span className={styles.infoVal}>{heldQty}주</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLbl}>평균단가</span>
              <span className={styles.infoVal}>${avgPrice || '-'}</span>
            </div>
            {unrealized != null && (
              <div className={styles.infoRow}>
                <span className={styles.infoLbl}>평가손익</span>
                <span className={`${styles.infoVal} ${unrealized >= 0 ? styles.up : styles.down}`}>
                  {unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* % 빠른 선택 */}
      <div className={styles.pctRow}>
        {PCT_STEPS.map(({ label, pct }) => (
          <button
            key={label}
            className={`${styles.pctBtn} ${isBuy ? styles.pctBtnBuy : styles.pctBtnSell}`}
            onClick={() => setPct(pct)}
            disabled={maxQty < 1}
          >{label}</button>
        ))}
      </div>

      {/* 수량 */}
      <div className={styles.qtyRow}>
        <button className={styles.qtyBtn} onClick={() => applyQty(safeQty - 1)}>−</button>
        <input
          type="number"
          className={styles.qtyInput}
          value={safeQty}
          min={1}
          max={maxQty}
          onChange={e => applyQty(parseInt(e.target.value) || 1)}
        />
        <button className={styles.qtyBtn} onClick={() => applyQty(safeQty + 1)}>+</button>
      </div>

      {/* 주문금액 */}
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>주문금액</span>
        <span className={styles.totalValue}>${Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>

      {/* CTA */}
      <button
        className={`${styles.orderBtn} ${isBuy ? styles.orderBtnBuy : styles.orderBtnSell}`}
        onClick={handleOrder}
        disabled={!canOrder}
      >
        {isBuy ? '매수하기' : '매도하기'}
      </button>

    </aside>
  )
}

export default OrderPanel
