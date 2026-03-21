import { useEffect, useState } from 'react'
import { SYMBOL_INFO } from '../constants'

function Header({ bids, asks, volume, p50, p95, p99, symbol, handleSymbolChange, loading }) {
    const bestAsk = loading ? Infinity : Math.min(...Object.keys(asks).map(Number))
    const bestBid = loading ? -Infinity : Math.max(...Object.keys(bids).map(Number))
    const spread = (!loading && isFinite(bestAsk) && isFinite(bestBid)) ? (bestAsk - bestBid).toFixed(2) : '--'
    const price = (!loading && isFinite(bestAsk)) ? bestAsk.toFixed(2) : '--'

    const [time, setTime] = useState(new Date().toLocaleTimeString())

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="flex items-center gap-12 px-6 py-3 border-b border-gray-800 bg-gray-900">
            <div className="flex gap-2 px-6 py-2 border-b border-gray-800">
                {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'].map(s => (
                    <button
                        key={s}
                        onClick={() => handleSymbolChange(s)}
                        className={`text-xs px-3 py-1 border ${symbol === s ? 'text-green-400 border-green-400' : 'text-gray-400 border-gray-700'}`}
                    >
                        {SYMBOL_INFO[s].base}
                    </button>
                ))}
            </div>
            <div className="flex flex-col">
                <span className="text-gray-400 text-xs">PRICE</span>
                <span className="text-white text-sm">${isFinite(price) ? price : '--'}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-gray-400 text-xs">SPREAD</span>
                <span className="text-white text-sm">${isFinite(spread) ? spread : '--'}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-gray-400 text-xs">24H VOLUME</span>
                <span className="text-white text-sm">{volume} {SYMBOL_INFO[symbol]?.base}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-gray-400 text-xs">P50 / P95 / P99</span>
                <span className="text-white text-sm">{p50} / {p95} / {p99} µs</span>
            </div>
            <div className="ml-auto flex flex-col">
                <span className="text-gray-400 text-xs">TIME</span>
                <span className="text-white text-sm">{time}</span>
            </div>
        </div>
    )
}

export default Header