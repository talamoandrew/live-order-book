#include <IXWebSocket.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include "OrderBook.h"
#include "Server.h"
#include "SymbolController.h"

long percentile(std::vector<long> samples, double p)
{
    if (samples.empty()) 
        return 0;
    
    std::sort(samples.begin(), samples.end());
    int index = (int)(p * samples.size());
    
    return samples[index];
}

int main()
{
    ix::WebSocket webSocket;
    OrderBook book;
    SymbolController symbolController;
    Server server(book, symbolController);
    bool sendSnapshot = false;

    std::string url("wss://stream.binance.us:9443/ws/btcusdt@depth@100ms");
    webSocket.setUrl(url);

    std::vector<long> latencySamples;
    latencySamples.reserve(1000);

    webSocket.setOnMessageCallback([&webSocket, &book, &server, &latencySamples, &symbolController, &sendSnapshot](const ix::WebSocketMessagePtr& msg)
    {
        if (msg->type == ix::WebSocketMessageType::Message)
        {
            if (msg->str.find("\"e\":\"depthUpdate\"") != std::string::npos)
            {
                try
                {
                    nlohmann::json j = nlohmann::json::parse(msg->str);

                    auto start = std::chrono::high_resolution_clock::now();

                    for (const auto& bid : j["b"])
                        book.updateBid(std::stod(bid[0].get<std::string>()), std::stod(bid[1].get<std::string>()));
                    for (const auto& ask : j["a"])
                        book.updateAsk(std::stod(ask[0].get<std::string>()), std::stod(ask[1].get<std::string>()));

                    auto end = std::chrono::high_resolution_clock::now();
                    auto latency = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();

                    if (latencySamples.size() >= 1000)
                        latencySamples.erase(latencySamples.begin());
                    
                    latencySamples.push_back(latency);

                    nlohmann::json msg;
                    msg["type"] = sendSnapshot ? "snapshot" : "delta";
                    msg["bids"] = nlohmann::json::array();
                    msg["asks"] = nlohmann::json::array();

                    if (sendSnapshot)
                    {
                        sendSnapshot = false;
                        for (const auto& [bid, size] : book.getBids())
                            msg["bids"].push_back({bid, size});
                        
                        for (const auto& [ask, size] : book.getAsks())
                            msg["asks"].push_back({ask, size});
                    }
                    else
                    {
                        for (const auto& bid : j["b"])
                            msg["bids"].push_back({std::stod(bid[0].get<std::string>()), std::stod(bid[1].get<std::string>())});
                        for (const auto& ask : j["a"])
                            msg["asks"].push_back({std::stod(ask[0].get<std::string>()), std::stod(ask[1].get<std::string>())});
                    }
                    msg["p50"] = percentile(latencySamples, 0.50);
                    msg["p95"] = percentile(latencySamples, 0.95);
                    msg["p99"] = percentile(latencySamples, 0.99);

                    server.pushUpdate(msg.dump());
                    // book.print(5);
                }
                catch (const std::exception& e)
                {
                    std::cout << "Error: " << e.what() << std::endl;
                }
            }
        }
        else if (msg->type == ix::WebSocketMessageType::Open)
            std::cout << "Connection established" << std::endl;
        else if (msg->type == ix::WebSocketMessageType::Error)
            std::cout << "Connection error: " << msg->errorInfo.reason << std::endl;
    });

    webSocket.setMaxWaitBetweenReconnectionRetries(5000);
    webSocket.disableAutomaticReconnection();
    webSocket.start();

    std::thread serverThread([&server]() {
        server.start(3000);
    });
 
    serverThread.detach();

    while (true) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        
        {
            std::lock_guard<std::mutex> lock(symbolController.mux);
            if (!symbolController.pending.empty())
            {
                std::string newSymbol = symbolController.pending;
                symbolController.pending = "";
                symbolController.current = newSymbol;
                
                webSocket.stop();
                std::string newUrl = std::string("wss://stream.binance.us:9443/ws/") 
                                + newSymbol 
                                + "@depth@100ms";
                book.clear();
                webSocket.setUrl(newUrl);
                sendSnapshot = true;
                webSocket.start();
                latencySamples.clear();
                std::cout << "Reconnected to: " << newSymbol << std::endl;
            }
        }
    }

    return 0;
}
