import { createContext, useContext, useState } from 'react'

const PortfolioContext = createContext(null)

export function PortfolioProvider({ children }) {
  const [balance, setBalance] = useState(100000)
  const [portfolio, setPortfolio] = useState({})
  const [tradeHistory, setTradeHistory] = useState([])

  function logTrade(type, stock, qty, source = 'manual', modelName = null) {
    setTradeHistory(prev => [{
      id: Date.now() + Math.random(),
      type,
      stockId: stock.id,
      stockName: stock.name,
      qty,
      price: stock.price,
      total: parseFloat((stock.price * qty).toFixed(2)),
      source,
      modelName,
      time: new Date(),
    }, ...prev])
  }

  function buy(stock, qty, source = 'manual', modelName = null) {
    const total = stock.price * qty
    if (total > balance) return false
    setBalance(prev => parseFloat((prev - total).toFixed(2)))
    setPortfolio(prev => {
      const existing = prev[stock.id]
      if (existing) {
        const newQty = existing.qty + qty
        const newAvg = ((existing.avgPrice * existing.qty) + total) / newQty
        return { ...prev, [stock.id]: { qty: newQty, avgPrice: parseFloat(newAvg.toFixed(2)), name: stock.name } }
      }
      return { ...prev, [stock.id]: { qty, avgPrice: stock.price, name: stock.name } }
    })
    logTrade('BUY', stock, qty, source, modelName)
    return true
  }

  function sell(stock, qty, source = 'manual', modelName = null) {
    const held = portfolio[stock.id]?.qty || 0
    if (qty > held) return false
    const total = stock.price * qty
    setBalance(prev => parseFloat((prev + total).toFixed(2)))
    setPortfolio(prev => {
      const newQty = prev[stock.id].qty - qty
      if (newQty === 0) {
        const next = { ...prev }
        delete next[stock.id]
        return next
      }
      return { ...prev, [stock.id]: { ...prev[stock.id], qty: newQty } }
    })
    logTrade('SELL', stock, qty, source, modelName)
    return true
  }

  return (
    <PortfolioContext.Provider value={{ balance, portfolio, tradeHistory, buy, sell }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  return useContext(PortfolioContext)
}
