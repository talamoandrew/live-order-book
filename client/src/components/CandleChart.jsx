import { useState, useEffect, useRef } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'

function CandleChart({ symbol }) {
    const chartContainer = useRef(null)
    const [interval, setInterval] = useState('1m')
    const [limit, setLimit] = useState(60)
    const limitMap = {
        '1m': 60,
        '5m': 72,
        '15m': 96,
        '1h': 48,
    }

    useEffect(() => {

        if (!chartContainer.current) return

        const chart = createChart(chartContainer.current, {
            width: chartContainer.current.clientWidth || 800,
            height: 400,
            layout: {
                background: { color: '#030712' },
                textColor: '#6b7280',
            },
            grid: {
                vertLines: { color: '#1f2937' },
                horzLines: { color: '#1f2937' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            }
        })

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#4ade80',
            downColor: '#f87171',
            borderVisible: false,
            wickUpColor: '#4ade80',
            wickDownColor: '#f87171',
        })

        console.log('Fetching:', `https://api.binance.us/api/v3/klines?symbol=${symbol}...`)
        fetch(`https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`)
            .then(r => r.json())
            .then(data => {
                const transformed = data.map(candle => ({
                    time: candle[0] / 1000,
                    open: parseFloat(candle[1]),
                    high: parseFloat(candle[2]),
                    low: parseFloat(candle[3]),
                    close: parseFloat(candle[4])
                }))
                candleSeries.setData(transformed)
            })

        return () => chart.remove()
    }, [interval, symbol])

    return (
        <div className="flex flex-col">
            <div className="flex gap-2 mb-2">
                {['1m', '5m', '15m', '1h'].map(i => (
                    <button 
                        key={i}
                        onClick={() => setInterval(i)}
                        className={`text-xs px-2 py-1 ${interval === i ? 'text-green-400 border border-green-400' : 'text-gray-400 border border-gray-700'}`}
                    >
                        {i}
                    </button>
                ))}
            </div>
            <div ref={chartContainer} />
        </div>
    )
}

export default CandleChart