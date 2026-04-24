import { useState } from 'react'
import { stocks, generateChartData } from '../../data/stocks'
import { usePortfolio } from '../../context/PortfolioContext'
import StockList from './StockList'
import StockChart from './StockChart'
import OrderPanel from './OrderPanel'
import styles from './Trading.module.css'

function Trading() {
  const [selected, setSelected] = useState(stocks[0])
  const { balance, portfolio, buy, sell } = usePortfolio()
  const chartData = generateChartData(selected.price)

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
      <StockList stocks={stocks} selected={selected} onSelect={setSelected} />
      <div className={styles.center}>
        <StockChart stock={selected} data={chartData} />
      </div>
      <OrderPanel
        stock={selected}
        balance={balance}
        holding={portfolio[selected.id]}
        onOrder={handleOrder}
      />
    </div>
  )
}

export default Trading
