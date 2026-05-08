/* ─── 백테스트 엔진 ───────────────────────────────────────────
 * data    : { date, open, high, low, close, volume }[] 주가 배열
 * signals : ('BUY' | 'SELL' | null)[]  — indicators.js 에서 생성
 * config  : { capital, commission, slippage, stopLoss, takeProfit, maxHoldDays }
 * ─────────────────────────────────────────────────────────── */

export function runBacktest(data, signals, config) {
  const {
    capital     = 10000,
    commission  = 0.1,   // % per trade
    slippage    = 0,     // % per trade
    stopLoss    = 5,     // % loss trigger
    takeProfit  = 10,    // % profit trigger
    maxHoldDays = 10,
    maxPos      = 100,   // % of equity per trade
  } = config

  let cash     = capital
  let position = null   // { entryPrice, entryIdx, shares, cost }
  const curve  = [{ t: 0, equity: capital, date: data[0]?.time ?? '' }]
  const trades = []

  const enter = (i, price) => {
    const slippedPrice = price * (1 + slippage / 100)
    const invest       = cash * (maxPos / 100)
    const cost         = invest
    const shares       = (invest * (1 - commission / 100)) / slippedPrice
    cash -= invest
    position = { entryPrice: slippedPrice, entryIdx: i, shares, cost }
  }

  const exit = (i, price, reason) => {
    const slippedPrice = price * (1 - slippage / 100)
    const proceeds     = position.shares * slippedPrice * (1 - commission / 100)
    const pnl          = proceeds - position.cost
    cash += proceeds
    trades.push({
      entryIdx:   position.entryIdx,
      exitIdx:    i,
      entryPrice: position.entryPrice,
      exitPrice:  slippedPrice,
      pnl:        parseFloat(pnl.toFixed(2)),
      win:        pnl > 0,
      reason,
    })
    position = null
  }

  for (let i = 0; i < data.length; i++) {
    const bar = data[i]

    if (position) {
      const pnlPct   = (bar.close - position.entryPrice) / position.entryPrice * 100
      const holdDays = i - position.entryIdx

      if      (pnlPct <= -stopLoss)         exit(i, bar.close, 'stopLoss')
      else if (pnlPct >= takeProfit)        exit(i, bar.close, 'takeProfit')
      else if (holdDays >= maxHoldDays)     exit(i, bar.close, 'maxHold')
      else if (signals[i] === 'SELL')       exit(i, bar.close, 'signal')
    }

    if (!position && signals[i] === 'BUY' && cash > 0) {
      enter(i, bar.close)
    }

    const marketValue = position ? position.shares * bar.close : 0
    curve.push({ t: i + 1, equity: Math.round(cash + marketValue), date: bar.time })
  }

  // 기간 끝에 포지션 남아있으면 강제 청산
  if (position) {
    exit(data.length - 1, data[data.length - 1].close, 'endOfData')
    curve[curve.length - 1].equity = Math.round(cash)
  }

  return calcMetrics(capital, cash, trades, curve)
}

function calcMetrics(capital, finalCash, trades, curve) {
  const finalEq     = curve[curve.length - 1].equity
  const totalReturn = parseFloat(((finalEq - capital) / capital * 100).toFixed(2))
  const tradeCount  = trades.length
  const winRate     = tradeCount > 0
    ? parseFloat((trades.filter(t => t.win).length / tradeCount * 100).toFixed(1))
    : 0

  // MDD
  let peak = capital, maxDD = 0
  for (const p of curve) {
    if (p.equity > peak) peak = p.equity
    const dd = peak > 0 ? (peak - p.equity) / peak * 100 : 0
    if (dd > maxDD) maxDD = dd
  }

  // Sharpe (연율화)
  const returns = []
  for (let i = 1; i < curve.length; i++) {
    if (curve[i - 1].equity > 0)
      returns.push((curve[i].equity - curve[i - 1].equity) / curve[i - 1].equity)
  }
  const mean   = returns.reduce((s, r) => s + r, 0) / (returns.length || 1)
  const stdDev = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length || 1))
  const sharpe = stdDev > 0 ? parseFloat(((mean / stdDev) * Math.sqrt(252)).toFixed(2)) : 0

  return {
    trades:      tradeCount,
    winRate,
    totalReturn,
    maxDD:       parseFloat(maxDD.toFixed(2)),
    sharpe,
    curve,
    finalEq,
    tradeLog:    trades,
  }
}
