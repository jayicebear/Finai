import { useRef, useEffect } from 'react'
import { createChart, CrosshairMode, CandlestickSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts'

const CHART_OPTS = {
  layout: { background: { color: '#ffffff' }, textColor: '#aaaaaa', attributionLogo: false },
  grid: { vertLines: { color: '#f5f2ed' }, horzLines: { color: '#f5f2ed' } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: '#ece8e2' },
  timeScale: { borderColor: '#ece8e2', timeVisible: false },
  handleScroll: true,
  handleScale: true,
}

export default function BacktestChart({ data, tradeLog }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !data?.length) return

    const chart = createChart(containerRef.current, {
      ...CHART_OPTS,
      width: containerRef.current.clientWidth,
      height: 300,
    })

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#dc2626', downColor: '#3b82f6',
      borderUpColor: '#dc2626', borderDownColor: '#3b82f6',
      wickUpColor: '#dc2626', wickDownColor: '#3b82f6',
    })
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } })

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    candle.setData(data.map(d => ({
      time: d.time, open: d.open, high: d.high, low: d.low, close: d.close,
    })))

    volSeries.setData(data.map(d => ({
      time:  d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(220,38,38,0.4)' : 'rgba(59,130,246,0.4)',
    })))

    // 매수/매도 마커
    if (tradeLog?.length) {
      const markers = []
      for (const trade of tradeLog) {
        const entryBar = data[trade.entryIdx]
        const exitBar  = data[trade.exitIdx]
        if (entryBar) markers.push({
          time:     entryBar.time,
          position: 'belowBar',
          color:    '#16a34a',
          shape:    'arrowUp',
          text:     'BUY',
        })
        if (exitBar) markers.push({
          time:     exitBar.time,
          position: 'aboveBar',
          color:    trade.win ? '#dc2626' : '#3b82f6',
          shape:    'arrowDown',
          text:     'SELL',
        })
      }
      markers.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
      createSeriesMarkers(candle, markers)
    }

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [data, tradeLog])

  return <div ref={containerRef} />
}
