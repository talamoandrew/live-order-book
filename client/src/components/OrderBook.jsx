import { useEffect } from 'react'
import { SYMBOL_INFO } from '../constants'

function OrderBook({bids, asks, setBids, setAsks, symbol, loading}) {
    const bestAsk = loading ? Infinity : Math.min(...Object.keys(asks).map(Number))
    const bestBid = loading ? -Infinity : Math.max(...Object.keys(bids).map(Number))
    const spread = (!loading && isFinite(bestAsk) && isFinite(bestBid)) ? (bestAsk - bestBid).toFixed(2) : '--'
    const info = SYMBOL_INFO[symbol] || { base: '???', quote: 'USD' }

    const sortedAsks = loading ? [] : Object.entries(asks)
        .map(([price, size]) => [parseFloat(price), size])
        .sort((a, b) => a[0] - b[0])
        .slice(0, 10)

    const sortedBids = loading ? [] : Object.entries(bids)
        .map(([price, size]) => [parseFloat(price), size])
        .sort((a, b) => b[0] - a[0])
        .slice(0, 10)

    return (
        <div className="text-sm">
            <div className="flex justify-between text-gray-500 text-xs mb-1 px-1">
                <span>PRICE ({info.quote})</span>
                <span>SIZE ({info.base})</span>
            </div>
            <div className="border-t border-red-400 my-1" />
            <div className="flex justify-between text-red-400 text-xs mb-1 px-1">
                <span>ASKS</span>
            </div>
            <div className="border-t border-red-400 my-1" />
            {sortedAsks.map(([price, size]) => (
                <div key={price} className="flex justify-between text-red-400 py-0.5 px-1">
                    <span>${price.toFixed(2)}</span>
                    <span>{size.toFixed(5)}</span>
                </div>
            ))}
            <div className="border-t border-red-400 my-1" />
            <div className="border-t border-grey-400 my-1" />
            <div className="flex justify-between text-grey-400 text-xs mb-1 px-1">
                <span>SPREAD ${spread}</span>
            </div>
            <div className="border-t border-grey-400 my-1" />
            <div className="border-t border-green-400 my-1" />
            <div className="flex justify-between text-green-400 text-xs mb-1 px-1">
                <span>BIDS</span>
            </div>
            <div className="border-t border-green-400 my-1" />
            {sortedBids.map(([price, size]) => (
                <div key={price} className="flex justify-between text-green-400 py-0.5 px-1">
                    <span>${price.toFixed(2)}</span>
                    <span>{size.toFixed(5)}</span>
                </div>
            ))}
            <div className="border-t border-green-400 my-1" />
        </div>
    )
}

export default OrderBook
