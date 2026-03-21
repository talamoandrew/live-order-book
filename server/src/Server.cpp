#include "Server.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <thread>
#include <vector>
#include <chrono>

Server::Server(const OrderBook& book, SymbolController& symbolController) 
    : book(book), symbolController(symbolController) {}

void Server::pushUpdate(const std::string& message)
{
    std::lock_guard<std::mutex> lock(qMux);
    q.push(message);
}

void Server::start(int port)
{
    std::thread drainer([this]() {
        std::vector<std::string> messages;
        while (true)
        {
            {
                std::lock_guard<std::mutex> lock(qMux);
                while (!q.empty())
                {
                    messages.push_back(q.front());
                    q.pop();
                }
            }
            if (!messages.empty() && loop)
            {
                loop->defer([this, messages]()
                {
                    std::lock_guard<std::mutex> lock(clientMux);
                    for (auto* client : clients)
                        for (const auto& msg : messages)
                            client->send(msg, uWS::OpCode::TEXT);
                });
            }
            messages.clear();
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }
    });
    drainer.detach();

    uWS::App()
    .ws<std::monostate>("/*", {
        .compression = uWS::DISABLED,
        .maxPayloadLength = 16 * 1024 * 1024,
        .idleTimeout = 960,
        .maxBackpressure = 1 * 1024 * 1024,
        .open = [this](WsClient ws)
        {
            if (!loop) loop = uWS::Loop::get();
            std::cout << "Client connected!" << std::endl;
            {
                std::lock_guard<std::mutex> lock(clientMux);
                clients.insert(ws);
            }
            nlohmann::json snapshot;
            snapshot["type"] = "snapshot";
            snapshot["bids"] = nlohmann::json::array();
            snapshot["asks"] = nlohmann::json::array();
            for (const auto& [price, size] : book.getBids())
                snapshot["bids"].push_back({price, size});
            for (const auto& [price, size] : book.getAsks())
                snapshot["asks"].push_back({price, size});
            ws->send(snapshot.dump(), uWS::OpCode::TEXT);
        },
        .message = [this](WsClient ws, std::string_view msg, uWS::OpCode opCode) 
        {
            try
            {
                nlohmann::json j = nlohmann::json::parse(msg);
                if (j.contains("action") && j["action"] == "subscribe")
                {
                    std::string symbol = j["symbol"].get<std::string>();
                    std::lock_guard<std::mutex> lock(symbolController.mux);
                    symbolController.pending = symbol;
                }
            }
            catch (const std::exception& e)
            {
                std::cout << "Msg parse error:" << e.what() << std::endl;
            }

        },
        .close = [this](WsClient ws, int code, std::string_view msg)
        {
            std::lock_guard<std::mutex> lock(clientMux);
            clients.erase(ws);
        }
    })
    .listen(port, [port](auto* listenSocket)
    {
        if (listenSocket)
            std::cout << "Server listening on port " << port << std::endl;
    })
    .run();
}