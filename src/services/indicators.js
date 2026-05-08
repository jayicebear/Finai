/* ─── 지표별 신호 계산 ────────────────────────────────────────
 * 각 함수는 data 배열과 같은 길이의 signals 배열을 반환해요.
 * signals[i] = 'BUY' | 'SELL' | null
 * ─────────────────────────────────────────────────────────── */

function sma(data, period, key = 'close') {
  return data.map((_, i) => {
    if (i < period - 1) return null
    const slice = data.slice(i - period + 1, i + 1)
    return slice.reduce((s, d) => s + d[key], 0) / period
  })
}

/* ── 볼린저밴드 ───────────────────────────────────────────── */
export function bollingerSignals(data, params) {
  const { period = 20, std: mult = 2 } = params
  const signals = new Array(data.length).fill(null)

  for (let i = period; i < data.length; i++) {
    const slice = data.slice(i - period, i)
    const mean  = slice.reduce((s, d) => s + d.close, 0) / period
    const stdDev = Math.sqrt(slice.reduce((s, d) => s + (d.close - mean) ** 2, 0) / period)
    const upper = mean + mult * stdDev
    const lower = mean - mult * stdDev

    const prevSlice = data.slice(i - period - 1, i - 1)
    const prevMean  = prevSlice.reduce((s, d) => s + d.close, 0) / period
    const prevStd   = Math.sqrt(prevSlice.reduce((s, d) => s + (d.close - prevMean) ** 2, 0) / period)
    const prevUpper = prevMean + mult * prevStd
    const prevLower = prevMean - mult * prevStd

    const curr = data[i].close
    const prev = data[i - 1].close

    if (prev > prevLower && curr <= lower) signals[i] = 'BUY'
    else if (prev < prevUpper && curr >= upper) signals[i] = 'SELL'
  }

  return signals
}

/* ── MA Crossover (추후 구현) ─────────────────────────────── */
export function maSignals(data, params) {
  const { fast = 5, slow = 20 } = params
  const signals = new Array(data.length).fill(null)
  const fastMA  = sma(data, fast)
  const slowMA  = sma(data, slow)

  for (let i = 1; i < data.length; i++) {
    if (!fastMA[i] || !slowMA[i] || !fastMA[i-1] || !slowMA[i-1]) continue
    if (fastMA[i-1] <= slowMA[i-1] && fastMA[i] > slowMA[i]) signals[i] = 'BUY'
    else if (fastMA[i-1] >= slowMA[i-1] && fastMA[i] < slowMA[i]) signals[i] = 'SELL'
  }

  return signals
}

/* ── RSI (추후 구현) ──────────────────────────────────────── */
export function rsiSignals(data, params) {
  const { period = 14, oversold = 30, overbought = 70 } = params
  const signals = new Array(data.length).fill(null)

  for (let i = period; i < data.length; i++) {
    let gains = 0, losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j].close - data[j - 1].close
      if (diff > 0) gains += diff
      else losses += Math.abs(diff)
    }
    const rs  = losses === 0 ? 100 : gains / losses
    const rsi = 100 - 100 / (1 + rs)

    let prevRsi = 0
    if (i > period) {
      let pg = 0, pl = 0
      for (let j = i - period; j < i; j++) {
        const diff = data[j].close - data[j - 1].close
        if (diff > 0) pg += diff
        else pl += Math.abs(diff)
      }
      prevRsi = 100 - 100 / (1 + (pl === 0 ? 100 : pg / pl))
    }

    if (prevRsi <= oversold && rsi > oversold)     signals[i] = 'BUY'
    else if (prevRsi >= overbought && rsi < overbought) signals[i] = 'SELL'
  }

  return signals
}

/* ── MACD ─────────────────────────────────────────────────── */
function ema(data, period, key = 'close') {
  const k = 2 / (period + 1)
  const result = new Array(data.length).fill(null)
  let prev = null
  for (let i = 0; i < data.length; i++) {
    const val = data[i][key]
    if (prev === null) { prev = val; result[i] = val; continue }
    prev = val * k + prev * (1 - k)
    result[i] = prev
  }
  return result
}

export function macdSignals(data, params) {
  const { fast = 12, slow = 26, signal: sigPeriod = 9 } = params
  const signals  = new Array(data.length).fill(null)
  const fastEMA  = ema(data, fast)
  const slowEMA  = ema(data, slow)

  const macdLine = data.map((_, i) =>
    fastEMA[i] !== null && slowEMA[i] !== null ? fastEMA[i] - slowEMA[i] : null
  )

  // signal line = EMA of macdLine
  const k = 2 / (sigPeriod + 1)
  let prevSig = null
  const sigLine = macdLine.map(v => {
    if (v === null) return null
    if (prevSig === null) { prevSig = v; return v }
    prevSig = v * k + prevSig * (1 - k)
    return prevSig
  })

  for (let i = 1; i < data.length; i++) {
    if (!macdLine[i] || !sigLine[i] || !macdLine[i-1] || !sigLine[i-1]) continue
    if (macdLine[i-1] <= sigLine[i-1] && macdLine[i] > sigLine[i]) signals[i] = 'BUY'
    else if (macdLine[i-1] >= sigLine[i-1] && macdLine[i] < sigLine[i]) signals[i] = 'SELL'
  }
  return signals
}

