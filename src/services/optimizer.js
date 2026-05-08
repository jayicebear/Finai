import { SIGNAL_FNS, combineSignals } from './indicators'
import { runBacktest } from './backtest'

function cartesian(...arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap(combo => arr.map(val => [...combo, val])),
    [[]]
  )
}

const GRIDS = {
  ma:         () => cartesian([5,8,12,20],[15,25,40,60]).filter(([f,s])=>f<s).map(([fast,slow])=>({fast,slow,offset:0})),
  rsi:        () => cartesian([10,14,18],[25,30,35],[65,70,75]).map(([period,oversold,overbought])=>({period,oversold,overbought})),
  macd:       () => cartesian([10,12,16],[22,26,32],[9,12]).filter(([f,s])=>f<s).map(([fast,slow,signal])=>({fast,slow,signal})),
  bollinger:  () => cartesian([15,20,25],[1.5,2,2.5]).map(([period,std])=>({period,std,offset:0})),
  momentum:   () => cartesian([8,10,15],[4,6,8]).map(([period,threshold])=>({period,threshold,offset:0})),
  stochastic: () => cartesian([12,14,18],[2,3],[3]).map(([kPeriod,dPeriod,smooth])=>({kPeriod,dPeriod,smooth})),
  vwap:       () => [0.5,1,1.5,2].map(deviation=>({deviation,bands:2,offset:0})),
  ichimoku:   () => cartesian([7,9,13],[20,26,40],[40,52]).map(([tenkan,kijun,senkou])=>({tenkan,kijun,senkou})),
}

// 2-조합 스캔용 축소 그리드
const SCAN_GRIDS = {
  ma:         () => cartesian([5,8,12,20],[15,25,40,60]).filter(([f,s])=>f<s).map(([fast,slow])=>({fast,slow,offset:0})),
  rsi:        () => cartesian([10,14,18],[25,30,35],[65,70,75]).map(([period,oversold,overbought])=>({period,oversold,overbought})),
  macd:       () => cartesian([10,12],[22,26],[9]).filter(([f,s])=>f<s).map(([fast,slow,signal])=>({fast,slow,signal})),
  bollinger:  () => cartesian([15,20,25],[1.5,2,2.5]).map(([period,std])=>({period,std,offset:0})),
  momentum:   () => cartesian([8,10,15],[4,6,8]).map(([period,threshold])=>({period,threshold,offset:0})),
  stochastic: () => cartesian([12,14,18],[2,3],[3]).map(([kPeriod,dPeriod,smooth])=>({kPeriod,dPeriod,smooth})),
  vwap:       () => [0.5,1,1.5,2].map(deviation=>({deviation,bands:2,offset:0})),
  ichimoku:   () => cartesian([7,9,13],[20,26,40],[40,52]).map(([tenkan,kijun,senkou])=>({tenkan,kijun,senkou})),
}

export const ALL_INDICATOR_IDS = ['ma', 'rsi', 'macd', 'bollinger', 'momentum', 'stochastic', 'vwap', 'ichimoku']

const STOP_LOSS_VALUES   = [2, 3, 5, 7, 10]
const TAKE_PROFIT_VALUES = [4, 6, 10, 15, 20]

// 각 지표의 파라미터 그리드에 대한 신호를 미리 한 번만 계산
function precomputeSignals(data, id, grid) {
  const result = []
  for (const params of grid) {
    try {
      result.push({ params, signals: SIGNAL_FNS[id](data, params) })
    } catch { /* skip */ }
  }
  return result
}

// 신호 배열이 고정된 상태에서 최적 SL/TP 탐색 (신호 재계산 없음)
function bestSlTp(data, signals, btConfig) {
  let best = null
  for (const stopLoss of STOP_LOSS_VALUES) {
    for (const takeProfit of TAKE_PROFIT_VALUES) {
      if (takeProfit <= stopLoss) continue
      try {
        const result = runBacktest(data, signals, { ...btConfig, stopLoss, takeProfit })
        if (result.trades === 0) continue
        if (!best || result.totalReturn > best.totalReturn) {
          best = { stopLoss, takeProfit, ...result }
        }
      } catch { /* skip */ }
    }
  }
  return best
}

export function scanAllIndicators(data, btConfig) {
  const results = []

  // 단일 지표 스캔 — 신호 미리 계산
  for (const id of ALL_INDICATOR_IDS) {
    const precomp = precomputeSignals(data, id, GRIDS[id]?.() ?? [])
    let best = null

    for (const { params, signals } of precomp) {
      const r = bestSlTp(data, signals, btConfig)
      if (r && (!best || r.totalReturn > best.totalReturn)) {
        best = { ids: [id], params: { [id]: params }, ...r }
      }
    }

    if (best) results.push(best)
  }

  // 2-지표 조합 스캔 — 양쪽 신호 미리 계산
  for (let i = 0; i < ALL_INDICATOR_IDS.length; i++) {
    for (let j = i + 1; j < ALL_INDICATOR_IDS.length; j++) {
      const idA = ALL_INDICATOR_IDS[i]
      const idB = ALL_INDICATOR_IDS[j]
      const precompA = precomputeSignals(data, idA, SCAN_GRIDS[idA]?.() ?? [])
      const precompB = precomputeSignals(data, idB, SCAN_GRIDS[idB]?.() ?? [])
      let best = null

      for (const pcA of precompA) {
        for (const pcB of precompB) {
          let combined
          try { combined = combineSignals([pcA.signals, pcB.signals], 'AND') }
          catch { continue }

          const r = bestSlTp(data, combined, btConfig)
          if (r && (!best || r.totalReturn > best.totalReturn)) {
            best = { ids: [idA, idB], params: { [idA]: pcA.params, [idB]: pcB.params }, ...r }
          }
        }
      }

      if (best) results.push(best)
    }
  }

  return results.sort((a, b) => b.totalReturn - a.totalReturn)
}

export function optimizeParams(data, activeIndicators, combineMode, btConfig, topN = 5) {
  const ids = [...activeIndicators]

  // 각 지표별 신호 미리 계산
  const precomputed = ids.map(id => precomputeSignals(data, id, GRIDS[id]?.() ?? []))

  // 모든 파라미터 조합 생성 (신호 포함)
  const combos = precomputed.reduce(
    (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])),
    [[]]
  )

  // 파라미터 조합당 최고 SL/TP만 보관 (중간 배열 불필요)
  const seen = new Map()

  for (const combo of combos) {
    let signals
    try {
      const allSignals = combo.map(c => c.signals)
      signals = allSignals.length === 1 ? allSignals[0] : combineSignals(allSignals, combineMode)
    } catch { continue }

    const paramMap = {}
    ids.forEach((id, i) => { paramMap[id] = combo[i].params })
    const key = JSON.stringify(paramMap)

    const r = bestSlTp(data, signals, btConfig)
    if (!r) continue

    const prev = seen.get(key)
    if (!prev || r.totalReturn > prev.totalReturn) {
      seen.set(key, { params: paramMap, ...r })
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.totalReturn - a.totalReturn)
    .slice(0, topN)
}
