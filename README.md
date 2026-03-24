# Live Order Book Visualizer

A real-time cryptocurrency order book terminal built in C++ and React. The backend connects directly to the Binance US Level 2 depth WebSocket feed, maintains a live bid/ask order book, and streams structured updates to browser clients. The frontend renders a live candlestick chart alongside a real-time bid/ask ladder with latency metrics — styled as a dark trading terminal.

Live at [https://live-order-book.vercel.app/]

> **Note on data source:** This project was originally designed to consume live US stock and ETF order book data. Real-time Level 2 equity data requires paid exchange licensing — no free tier exists for NBBO or individual exchange feeds. Binance US was chosen as the data source because it provides genuine Level 2 order book data (real bids and asks, not simulated) for free with no API key required, and trades 24/7 which eliminates market hours constraints during development.

---

## Features

- **Live order book** — real bid/ask price levels from Binance US, updating at 100ms intervals
- **Candlestick chart** — powered by TradingView's lightweight-charts with 1m / 5m / 15m / 1h interval selector and up to 1000 candles of historical data
- **Symbol switcher** — switch between BTC, ETH, SOL, and BNB with chart and order book updating simultaneously
- **Header metrics** — best ask price, bid-ask spread, 24h volume, and wall clock time
- **Latency panel** — live P50 / P95 / P99 enforcement latency in microseconds, computed in C++ and streamed to the frontend on every update
- **Auto-reconnect** — frontend automatically reconnects to the backend with 3-second backoff if the WebSocket drops

---

## Architecture

```
Binance US WebSocket (Level 2 depth, 100ms)
        ↓
C++ Ingestion Thread (ixwebsocket)
        ↓
OrderBook — std::map bid/ask price levels
        ↓
Thread-Safe Queue (std::mutex + std::queue)
        ↓
uWebSockets Broadcast Server — port 3000
        ↓
React Frontend — WebSocket client
```

The system runs four threads. The ixwebsocket thread receives Binance updates and pushes serialized JSON onto a mutex-protected queue. A drainer thread reads the queue and schedules broadcasts onto the uWebSockets event loop thread via `loop->defer()` — sending WebSocket messages from outside the uWebSockets thread is unsafe, so all sends are deferred back to the correct thread. The main thread polls every 100ms for pending symbol switch requests.

**Why `std::map` over `std::unordered_map`:** The order book needs both fast lookup by price and sorted iteration from best price to worst. A hash map provides O(1) lookup but no ordering — extracting the top N levels would require a sort on every update. `std::map`'s red-black tree keeps keys sorted automatically, making best-N extraction a simple forward traversal at O(log n) insert/update cost.

---

## Snapshot vs Delta Protocol

- **Snapshot** — sent to a new client on connect, containing the full current book state
- **Delta** — sent on every Binance update, containing only changed price levels

Deltas minimise bandwidth — typically 5–20 levels vs hundreds in a full snapshot. On symbol switch, the backend sends a full snapshot to all connected clients on the first update after reconnecting, ensuring no client is left with stale price levels from the previous symbol.

---

## Latency Instrumentation

Processing time is measured on every Binance message from receipt to queue push using `std::chrono::high_resolution_clock`. A rolling buffer of the last 1000 samples is maintained and P50/P95/P99 percentiles are computed in-process and included in every delta message sent to the browser.

**Typical observed latency (local machine):**

| Percentile | Latency |
|-----------|---------|
| P50 | ~15–25µs |
| P95 | ~35–50µs |
| P99 | ~100–200µs |

---

## Tech Stack

**Backend (C++17)**
- ixwebsocket — Binance WebSocket client
- uWebSockets — browser-facing WebSocket server
- nlohmann/json — JSON parsing
- CMake + vcpkg — build system and dependency management
- Docker — multi-stage containerized build

**Frontend (React 18)**
- Vite — build tool
- TailwindCSS — styling
- lightweight-charts — candlestick chart
- Native WebSocket API — no client library

---

## Getting Started

### Prerequisites

- GCC 11+ or Clang 13+
- CMake 3.20+
- Git
- vcpkg (see below)
- Node.js 18+

---

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/live-order-book.git
cd live-order-book
```

---

### 2. Install vcpkg (if not already installed)

```bash
cd ~
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg
./bootstrap-vcpkg.sh
```

---

### 3. Build the backend

```bash
cd server
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=~/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build build
```

Run it:

```bash
./build/live-order-book
```

You should see:
```
Server listening on port 3000
Connection established
```

---

### 4. Run the frontend

```bash
cd client
npm install
```

Create a `.env` file in the `client` directory:

```
VITE_WS_URL=ws://localhost:3000
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:<port>` in your browser.

---

### Running with Docker

```bash
cd server
docker build -t live-order-book .
docker run -p 3000:3000 live-order-book
```

---

## Project Structure

```
live-order-book/
├── server/
│   ├── src/
│   │   ├── main.cpp            # Entry point, Binance feed, symbol switch loop
│   │   ├── OrderBook.h/.cpp    # Bid/ask map maintenance
│   │   ├── Server.h/.cpp       # uWebSockets broadcast server
│   │   └── SymbolController.h  # Thread-safe symbol switch coordination
│   ├── CMakeLists.txt
│   ├── vcpkg.json
│   └── Dockerfile
└── client/
    ├── src/
    │   ├── App.jsx             # State management, WebSocket connection
    │   ├── constants.js        # Symbol info map
    │   └── components/
    │       ├── Header.jsx      # Ticker, price, spread, volume, latency, time
    │       ├── CandleChart.jsx # Candlestick chart with interval selector
    │       └── OrderBook.jsx   # Live bid/ask ladder
    └── package.json
```

---

## Known Limitations

- **Level 2 data only** — total aggregated size per price level. True price-time priority matching requires Level 3 data showing individual orders.
- **Crypto only** — Binance US does not offer US equity data. The same backend architecture would work with a paid equity Level 2 feed.
- **No persistence** — order book state is in-memory. On server restart clients receive a fresh snapshot from the next Binance update.
