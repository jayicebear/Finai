import { useState, useEffect, useRef } from 'react'
import { AI_MODELS, STRATEGIES, RISK_LEVELS, generateSignal } from '../../data/aiStrategies'
import { stocks, generateChartData } from '../../data/stocks'
import { usePortfolio } from '../../context/PortfolioContext'
import StrategyPanel from './StrategyPanel'
import AIChartPanel from './AIChartPanel'
import AIPerformance from './AIPerformance'
import styles from './AITrading.module.css'

function AITrading() {
  const { balance, buy, sell, portfolio } = usePortfolio()
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0])
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0])
  const [riskLevel, setRiskLevel] = useState(RISK_LEVELS[1])
  const [budget, setBudget] = useState(10000)
  const [autoMode, setAutoMode] = useState(true)
  const [customPrompt, setCustomPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [selectedStock, setSelectedStock] = useState(stocks[0])
  const [executions, setExecutions] = useState([])   // markers on chart
  const [tradeLog, setTradeLog]   = useState([])
  const [lastAction, setLastAction] = useState(null)  // flash banner
  const [aiStats, setAiStats] = useState({ totalTrades: 0, wins: 0, totalPnl: 0 })
  const intervalRef  = useRef(null)
  const thinkRef     = useRef(null)

  const autoModeRef  = useRef(autoMode)
  const budgetRef    = useRef(budget)
  const riskRef      = useRef(riskLevel)
  const modelRef     = useRef(selectedModel)
  const strategyRef     = useRef(selectedStrategy)
  const stockRef        = useRef(selectedStock)
  const customPromptRef = useRef(customPrompt)

  useEffect(() => { autoModeRef.current  = autoMode },       [autoMode])
  useEffect(() => { budgetRef.current    = budget },         [budget])
  useEffect(() => { riskRef.current      = riskLevel },      [riskLevel])
  useEffect(() => { modelRef.current     = selectedModel },  [selectedModel])
  useEffect(() => { strategyRef.current     = selectedStrategy },  [selectedStrategy])
  useEffect(() => { stockRef.current        = selectedStock },     [selectedStock])
  useEffect(() => { customPromptRef.current = customPrompt },      [customPrompt])

  function startAI() {
    setRunning(true)
    tick()
    intervalRef.current = setInterval(tick, selectedModel.interval)
  }

  function tick() {
    const model    = modelRef.current
    const strategy = strategyRef.current
    const stock    = stockRef.current

    // "thinking" 애니메이션
    setThinking(true)
    thinkRef.current = setTimeout(() => {
      setThinking(false)

      const signal = generateSignal(model, strategy.id, [stock], customPromptRef.current)
      if (signal.type === 'HOLD') return

      if (!autoModeRef.current) {
        // 신호만 표시
        setLastAction({ ...signal, executed: false })
        return
      }

      const qty = Math.max(1, Math.floor(
        (budgetRef.current * riskRef.current.maxPerTrade) / signal.stock.price
      ))
      let success = false
      if (signal.type === 'BUY')  success = buy(signal.stock, qty, 'ai', model.name)
      if (signal.type === 'SELL') success = sell(signal.stock, qty, 'ai', model.name)

      if (!success) return

      signal.executed = true
      signal.qty = qty

      const isWin = Math.random() < model.winRate / 100
      const pnl = isWin
        ? signal.stock.price * qty * (Math.random() * 0.03 + 0.005)
        : -signal.stock.price * qty * (Math.random() * 0.02 + 0.005)

      setAiStats(prev => ({
        totalTrades: prev.totalTrades + 1,
        wins: prev.wins + (isWin ? 1 : 0),
        totalPnl: parseFloat((prev.totalPnl + pnl).toFixed(2)),
      }))

      const trade = {
        id: signal.id,
        model: model.name,
        modelColor: model.color,
        stock: signal.stock.id,
        type: signal.type,
        qty,
        price: signal.stock.price,
        total: parseFloat((qty * signal.stock.price).toFixed(2)),
        reason: signal.reason,
        pnl: parseFloat(pnl.toFixed(2)),
        isWin,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }

      setLastAction(trade)
      setTradeLog(prev => [trade, ...prev].slice(0, 30))
      setExecutions(prev => [
        { id: signal.id, type: signal.type, price: signal.stock.price },
        ...prev,
      ].slice(0, 20))
    }, model.interval * 0.5)
  }

  function stopAI() {
    setRunning(false)
    setThinking(false)
    clearInterval(intervalRef.current)
    clearTimeout(thinkRef.current)
  }

  function handleModelChange(model) {
    if (running) stopAI()
    setSelectedModel(model)
    setExecutions([])
  }

  function handleStockChange(stock) {
    setSelectedStock(stock)
    setExecutions([])
  }

  useEffect(() => () => {
    clearInterval(intervalRef.current)
    clearTimeout(thinkRef.current)
  }, [])

  const chartData = generateChartData(selectedStock.price)

  // 최근 실행을 차트 데이터 끝 쪽에 마킹
  const markedChartData = chartData.map((d, i) => {
    const exec = executions[chartData.length - 1 - i]
    if (!exec) return d
    return {
      ...d,
      buyAt:  exec.type === 'BUY'  ? exec.price : null,
      sellAt: exec.type === 'SELL' ? exec.price : null,
    }
  })

  return (
    <div className={styles.page}>
      <StrategyPanel
        models={AI_MODELS}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        strategies={STRATEGIES}
        selectedStrategy={selectedStrategy}
        onStrategyChange={setSelectedStrategy}
        customPrompt={customPrompt}
        onCustomPromptChange={setCustomPrompt}
        riskLevel={riskLevel}
        onRiskChange={setRiskLevel}
        budget={budget}
        onBudgetChange={setBudget}
        balance={balance}
        autoMode={autoMode}
        onAutoToggle={setAutoMode}
        running={running}
        onStart={startAI}
        onStop={stopAI}
      />
      <div className={styles.center}>
        <AIChartPanel
          stocks={stocks}
          selectedStock={selectedStock}
          onStockChange={handleStockChange}
          chartData={markedChartData}
          thinking={thinking}
          lastAction={lastAction}
          tradeLog={tradeLog}
          running={running}
          autoMode={autoMode}
          model={selectedModel}
        />
      </div>
      <AIPerformance
        stats={aiStats}
        model={selectedModel}
        tradeLog={tradeLog}
        portfolio={portfolio}
        stocks={stocks}
      />
    </div>
  )
}

export default AITrading
