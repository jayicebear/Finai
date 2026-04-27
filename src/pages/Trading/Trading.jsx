import { useState, useMemo } from 'react'
import { stocks, generateChartData } from '../../data/stocks'
import { usePortfolio } from '../../context/PortfolioContext'
import StockList from './StockList'
import StockChart from './StockChart'
import OrderBook from './OrderBook'
import OrderPanel from './OrderPanel'
import TradeChat from './TradeChat'
import styles from './Trading.module.css'

function Trading() {
  const [selected, setSelected] = useState(stocks[0])
  const [orderPrice, setOrderPrice] = useState(selected.price)
  const { balance, portfolio, tradeHistory, buy, sell } = usePortfolio()
  const chartData = useMemo(() => generateChartData(selected.price), [selected.id])

  function handleSelect(stock) {
    setSelected(stock)
    setOrderPrice(stock.price)
  }

  function handleOrder(type, qty) {
    if (type === 'buy') {
      const ok = buy(selected, qty)
      if (!ok) alert('잔액이 부족합니다.')
    } else {
      const ok = sell(selected, qty)
      if (!ok) alert('보유 수량이 부족합니다.')
    }
  }

  return (
    <div className={styles.page}>
      <StockList stocks={stocks} selected={selected} onSelect={handleSelect} />

      <div className={styles.center}>
        <StockChart stock={selected} data={chartData} />
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <span className={styles.historyTitle}>체결 내역</span>
            <span className={styles.historyCount}>{tradeHistory.length}건</span>
          </div>
          {tradeHistory.length === 0 ? (
            <p className={styles.historyEmpty}>주문 후 체결 내역이 여기 표시됩니다.</p>
          ) : (
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>구분</th>
                  <th>종목</th>
                  <th>수량</th>
                  <th>체결가</th>
                  <th>금액</th>
                  <th>출처</th>
                  <th>시간</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistory.map(t => (
                  <tr key={t.id}>
                    <td>
                      <span className={`${styles.typeBadge} ${t.type === 'BUY' ? styles.buy : styles.sell}`}>
                        {t.type === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className={styles.stockCell}>
                      <span className={styles.stockId}>{t.stockId}</span>
                      <span className={styles.stockName}>{t.stockName}</span>
                    </td>
                    <td>{t.qty}주</td>
                    <td>${t.price.toFixed(2)}</td>
                    <td className={styles.totalCell}>${t.total.toLocaleString()}</td>
                    <td className={styles.sourceCell}>{t.modelName ?? t.source}</td>
                    <td className={styles.timeCell}>
                      {t.time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={styles.orderCol}>
        <OrderBook stock={selected} orderPrice={orderPrice} onPriceSelect={setOrderPrice} />
        <OrderPanel
          stock={selected}
          orderPrice={orderPrice}
          balance={balance}
          holding={portfolio[selected.id]}
          onOrder={handleOrder}
        />
      </div>

      <TradeChat stock={selected} />
    </div>
  )
}

export default Trading