/* ── Momentum ─────────────────────────────────────────────── */
export function momentumSignals(data, params) {
  const { period = 10, threshold = 5 } = params
  const signals = new Array(data.length).fill(null)

  for (let i = period + 1; i < data.length; i++) {
    const mom     = data[i].close - data[i - period].close
    const prevMom = data[i-1].close - data[i - period - 1].close

    if (prevMom <= threshold  && mom > threshold)  signals[i] = 'BUY'
    else if (prevMom >= -threshold && mom < -threshold) signals[i] = 'SELL'
  }
  return signals
}

/* ── Stochastic ───────────────────────────────────────────── */
export function stochasticSignals(data, params) {
  const { kPeriod = 14, dPeriod = 3, smooth = 3 } = params
  const signals = new Array(data.length).fill(null)

  const kRaw = data.map((_, i) => {
    if (i < kPeriod - 1) return null
    const slice   = data.slice(i - kPeriod + 1, i + 1)
    const highest = Math.max(...slice.map(d => d.high))
    const lowest  = Math.min(...slice.map(d => d.low))
    return highest === lowest ? 50 : (data[i].close - lowest) / (highest - lowest) * 100
  })

  // %K smoothed
  const kSmoothed = kRaw.map((_, i) => {
    if (i < kPeriod - 1 + smooth - 1) return null
    const slice = kRaw.slice(i - smooth + 1, i + 1)
    if (slice.some(v => v === null)) return null
    return slice.reduce((s, v) => s + v, 0) / smooth
  })

  // %D = SMA of %K
  const dLine = kSmoothed.map((_, i) => {
    if (i < kPeriod - 1 + smooth - 1 + dPeriod - 1) return null
    const slice = kSmoothed.slice(i - dPeriod + 1, i + 1)
    if (slice.some(v => v === null)) return null
    return slice.reduce((s, v) => s + v, 0) / dPeriod
  })

  for (let i = 1; i < data.length; i++) {
    const k = kSmoothed[i], d = dLine[i]
    const pk = kSmoothed[i-1], pd = dLine[i-1]
    if (!k || !d || !pk || !pd) continue
    if (pk <= pd && k > d && k < 20) signals[i] = 'BUY'
    else if (pk >= pd && k < d && k > 80) signals[i] = 'SELL'
  }
  return signals
}

/* ── VWAP ─────────────────────────────────────────────────── */
export function vwapSignals(data, params) {
  const { deviation = 1 } = params
  const signals = new Array(data.length).fill(null)

  // 누적 VWAP (전체 기간)
  let cumTPV = 0, cumVol = 0
  const vwap = data.map(d => {
    const tp = (d.high + d.low + d.close) / 3
    cumTPV += tp * d.volume
    cumVol += d.volume
    return cumVol > 0 ? cumTPV / cumVol : tp
  })

  // VWAP 기반 밴드 (표준편차)
  for (let i = 20; i < data.length; i++) {
    const slice  = data.slice(i - 20, i)
    const vSlice = vwap.slice(i - 20, i)
    const mean   = vSlice.reduce((s, v) => s + v, 0) / 20
    const std    = Math.sqrt(slice.reduce((s, d, j) => s + (((d.high+d.low+d.close)/3) - mean) ** 2, 0) / 20)
    const upper  = vwap[i] + deviation * std
    const lower  = vwap[i] - deviation * std

    const curr = data[i].close
    const prev = data[i-1].close

    if (prev < vwap[i-1] && curr >= vwap[i]) signals[i] = 'BUY'
    else if (prev > vwap[i-1] && curr <= vwap[i]) signals[i] = 'SELL'
  }
  return signals
}

/* ── Ichimoku ─────────────────────────────────────────────── */
export function ichimokuSignals(data, params) {
  const { tenkan = 9, kijun = 26, senkou = 52 } = params
  const signals = new Array(data.length).fill(null)

  const midpoint = (data, i, period) => {
    if (i < period - 1) return null
    const slice = data.slice(i - period + 1, i + 1)
    return (Math.max(...slice.map(d => d.high)) + Math.min(...slice.map(d => d.low))) / 2
  }

  for (let i = 1; i < data.length; i++) {
    const tenkanNow  = midpoint(data, i, tenkan)
    const kijunNow   = midpoint(data, i, kijun)
    const tenkanPrev = midpoint(data, i-1, tenkan)
    const kijunPrev  = midpoint(data, i-1, kijun)
    if (!tenkanNow || !kijunNow || !tenkanPrev || !kijunPrev) continue

    if (tenkanPrev <= kijunPrev && tenkanNow > kijunNow) signals[i] = 'BUY'
    else if (tenkanPrev >= kijunPrev && tenkanNow < kijunNow) signals[i] = 'SELL'
  }
  return signals
}

/* ── 신호 결합 ────────────────────────────────────────────── */
export function combineSignals(signalsArray, mode = 'AND') {
  if (!signalsArray.length) return []
  const len = signalsArray[0].length
  return Array.from({ length: len }, (_, i) => {
    const sigs = signalsArray.map(s => s[i])
    if (mode === 'AND') {
      if (sigs.every(s => s === 'BUY'))  return 'BUY'
      if (sigs.every(s => s === 'SELL')) return 'SELL'
    } else {
      if (sigs.some(s => s === 'BUY'))  return 'BUY'
      if (sigs.some(s => s === 'SELL')) return 'SELL'
    }
    return null
  })
}

/* ── 지표 ID → 신호 함수 맵 ──────────────────────────────── */
export const SIGNAL_FNS = {
  bollinger:  bollingerSignals,
  ma:         maSignals,
  rsi:        rsiSignals,
  macd:       macdSignals,
  momentum:   momentumSignals,
  stochastic: stochasticSignals,
  vwap:       vwapSignals,
  ichimoku:   ichimokuSignals,
}
