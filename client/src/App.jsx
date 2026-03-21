import { useState, useEffect, useRef } from 'react'
import OrderBook from './components/OrderBook'
import CandleChart from './components/CandleChart'
import Header from './components/Header'

function App() {
    const [bids, setBids] = useState({})
    const [asks, setAsks] = useState({})
    const [volume, setVolume] = useState('--')
    const [p50, setP50] = useState('--')
    const [p95, setP95] = useState('--')
    const [p99, setP99] = useState('--')
    const [symbol, setSymbol] = useState('BTCUSDT')
    const [loading, setLoading] = useState(false)
    const wsRef = useRef(null)

    const handleSymbolChange = (newSymbol) => {
        console.log('Symbol change:', newSymbol)
        console.log('WebSocket state:', wsRef.current?.readyState)
        setSymbol(newSymbol)
        setLoading(true)
        setBids({})
        setAsks({})
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                action: 'subscribe',
                symbol: newSymbol.toLowerCase()
            }))
            console.log('Message sent')
        } else {
            console.log('WebSocket not open')
        }
    }

    useEffect(() => {
    fetch(`https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`)
        .then(r => r.json())
        .then(data => {
            setVolume(parseFloat(data.volume).toFixed(2))
        })
    }, [symbol])

    useEffect(() => {
        let ws
        let reconnectTimer
        
        const connect = () => {
            console.log('Attempting WebSocket connection...')
            ws = new WebSocket(import.meta.env.VITE_WS_URL)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('WebSocket connected')
            }

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data)
                
                if (data.type === 'snapshot') 
                {
                    console.log("Snapshot received")
                    // convert snapshot arrays to objects and set state
                    setLoading(false)
                    const newBids = {}
                    data.bids.forEach(([price, size]) => 
                        {
                            newBids[price] = size
                        })
                    setBids(newBids)

                    const newAsks = {}
                    data.asks.forEach(([price, size]) => 
                        {
                            newAsks[price] = size
                        })
                    setAsks(newAsks)
                }

                if (data.type === 'delta') 
                {
                    // merge delta into existing state

                    setBids(prev => {
                        const updated = {...prev}
                        data.bids.forEach(([price, size]) => {
                            if (size < 1e-9)
                                delete updated[price]
                            else
                                updated[price] = size
                        })
                        return updated
                    })

                    setAsks(prev => {
                        const updated = {...prev}
                        data.asks.forEach(([price, size]) => {
                            if (size < 1e-9)
                                delete updated[price]
                            else
                                updated[price] = size
                        })
                        return updated
                    })

                    if (data.p50) setP50(data.p50)
                    if (data.p95) setP95(data.p95)
                    if (data.p99) setP99(data.p99)
                }
            }

            ws.onclose = () => {
                console.log('WebSocket disconnected — reconnecting in 3s')
                reconnectTimer = setTimeout(connect, 3000)
            }
            
            ws.onerror = () => {
                console.log('WebSocket error')
                ws.close
            }
        }
        
        connect()

        return () => {
            clearTimeout(reconnectTimer)
            ws.close()
        }
    }, [])

    return (
        <div className="bg-gray-950 text-white min-h-screen font-mono flex flex-col">
            <Header bids={bids} asks={asks} volume={volume} p50={p50} p95={p95} p99={p99} symbol={symbol} handleSymbolChange={handleSymbolChange} loading={loading}/>
            <div className="flex flex-1">
                <div className="flex-1 p-4">
                    <CandleChart symbol={symbol}/>
                </div>
                <div className="w-80 p-4 border-l border-gray-800">
                    <OrderBook bids={bids} asks={asks} setBids={setBids} setAsks={setAsks} symbol={symbol} loading={loading}/>
                </div>
            </div>
        </div>
    )
}

export default App