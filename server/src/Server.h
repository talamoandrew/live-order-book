#pragma once
#include <uwebsockets/App.h>
#include <variant>
#include <set>
#include <queue>
#include <mutex>
#include <string>
#include "OrderBook.h"
#include "SymbolController.h"

using WsClient = uWS::WebSocket<false, true, std::monostate>*;

class Server
{
public:
    Server(const OrderBook& book, SymbolController& symbolController);
    void start(int port);
    void pushUpdate(const std::string& message);

private:
    const OrderBook& book;
    SymbolController& symbolController;
    std::set<WsClient> clients;
    std::mutex clientMux;
    std::mutex qMux;
    std::queue<std::string> q;
    uWS::Loop* loop = nullptr;
};