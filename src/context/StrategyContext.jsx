import { createContext, useContext, useRef, useState } from 'react'

const DEFAULT_PRIORITIES = [
  { id: 'stoploss',   label: '손절',        sub: 'Stop Loss',       color: '#dc2626', bg: '#fef2f2' },
  { id: 'takeprofit', label: '익절',        sub: 'Take Profit',     color: '#16a34a', bg: '#f0fdf4' },
  { id: 'signal',     label: '지표 신호 역전', sub: 'Signal Reversal', color: '#2563eb', bg: '#eff6ff' },
  { id: 'time',       label: '시간 제한 만료', sub: 'Time Expiry',   color: '#d97706', bg: '#fffbeb' },
]

const StrategyContext = createContext(null)

export function StrategyProvider({ children }) {
  const [capital,    setCapital]    = useState(10000)
  const [commission, setCommission] = useState(0.1)
  const [slippage,   setSlippage]   = useState(0)
  const [startDate,  setStartDate]  = useState('2023-01-01')
  const [endDate,    setEndDate]    = useState('2024-12-31')
  const [timeframe,  setTimeframe]  = useState('1D')
  const [stock,      setStock]      = useState('AAPL')

  const [activeIndicators, setActiveIndicators] = useState(new Set(['ma']))
  const [focusedIndicator, setFocusedIndicator] = useState('ma')
  const [combineMode,      setCombineMode]      = useState('AND')
  const [indParams,        setIndParams]        = useState({
    ma:         { fast: 5,  slow: 20, offset: 0 },
    rsi:        { period: 14, oversold: 30, overbought: 70 },
    macd:       { fast: 12, slow: 26, signal: 9 },
    bollinger:  { period: 20, std: 2, offset: 0 },
    momentum:   { period: 10, threshold: 5, offset: 0 },
    stochastic: { kPeriod: 14, dPeriod: 3, smooth: 3 },
    vwap:       { deviation: 1, bands: 2, offset: 0 },
    ichimoku:   { tenkan: 9, kijun: 26, senkou: 52 },
  })

  const [maxPos,        setMaxPos]        = useState(20)
  const [volumeFilter,  setVolumeFilter]  = useState('없음')
  const [trendFilter,   setTrendFilter]   = useState('없음')
  const [candlePattern, setCandlePattern] = useState('없음')
  const [useEntryTime,  setUseEntryTime]  = useState(false)
  const [entryTimeFrom, setEntryTimeFrom] = useState('09:00')
  const [entryTimeTo,   setEntryTimeTo]   = useState('11:00')

  const [stopLoss,     setStopLoss]     = useState(5)
  const [takeProfit,   setTakeProfit]   = useState(10)
  const [trailingStop, setTrailingStop] = useState(false)
  const [maxHoldDays,  setMaxHoldDays]  = useState(10)
  const [useExitTime,  setUseExitTime]  = useState(false)
  const [priorities,   setPriorities]   = useState(DEFAULT_PRIORITIES)
  const dragIndex = useRef(null)

  const [entryEnabled, setEntryEnabled] = useState(true)
  const [exitEnabled,  setExitEnabled]  = useState(true)
  const [results,      setResults]      = useState(null)
  const [running,      setRunning]      = useState(false)
  const [priceData,    setPriceData]    = useState(null)
  const [btError,      setBtError]      = useState(null)

  const [saveModal,       setSaveModal]       = useState(false)
  const [stratName,       setStratName]       = useState('')
  const [loadModal,       setLoadModal]       = useState(false)
  const [savedList,       setSavedList]       = useState(() => JSON.parse(localStorage.getItem('my_strategies') || '[]'))
  const [compareModal,    setCompareModal]    = useState(false)
  const [compareSelected, setCompareSelected] = useState(new Set())
  const [compareResults,  setCompareResults]  = useState([])

  const [optimizeModal,   setOptimizeModal]   = useState(false)
  const [optimizeResults, setOptimizeResults] = useState([])
  const [optimizing,      setOptimizing]      = useState(false)

  const [scanModal,   setScanModal]   = useState(false)
  const [scanResults, setScanResults] = useState([])
  const [scanning,    setScanning]    = useState(false)

  return (
    <StrategyContext.Provider value={{
      capital, setCapital, commission, setCommission, slippage, setSlippage,
      startDate, setStartDate, endDate, setEndDate, timeframe, setTimeframe, stock, setStock,
      activeIndicators, setActiveIndicators, focusedIndicator, setFocusedIndicator,
      combineMode, setCombineMode, indParams, setIndParams,
      maxPos, setMaxPos, volumeFilter, setVolumeFilter, trendFilter, setTrendFilter,
      candlePattern, setCandlePattern, useEntryTime, setUseEntryTime,
      entryTimeFrom, setEntryTimeFrom, entryTimeTo, setEntryTimeTo,
      stopLoss, setStopLoss, takeProfit, setTakeProfit, trailingStop, setTrailingStop,
      maxHoldDays, setMaxHoldDays, useExitTime, setUseExitTime, priorities, setPriorities,
      dragIndex,
      entryEnabled, setEntryEnabled, exitEnabled, setExitEnabled,
      results, setResults, running, setRunning, priceData, setPriceData, btError, setBtError,
      saveModal, setSaveModal, stratName, setStratName, loadModal, setLoadModal,
      savedList, setSavedList, compareModal, setCompareModal,
      compareSelected, setCompareSelected, compareResults, setCompareResults,
      optimizeModal, setOptimizeModal, optimizeResults, setOptimizeResults, optimizing, setOptimizing,
      scanModal, setScanModal, scanResults, setScanResults, scanning, setScanning,
    }}>
      {children}
    </StrategyContext.Provider>
  )
}

export function useStrategy() {
  return useContext(StrategyContext)
}
