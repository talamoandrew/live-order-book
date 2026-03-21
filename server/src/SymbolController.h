#pragma once
#include <mutex>
#include <string>

struct SymbolController {
    std::mutex mux;
    std::string pending = "";
    std::string current = "btcusdt";
};